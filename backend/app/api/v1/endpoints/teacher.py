from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.permissions import require_roles
from app.models.user import User, UserRole
from app.models.application import Application, ApplicationStatus
from app.models.academic import StudentProfile, Section, TeacherSubjectAssignment, TeacherProfile
from app.models.approval import TeacherAcknowledgement
from app.schemas.application import ApplicationResponse
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService
from app.api.v1.endpoints.applications import build_application_response

router = APIRouter()


def check_teacher_authorization_for_application(db: Session, teacher_profile: TeacherProfile, app: Application):
    """
    CRITICAL SECURITY GUARD:
    1. Application MUST be APPROVED_BY_HOD.
    2. Teacher MUST be assigned to at least one subject for the student's section.
    """
    # 1. HOD Approval Check
    if app.status != ApplicationStatus.APPROVED_BY_HOD:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied. Teachers are not permitted to view applications until they are officially approved by HOD."
        )

    # 2. Section / Subject Assignment Check or Historical Signatory Check
    student = app.student
    if not student or not student.section_id:
        raise HTTPException(status_code=403, detail="Access Denied. Student section not found.")

    has_assignment = db.query(TeacherSubjectAssignment).filter(
        TeacherSubjectAssignment.teacher_id == teacher_profile.id,
        TeacherSubjectAssignment.section_id == student.section_id
    ).first()

    has_historical_ack = db.query(TeacherAcknowledgement).filter(
        TeacherAcknowledgement.application_id == app.id,
        TeacherAcknowledgement.teacher_id == teacher_profile.id
    ).first()

    if not has_assignment and not has_historical_ack:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied. You are not an assigned teacher for this student's class section."
        )


@router.get("/applications/approved", response_model=List[ApplicationResponse])
def get_teacher_approved_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.TEACHER]))
):
    teacher = current_user.teacher_profile
    if not teacher:
        raise HTTPException(status_code=400, detail="Teacher profile not found")

    # Get all section IDs assigned to this teacher
    assigned_section_ids = [
        row[0] for row in db.query(TeacherSubjectAssignment.section_id)
        .filter(TeacherSubjectAssignment.teacher_id == teacher.id)
        .distinct().all()
    ]

    if not assigned_section_ids:
        return []

    # Query HOD approved applications for students enrolled in assigned sections
    apps = (
        db.query(Application)
        .join(StudentProfile, Application.student_id == StudentProfile.id)
        .filter(StudentProfile.section_id.in_(assigned_section_ids))
        .filter(Application.status == ApplicationStatus.APPROVED_BY_HOD)
        .order_by(Application.created_at.desc())
        .all()
    )

    return [build_application_response(a, current_user) for a in apps]


@router.get("/applications/{application_id}", response_model=ApplicationResponse)
def get_teacher_application_by_id(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.TEACHER]))
):
    teacher = current_user.teacher_profile
    if not teacher:
        raise HTTPException(status_code=400, detail="Teacher profile not found")

    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Strict authorization check
    check_teacher_authorization_for_application(db, teacher, app)

    return build_application_response(app, current_user)


@router.post("/applications/{application_id}/acknowledge", response_model=ApplicationResponse)
def acknowledge_application(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.TEACHER]))
):
    teacher = current_user.teacher_profile
    if not teacher:
        raise HTTPException(status_code=400, detail="Teacher profile not found")

    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Strict authorization check
    check_teacher_authorization_for_application(db, teacher, app)

    # Check if already acknowledged
    existing_ack = db.query(TeacherAcknowledgement).filter(
        TeacherAcknowledgement.application_id == app.id,
        TeacherAcknowledgement.teacher_id == teacher.id
    ).first()

    if not existing_ack:
        ack = TeacherAcknowledgement(
            application_id=app.id,
            teacher_id=teacher.id
        )
        db.add(ack)
        db.commit()

        # Audit Log
        AuditService.log_action(
            db=db,
            actor_id=current_user.id,
            action="TEACHER_ACKNOWLEDGED_APPLICATION",
            entity_type="APPLICATION",
            entity_id=app.id
        )

        # Notify Student
        student = app.student
        if student and student.user_id:
            NotificationService.create_notification(
                db=db,
                user_id=student.user_id,
                title="Teacher Acknowledgment",
                message=f"Prof. {current_user.full_name} acknowledged your application '{app.title}'.",
                link=f"/student/applications/{app.id}"
            )

    return build_application_response(app, current_user)
