from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.permissions import require_roles
from app.models.user import User, UserRole
from app.models.correction import AttendanceCorrection, CorrectionStatus
from app.models.academic import StudentProfile, TeacherProfile, Subject
from app.schemas.correction import CorrectionCreate, CorrectionAction, CorrectionResponse
from app.services.storage import StorageService
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService

router = APIRouter()


def build_correction_response(c: AttendanceCorrection) -> CorrectionResponse:
    student_name = c.student.user.full_name if c.student and c.student.user else ""
    student_roll = c.student.roll_number if c.student else ""
    teacher_name = c.teacher.user.full_name if c.teacher and c.teacher.user else ""
    subject_code = c.subject.code if c.subject else ""
    subject_name = c.subject.name if c.subject else ""

    signed_url = None
    if c.proof_document_path:
        signed_url = StorageService.get_signed_url(c.proof_document_path)

    return CorrectionResponse(
        id=c.id,
        student_id=c.student_id,
        student_name=student_name,
        student_roll=student_roll,
        teacher_id=c.teacher_id,
        teacher_name=teacher_name,
        subject_id=c.subject_id,
        subject_code=subject_code,
        subject_name=subject_name,
        date_of_absence=c.date_of_absence,
        reason=c.reason,
        proof_document_path=c.proof_document_path,
        proof_signed_url=signed_url,
        status=c.status,
        teacher_remarks=c.teacher_remarks,
        created_at=c.created_at,
        updated_at=c.updated_at
    )


@router.post("/", response_model=CorrectionResponse)
async def submit_attendance_correction(
    teacher_id: str = Form(...),
    subject_id: str = Form(...),
    date_of_absence: date = Form(...),
    reason: str = Form(...),
    proof_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.STUDENT]))
):
    student = current_user.student_profile
    if not student:
        raise HTTPException(status_code=400, detail="Student profile not found")

    teacher = db.query(TeacherProfile).filter(TeacherProfile.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Selected teacher not found")

    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Selected subject not found")

    proof_path = None
    if proof_file:
        proof_path, _, _ = await StorageService.upload_document(proof_file, folder="corrections")

    new_correction = AttendanceCorrection(
        student_id=student.id,
        teacher_id=teacher_id,
        subject_id=subject_id,
        date_of_absence=date_of_absence,
        reason=reason,
        proof_document_path=proof_path,
        status=CorrectionStatus.PENDING
    )
    db.add(new_correction)
    db.commit()
    db.refresh(new_correction)

    # Audit Log
    AuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action="SUBMITTED_ATTENDANCE_CORRECTION",
        entity_type="ATTENDANCE_CORRECTION",
        entity_id=new_correction.id
    )

    # Directly Notify Subject Teacher (Bypassing HOD completely!)
    if teacher.user_id:
        NotificationService.create_notification(
            db=db,
            user_id=teacher.user_id,
            title="Attendance Correction Request",
            message=f"Student {current_user.full_name} ({student.roll_number}) submitted an attendance correction request for {subject.code}.",
            link=f"/teacher/corrections"
        )

    return build_correction_response(new_correction)


@router.get("/my-corrections", response_model=List[CorrectionResponse])
def get_student_corrections(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.STUDENT]))
):
    student = current_user.student_profile
    if not student:
        return []
    records = db.query(AttendanceCorrection).filter(AttendanceCorrection.student_id == student.id).order_by(AttendanceCorrection.created_at.desc()).all()
    return [build_correction_response(r) for r in records]


@router.get("/teacher/pending", response_model=List[CorrectionResponse])
def get_teacher_pending_corrections(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.TEACHER]))
):
    teacher = current_user.teacher_profile
    if not teacher:
        raise HTTPException(status_code=400, detail="Teacher profile not found")

    records = db.query(AttendanceCorrection).filter(
        AttendanceCorrection.teacher_id == teacher.id,
        AttendanceCorrection.status == CorrectionStatus.PENDING
    ).order_by(AttendanceCorrection.created_at.desc()).all()

    return [build_correction_response(r) for r in records]


@router.get("/teacher/all", response_model=List[CorrectionResponse])
def get_teacher_all_corrections(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.TEACHER]))
):
    teacher = current_user.teacher_profile
    if not teacher:
        raise HTTPException(status_code=400, detail="Teacher profile not found")

    records = db.query(AttendanceCorrection).filter(
        AttendanceCorrection.teacher_id == teacher.id
    ).order_by(AttendanceCorrection.created_at.desc()).all()

    return [build_correction_response(r) for r in records]


@router.post("/{correction_id}/review", response_model=CorrectionResponse)
def review_attendance_correction(
    correction_id: str,
    action: CorrectionAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.TEACHER]))
):
    teacher = current_user.teacher_profile
    if not teacher:
        raise HTTPException(status_code=400, detail="Teacher profile not found")

    rec = db.query(AttendanceCorrection).filter(AttendanceCorrection.id == correction_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Attendance correction request not found")

    if rec.teacher_id != teacher.id:
        raise HTTPException(status_code=403, detail="You are not the designated teacher for this correction request")

    rec.status = action.status
    rec.teacher_remarks = action.teacher_remarks
    db.commit()
    db.refresh(rec)

    # Audit Log
    AuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action=f"TEACHER_{action.status.value}_CORRECTION",
        entity_type="ATTENDANCE_CORRECTION",
        entity_id=rec.id,
        details={"remarks": action.teacher_remarks}
    )

    # Notify Student
    if rec.student and rec.student.user_id:
        NotificationService.create_notification(
            db=db,
            user_id=rec.student.user_id,
            title=f"Attendance Correction {action.status.value.title()}",
            message=f"Prof. {current_user.full_name} {action.status.value.lower()} your attendance correction for date {rec.date_of_absence}.",
            link="/student/corrections"
        )

    return build_correction_response(rec)
