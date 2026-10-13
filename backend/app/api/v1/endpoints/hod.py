from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.permissions import require_roles
from app.models.user import User, UserRole
from app.models.application import Application, ApplicationStatus
from app.models.academic import StudentProfile, Section, Department, TeacherSubjectAssignment
from app.models.approval import HODApproval, HODDecisionStatus
from app.schemas.application import ApplicationResponse
from app.schemas.approval import HODActionRequest
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService
from app.api.v1.endpoints.applications import build_application_response

router = APIRouter()


@router.get("/applications/pending", response_model=List[ApplicationResponse])
def get_hod_pending_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.HOD]))
):
    hod = current_user.hod_profile
    if not hod or not hod.department_id:
        raise HTTPException(status_code=400, detail="HOD is not assigned to a department")

    # Get applications submitted by students in sections belonging to HOD's department
    apps = (
        db.query(Application)
        .join(StudentProfile, Application.student_id == StudentProfile.id)
        .join(Section, StudentProfile.section_id == Section.id)
        .filter(Section.department_id == hod.department_id)
        .filter(Application.status == ApplicationStatus.SUBMITTED)
        .order_by(Application.created_at.desc())
        .all()
    )
    return [build_application_response(a, current_user) for a in apps]


@router.get("/applications/all", response_model=List[ApplicationResponse])
def get_hod_all_applications(
    status_filter: Optional[ApplicationStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.HOD]))
):
    hod = current_user.hod_profile
    if not hod or not hod.department_id:
        raise HTTPException(status_code=400, detail="HOD is not assigned to a department")

    query = (
        db.query(Application)
        .join(StudentProfile, Application.student_id == StudentProfile.id)
        .join(Section, StudentProfile.section_id == Section.id)
        .filter(Section.department_id == hod.department_id)
    )
    if status_filter:
        query = query.filter(Application.status == status_filter)

    apps = query.order_by(Application.created_at.desc()).all()
    return [build_application_response(a, current_user) for a in apps]


@router.post("/applications/{application_id}/review", response_model=ApplicationResponse)
def review_application(
    application_id: str,
    action: HODActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.HOD]))
):
    hod = current_user.hod_profile
    if not hod or not hod.department_id:
        raise HTTPException(status_code=400, detail="HOD profile not found")

    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Check if student belongs to HOD's department
    student = app.student
    if not student or not student.section or student.section.department_id != hod.department_id:
        raise HTTPException(status_code=403, detail="You are not authorized to review applications outside your department")

    if app.status != ApplicationStatus.SUBMITTED:
        raise HTTPException(status_code=400, detail=f"Application has already been processed with status '{app.status.value}'")

    if action.decision == HODDecisionStatus.APPROVED:
        app.status = ApplicationStatus.APPROVED_BY_HOD
        new_approval = HODApproval(
            application_id=app.id,
            hod_id=hod.id,
            status=HODDecisionStatus.APPROVED,
            remarks=action.remarks
        )
        db.add(new_approval)
        db.commit()
        db.refresh(app)

        # Audit Log
        AuditService.log_action(
            db=db,
            actor_id=current_user.id,
            action="HOD_APPROVED_APPLICATION",
            entity_type="APPLICATION",
            entity_id=app.id,
            details={"remarks": action.remarks}
        )

        # Notify Student
        NotificationService.create_notification(
            db=db,
            user_id=student.user_id,
            title="Application Approved by HOD",
            message=f"Your {app.request_type.value} application '{app.title}' was APPROVED by HOD.",
            link=f"/student/applications/{app.id}"
        )

        # Notify Relevant Section Teachers
        # Find teachers assigned to student's section
        assignments = db.query(TeacherSubjectAssignment).filter(
            TeacherSubjectAssignment.section_id == student.section_id
        ).all()
        
        teacher_user_ids = set()
        for asgn in assignments:
            if asgn.teacher and asgn.teacher.user_id:
                teacher_user_ids.add(asgn.teacher.user_id)

        if teacher_user_ids:
            NotificationService.notify_multiple_users(
                db=db,
                user_ids=list(teacher_user_ids),
                title="Approved Application Notification",
                message=f"An officially HOD-approved leave request from {student.user.full_name} ({student.roll_number}) requires your acknowledgement.",
                link=f"/teacher/applications/{app.id}"
            )

    else:
        # Rejected
        app.status = ApplicationStatus.REJECTED_BY_HOD
        new_approval = HODApproval(
            application_id=app.id,
            hod_id=hod.id,
            status=HODDecisionStatus.REJECTED,
            remarks=action.remarks
        )
        db.add(new_approval)
        db.commit()
        db.refresh(app)

        # Audit Log
        AuditService.log_action(
            db=db,
            actor_id=current_user.id,
            action="HOD_REJECTED_APPLICATION",
            entity_type="APPLICATION",
            entity_id=app.id,
            details={"remarks": action.remarks}
        )

        # Notify Student
        NotificationService.create_notification(
            db=db,
            user_id=student.user_id,
            title="Application Rejected by HOD",
            message=f"Your {app.request_type.value} application '{app.title}' was REJECTED by HOD. Reason: {action.remarks or 'N/A'}",
            link=f"/student/applications/{app.id}"
        )

    return build_application_response(app, current_user)
