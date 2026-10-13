import os
import uuid
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Response
from sqlalchemy.orm import Session, joinedload, selectinload
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.permissions import require_roles
from app.models.user import User, UserRole
from app.models.application import Application, ApplicationDocument, RequestType, ApplicationStatus
from app.models.academic import StudentProfile, Section, Department, HODProfile, TeacherProfile
from app.models.approval import HODApproval, TeacherAcknowledgement
from app.schemas.application import ApplicationResponse, DocumentResponse, HODApprovalResponseSchema, TeacherAcknowledgementResponseSchema
from app.services.storage import StorageService
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService

router = APIRouter()


def build_application_response(app: Application, current_user: User = None) -> ApplicationResponse:
    student = app.student
    student_user = student.user if student else None
    section = student.section if student else None
    department = section.department if section else None

    # Documents with signed URL
    docs = []
    if app.documents:
        for d in app.documents:
            signed_url = None
            try:
                signed_url = StorageService.get_signed_url(d.storage_path)
            except Exception as err:
                print(f"Failed to generate signed URL for document {d.storage_path}: {err}", flush=True)

            docs.append(DocumentResponse(
                id=d.id,
                file_name=d.file_name,
                storage_path=d.storage_path,
                file_type=d.file_type,
                file_size_bytes=d.file_size_bytes,
                signed_url=signed_url,
                created_at=d.created_at
            ))

    # HOD Approval details
    hod_resp = None
    if app.hod_approval:
        hod_user_name = app.hod_approval.hod.user.full_name if (app.hod_approval.hod and app.hod_approval.hod.user) else "HOD"
        hod_resp = HODApprovalResponseSchema(
            id=app.hod_approval.id,
            hod_name=hod_user_name,
            status=app.hod_approval.status,
            remarks=app.hod_approval.remarks,
            action_timestamp=app.hod_approval.action_timestamp
        )

    # Teacher Acknowledgements details
    acks = []
    is_ack = False
    if app.acknowledgements:
        for a in app.acknowledgements:
            teacher_name = a.teacher.user.full_name if (a.teacher and a.teacher.user) else "Teacher"
            acks.append(TeacherAcknowledgementResponseSchema(
                id=a.id,
                teacher_id=a.teacher_id,
                teacher_name=teacher_name,
                acknowledged_at=a.acknowledged_at
            ))
            if current_user and current_user.teacher_profile and current_user.teacher_profile.id == a.teacher_id:
                is_ack = True

    sec_label = f"Sem {section.semester} - Section {section.section_name}" if section else ""
    dept_name = department.name if department else ""

    return ApplicationResponse(
        id=app.id,
        student_id=app.student_id,
        student_name=student_user.full_name if student_user else "",
        student_roll=student.roll_number if student else "",
        department_name=dept_name,
        section_label=sec_label,
        request_type=app.request_type,
        title=app.title,
        reason=app.reason,
        start_date=app.start_date,
        end_date=app.end_date,
        status=app.status,
        created_at=app.created_at,
        updated_at=app.updated_at,
        documents=docs,
        hod_approval=hod_resp,
        acknowledgements=acks,
        is_acknowledged_by_current_teacher=is_ack
    )


@router.post("/", response_model=ApplicationResponse)
async def submit_application(
    request_type: RequestType = Form(...),
    title: str = Form(...),
    reason: str = Form(...),
    start_date: date = Form(...),
    end_date: date = Form(...),
    document: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.STUDENT]))
):
    try:
        print("STEP 1: student profile lookup", flush=True)
        student = current_user.student_profile
        if not student:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Student profile not found for this user"
            )
        if not student.section_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Student is not assigned to any academic section. Please contact Admin."
            )

        print("STEP 2: date validation", flush=True)
        if start_date > end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date cannot be later than end date"
            )

        # 1. Pre-generate Application ID to construct storage path: applications/{application_id}/{unique_filename}
        application_id = str(uuid.uuid4())
        print(f"STEP 3: pre-generated application_id = {application_id}", flush=True)

        # 2. Upload Document to Supabase Storage BEFORE creating DB records
        print("STEP 4: starting StorageService.upload_document", flush=True)
        storage_path, file_size, content_type = await StorageService.upload_document(
            file=document,
            folder="applications",
            sub_folder=application_id
        )
        print(f"STEP 5: storage upload success. path={storage_path}, size={file_size}, type={content_type}", flush=True)

        # 3. Create DB records ONLY AFTER Supabase upload succeeds
        try:
            print("STEP 6: creating Application object", flush=True)
            new_app = Application(
                id=application_id,
                student_id=student.id,
                request_type=request_type,
                title=title,
                reason=reason,
                start_date=start_date,
                end_date=end_date,
                status=ApplicationStatus.SUBMITTED
            )
            db.add(new_app)

            print("STEP 7: creating ApplicationDocument object", flush=True)
            app_doc = ApplicationDocument(
                application_id=new_app.id,
                file_name=document.filename,
                storage_path=storage_path,
                file_type=content_type,
                file_size_bytes=file_size
            )
            db.add(app_doc)

            # Audit Log (flushes within transaction without premature commit)
            print("STEP 8: logging audit action", flush=True)
            AuditService.log_action(
                db=db,
                actor_id=current_user.id,
                action="SUBMITTED_APPLICATION",
                entity_type="APPLICATION",
                entity_id=new_app.id,
                details={"title": title, "request_type": request_type.value},
                commit=False
            )

            # Notify HOD of student's department safely
            print("STEP 9: notifying HOD", flush=True)
            try:
                dept = student.section.department if student.section else None
                if dept and dept.hod and dept.hod.user_id:
                    NotificationService.create_notification(
                        db=db,
                        user_id=dept.hod.user_id,
                        title="New Pending Application",
                        message=f"Student {current_user.full_name} ({student.roll_number}) submitted a {request_type.value} request.",
                        link=f"/hod/applications/{new_app.id}",
                        commit=False
                    )
            except Exception as notif_err:
                print(f"Secondary notification error (non-fatal): {notif_err}", flush=True)

            print("STEP 10: committing DB session", flush=True)
            db.commit()
            print("STEP 11: DB transaction committed successfully", flush=True)
        except Exception as db_err:
            print(f"STEP ERROR: DB transaction failed: {db_err}", flush=True)
            import traceback
            traceback.print_exc()
            db.rollback()
            # Clean up uploaded file from Supabase Storage if DB transaction fails
            StorageService.delete_document(storage_path)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database save failed after file upload. Cleaned up storage path."
            )

        print("STEP 12: Eager loading application for response construction", flush=True)
        full_app = (
            db.query(Application)
            .options(
                joinedload(Application.student).joinedload(StudentProfile.user),
                joinedload(Application.student).joinedload(StudentProfile.section).joinedload(Section.department),
                selectinload(Application.documents),
                joinedload(Application.hod_approval).joinedload(HODApproval.hod).joinedload(HODProfile.user),
                selectinload(Application.acknowledgements).joinedload(TeacherAcknowledgement.teacher).joinedload(TeacherProfile.user),
            )
            .filter(Application.id == application_id)
            .first()
        )
        if not full_app:
            full_app = new_app

        print("STEP 13: building application response", flush=True)
        res = build_application_response(full_app, current_user)
        print("STEP 14: response built successfully", flush=True)
        return res
    except HTTPException:
        raise
    except Exception as e:
        print(f"UNHANDLED EXCEPTION IN SUBMIT APPLICATION: {e}", flush=True)
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unhandled application submission error."
        )



@router.get("/my-applications", response_model=List[ApplicationResponse])
def get_student_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.STUDENT]))
):
    student = current_user.student_profile
    if not student:
        return []
    apps = (
        db.query(Application)
        .options(
            joinedload(Application.student).joinedload(StudentProfile.user),
            joinedload(Application.student).joinedload(StudentProfile.section).joinedload(Section.department),
            selectinload(Application.documents),
            joinedload(Application.hod_approval).joinedload(HODApproval.hod).joinedload(HODProfile.user),
            selectinload(Application.acknowledgements).joinedload(TeacherAcknowledgement.teacher).joinedload(TeacherProfile.user),
        )
        .filter(Application.student_id == student.id)
        .order_by(Application.created_at.desc())
        .all()
    )
    return [build_application_response(a, current_user) for a in apps]


