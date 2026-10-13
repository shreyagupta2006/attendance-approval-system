from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.core.database import get_db
from app.core.security import get_password_hash
from app.dependencies.permissions import require_roles
from app.models.user import User, UserRole
from app.models.academic import (
    Department, Section, Subject, StudentProfile, TeacherProfile, HODProfile, TeacherSubjectAssignment
)
from app.models.application import Application, ApplicationStatus
from app.models.approval import HODApproval, TeacherAcknowledgement
from app.models.correction import AttendanceCorrection, CorrectionStatus
from app.services.audit_service import AuditService
from app.schemas.user import (
    UserCreate, UserResponse, StudentUpdate, TeacherUpdate, HODUpdate,
    UserStatusUpdate, StudentDerivedCurriculumResponse, DerivedSubjectTeacher
)
from app.schemas.academic import (
    DepartmentCreate, DepartmentResponse, DepartmentUpdate, DepartmentDetailResponse,
    SectionCreate, SectionResponse, SectionUpdate,
    SubjectCreate, SubjectResponse, SubjectUpdate,
    AssignmentCreate, AssignmentResponse, AssignmentUpdate, AssignmentDetailResponse
)
from app.schemas.admin import AdminDashboardStats

router = APIRouter()


# --- Admin Stats Overview with Accurate Teacher Routing ---
@router.get("/stats", response_model=AdminDashboardStats)
def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    total_students = db.query(StudentProfile).count()
    total_teachers = db.query(TeacherProfile).count()
    total_hods = db.query(HODProfile).count()
    total_departments = db.query(Department).count()
    total_sections = db.query(Section).count()
    total_subjects = db.query(Subject).count()
    total_assignments = db.query(TeacherSubjectAssignment).count()

    pending_hod = db.query(Application).filter(Application.status == ApplicationStatus.SUBMITTED).count()
    pending_corrections = db.query(AttendanceCorrection).filter(AttendanceCorrection.status == CorrectionStatus.PENDING).count()

    # Calculate actual outstanding teacher acknowledgements & misconfigured section warnings
    approved_apps = db.query(Application).filter(Application.status == ApplicationStatus.APPROVED_BY_HOD).all()

    apps_awaiting_ack = 0
    total_unacked_slots = 0
    unassigned_section_warnings = 0

    for app in approved_apps:
        sec_id = app.student.section_id if app.student else None
        if not sec_id:
            unassigned_section_warnings += 1
            continue

        assigned_teachers = {
            r[0] for r in db.query(TeacherSubjectAssignment.teacher_id)
            .filter(TeacherSubjectAssignment.section_id == sec_id)
            .all()
        }

        if len(assigned_teachers) == 0:
            unassigned_section_warnings += 1
        else:
            acked_teachers = {
                r[0] for r in db.query(TeacherAcknowledgement.teacher_id)
                .filter(TeacherAcknowledgement.application_id == app.id)
                .all()
            }
            unacked = assigned_teachers - acked_teachers
            if len(unacked) > 0:
                apps_awaiting_ack += 1
                total_unacked_slots += len(unacked)

    return AdminDashboardStats(
        total_students=total_students,
        total_teachers=total_teachers,
        total_hods=total_hods,
        total_departments=total_departments,
        total_sections=total_sections,
        total_subjects=total_subjects,
        total_teacher_assignments=total_assignments,
        pending_hod_approvals=pending_hod,
        applications_awaiting_teacher_ack=apps_awaiting_ack,
        total_unacknowledged_teacher_slots=total_unacked_slots,
        unassigned_section_warnings=unassigned_section_warnings,
        pending_attendance_corrections=pending_corrections
    )


# --- User Status Management (Safe Activation / Deactivation) ---
@router.patch("/users/{user_id}/status", response_model=UserResponse)
def update_user_status(
    user_id: str,
    status_in: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if current_user.id == user.id and not status_in.is_active:
        raise HTTPException(status_code=400, detail="Administrator cannot deactivate their own account")

    user.is_active = status_in.is_active

    action_name = "ADMIN_ACTIVATED_USER" if status_in.is_active else "ADMIN_DEACTIVATED_USER"
    AuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action=action_name,
        entity_type="USER",
        entity_id=user.id,
        details={"user_email": user.email, "role": user.role.value, "is_active": user.is_active},
        commit=False
    )
    db.commit()
    db.refresh(user)

    resp = UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at
    )
    if user.student_profile:
        resp.student_id = user.student_profile.id
        resp.roll_number = user.student_profile.roll_number
        if user.student_profile.section:
            sec = user.student_profile.section
            resp.section_id = sec.id
            resp.section_label = f"Sem {sec.semester} - Section {sec.section_name}"
            resp.semester = sec.semester
            if sec.department:
                resp.department_id = sec.department.id
                resp.department_name = sec.department.name
    elif user.teacher_profile:
        resp.teacher_id = user.teacher_profile.id
        resp.employee_id = user.teacher_profile.employee_id
        if user.teacher_profile.department:
            resp.department_id = user.teacher_profile.department.id
            resp.department_name = user.teacher_profile.department.name
    elif user.hod_profile:
        resp.hod_id = user.hod_profile.id
        if user.hod_profile.department:
            resp.department_id = user.hod_profile.department.id
            resp.department_name = user.hod_profile.department.name

    return resp


# --- Student Management ---
@router.get("/students", response_model=List[UserResponse])
def get_students(
    department_id: Optional[str] = None,
    semester: Optional[int] = None,
    section_id: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    query = db.query(StudentProfile).join(User)

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    if section_id:
        query = query.filter(StudentProfile.section_id == section_id)
    elif department_id or semester:
        query = query.join(Section)
        if department_id:
            query = query.filter(Section.department_id == department_id)
        if semester:
            query = query.filter(Section.semester == semester)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                User.full_name.ilike(search_term),
                User.email.ilike(search_term),
                StudentProfile.roll_number.ilike(search_term)
            )
        )

    students = query.order_by(StudentProfile.roll_number).all()
    results = []
    for s in students:
        u = s.user
        sec = s.section
        dept = sec.department if sec else None
        sec_label = f"Sem {sec.semester} - Section {sec.section_name}" if sec else "Unassigned"
        results.append(UserResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            is_active=u.is_active,
            created_at=u.created_at,
            student_id=s.id,
            roll_number=s.roll_number,
            section_id=s.section_id,
            section_label=sec_label,
            semester=sec.semester if sec else None,
            department_id=dept.id if dept else None,
            department_name=dept.name if dept else None
        ))
    return results


@router.post("/students", response_model=UserResponse)
def create_student(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    if not user_in.roll_number:
        raise HTTPException(status_code=400, detail="Roll number is required for student registration")

    existing_roll = db.query(StudentProfile).filter(StudentProfile.roll_number == user_in.roll_number).first()
    if existing_roll:
        raise HTTPException(status_code=400, detail="Student with this roll number already exists")

    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=UserRole.STUDENT,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    student = StudentProfile(
        user_id=new_user.id,
        roll_number=user_in.roll_number,
        section_id=user_in.section_id
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    # Sanitized audit logging
    AuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action="ADMIN_CREATED_STUDENT",
        entity_type="STUDENT",
        entity_id=student.id,
        details={"roll_number": student.roll_number, "email": new_user.email, "section_id": student.section_id},
        commit=True
    )

    sec = student.section
    dept = sec.department if sec else None
    sec_label = f"Sem {sec.semester} - Section {sec.section_name}" if sec else "Unassigned"

    return UserResponse(
        id=new_user.id,
        email=new_user.email,
        full_name=new_user.full_name,
        role=new_user.role,
        is_active=new_user.is_active,
        created_at=new_user.created_at,
        student_id=student.id,
        roll_number=student.roll_number,
        section_id=student.section_id,
        section_label=sec_label,
        semester=sec.semester if sec else None,
        department_id=dept.id if dept else None,
        department_name=dept.name if dept else None
    )


@router.put("/students/{student_id}", response_model=UserResponse)
def update_student(
    student_id: str,
    update_in: StudentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    student = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    user = student.user
    updated_fields = []

    if update_in.email and update_in.email != user.email:
        existing_email = db.query(User).filter(User.email == update_in.email).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Email address is already in use")
        user.email = update_in.email
        updated_fields.append("email")

    if update_in.full_name:
        user.full_name = update_in.full_name
        updated_fields.append("full_name")

    if update_in.roll_number and update_in.roll_number != student.roll_number:
        existing_roll = db.query(StudentProfile).filter(StudentProfile.roll_number == update_in.roll_number).first()
        if existing_roll:
            raise HTTPException(status_code=400, detail="Roll number is already in use")
        student.roll_number = update_in.roll_number
        updated_fields.append("roll_number")

    if update_in.section_id is not None:
        student.section_id = update_in.section_id
        updated_fields.append("section_id")

    AuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action="ADMIN_UPDATED_STUDENT",
        entity_type="STUDENT",
        entity_id=student.id,
        details={"updated_fields": updated_fields},
        commit=False
    )
    db.commit()
    db.refresh(user)
    db.refresh(student)

    sec = student.section
    dept = sec.department if sec else None
    sec_label = f"Sem {sec.semester} - Section {sec.section_name}" if sec else "Unassigned"

    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        student_id=student.id,
        roll_number=student.roll_number,
        section_id=student.section_id,
        section_label=sec_label,
        semester=sec.semester if sec else None,
        department_id=dept.id if dept else None,
        department_name=dept.name if dept else None
    )


@router.delete("/students/{student_id}")
def delete_student(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    student = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Strict Dependency Guard
    has_apps = db.query(Application).filter(Application.student_id == student_id).first()
    has_corrs = db.query(AttendanceCorrection).filter(AttendanceCorrection.student_id == student_id).first()
    if has_apps or has_corrs:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete student with historical leave applications or attendance correction records. "
                   "Please deactivate the student account instead to preserve institutional records."
        )

    user = student.user
    user_id = user.id
    user_email = user.email

    db.delete(user)
    AuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action="ADMIN_DELETED_STUDENT",
        entity_type="STUDENT",
        entity_id=student_id,
        details={"email": user_email},
        commit=False
    )
    db.commit()
    return {"detail": "Student deleted successfully"}


@router.get("/students/{student_id}/derived-curriculum", response_model=StudentDerivedCurriculumResponse)
def get_student_derived_curriculum(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    student = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    user = student.user
    sec = student.section
    dept = sec.department if sec else None

    derived_subjects = []
    if sec:
        asgns = db.query(TeacherSubjectAssignment).filter(TeacherSubjectAssignment.section_id == sec.id).all()
        for a in asgns:
            teacher_name = a.teacher.user.full_name if (a.teacher and a.teacher.user) else "Unassigned"
            teacher_emp = a.teacher.employee_id if a.teacher else ""
            derived_subjects.append(DerivedSubjectTeacher(
                assignment_id=a.id,
                subject_id=a.subject_id,
                subject_code=a.subject.code if a.subject else "",
                subject_name=a.subject.name if a.subject else "",
                teacher_id=a.teacher_id,
                teacher_name=teacher_name,
                teacher_employee_id=teacher_emp
            ))

    return StudentDerivedCurriculumResponse(
        student_id=student.id,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        roll_number=student.roll_number,
        is_active=user.is_active,
        section_id=sec.id if sec else None,
        section_name=sec.section_name if sec else None,
        semester=sec.semester if sec else None,
        department_id=dept.id if dept else None,
        department_name=dept.name if dept else None,
        curriculum_source=f"Derived from Section {sec.semester}-{sec.section_name}" if sec else "No section assigned",
        assigned_subjects=derived_subjects
    )


# --- Teacher Management ---
@router.get("/teachers", response_model=List[UserResponse])
def get_teachers(
    department_id: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    query = db.query(TeacherProfile).join(User)

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    if department_id:
        query = query.filter(TeacherProfile.department_id == department_id)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                User.full_name.ilike(search_term),
                User.email.ilike(search_term),
                TeacherProfile.employee_id.ilike(search_term)
            )
        )

    teachers = query.order_by(TeacherProfile.employee_id).all()
    results = []
    for t in teachers:
        u = t.user
        dept = t.department
        results.append(UserResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            is_active=u.is_active,
            created_at=u.created_at,
            teacher_id=t.id,
            employee_id=t.employee_id,
            department_id=t.department_id,
            department_name=dept.name if dept else None
        ))
    return results


@router.post("/teachers", response_model=UserResponse)
def create_teacher(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    if not user_in.employee_id:
        raise HTTPException(status_code=400, detail="Employee ID is required for teacher registration")

    existing_emp = db.query(TeacherProfile).filter(TeacherProfile.employee_id == user_in.employee_id).first()
    if existing_emp:
        raise HTTPException(status_code=400, detail="Teacher with this employee ID already exists")

    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=UserRole.TEACHER,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    teacher = TeacherProfile(
        user_id=new_user.id,
        employee_id=user_in.employee_id,
        department_id=user_in.department_id
    )
    db.add(teacher)
    db.commit()
    db.refresh(teacher)

    AuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action="ADMIN_CREATED_TEACHER",
        entity_type="TEACHER",
        entity_id=teacher.id,
        details={"employee_id": teacher.employee_id, "email": new_user.email, "department_id": teacher.department_id},
        commit=True
    )

    dept = teacher.department
    return UserResponse(
        id=new_user.id,
        email=new_user.email,
        full_name=new_user.full_name,
        role=new_user.role,
        is_active=new_user.is_active,
        created_at=new_user.created_at,
        teacher_id=teacher.id,
        employee_id=teacher.employee_id,
        department_id=teacher.department_id,
        department_name=dept.name if dept else None
    )


@router.put("/teachers/{teacher_id}", response_model=UserResponse)
def update_teacher(
    teacher_id: str,
    update_in: TeacherUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    teacher = db.query(TeacherProfile).filter(TeacherProfile.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    user = teacher.user
    updated_fields = []

    if update_in.email and update_in.email != user.email:
        existing = db.query(User).filter(User.email == update_in.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email is already in use")
        user.email = update_in.email
        updated_fields.append("email")

    if update_in.full_name:
        user.full_name = update_in.full_name
        updated_fields.append("full_name")

    if update_in.employee_id and update_in.employee_id != teacher.employee_id:
        existing = db.query(TeacherProfile).filter(TeacherProfile.employee_id == update_in.employee_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Employee ID is already in use")
        teacher.employee_id = update_in.employee_id
        updated_fields.append("employee_id")

    if update_in.department_id is not None:
        teacher.department_id = update_in.department_id
        updated_fields.append("department_id")

    AuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action="ADMIN_UPDATED_TEACHER",
        entity_type="TEACHER",
        entity_id=teacher.id,
        details={"updated_fields": updated_fields},
        commit=False
    )
    db.commit()
    db.refresh(user)
    db.refresh(teacher)

    dept = teacher.department
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        teacher_id=teacher.id,
        employee_id=teacher.employee_id,
        department_id=teacher.department_id,
        department_name=dept.name if dept else None
    )


@router.delete("/teachers/{teacher_id}")
def delete_teacher(
    teacher_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    teacher = db.query(TeacherProfile).filter(TeacherProfile.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    # Dependency Guard
    has_asgns = db.query(TeacherSubjectAssignment).filter(TeacherSubjectAssignment.teacher_id == teacher_id).first()
    has_acks = db.query(TeacherAcknowledgement).filter(TeacherAcknowledgement.teacher_id == teacher_id).first()
    has_corrs = db.query(AttendanceCorrection).filter(AttendanceCorrection.teacher_id == teacher_id).first()
    if has_asgns or has_acks or has_corrs:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete teacher with existing class assignments, acknowledgements, or correction reviews. "
                   "Please reassign their classes and deactivate the account instead."
        )

    user = teacher.user
    user_email = user.email
    db.delete(user)
    AuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action="ADMIN_DELETED_TEACHER",
        entity_type="TEACHER",
        entity_id=teacher_id,
        details={"email": user_email},
        commit=False
    )
    db.commit()
    return {"detail": "Teacher deleted successfully"}


@router.get("/teachers/{teacher_id}/assignments", response_model=List[AssignmentDetailResponse])
def get_teacher_assignments(
    teacher_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    teacher = db.query(TeacherProfile).filter(TeacherProfile.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    asgns = db.query(TeacherSubjectAssignment).filter(TeacherSubjectAssignment.teacher_id == teacher_id).all()
    results = []
    for a in asgns:
        sec = a.section
        dept = sec.department if sec else None
        results.append(AssignmentDetailResponse(
            id=a.id,
            teacher_id=a.teacher_id,
            teacher_name=teacher.user.full_name if teacher.user else "",
            teacher_employee_id=teacher.employee_id,
            subject_id=a.subject_id,
            subject_code=a.subject.code if a.subject else "",
            subject_name=a.subject.name if a.subject else "",
            section_id=a.section_id,
            section_name=sec.section_name if sec else "",
            semester=sec.semester if sec else 0,
            department_id=dept.id if dept else "",
            department_name=dept.name if dept else "",
            department_code=dept.code if dept else ""
        ))
    return results


# --- HOD Management ---
@router.get("/hods", response_model=List[UserResponse])
def get_hods(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    hods = db.query(HODProfile).all()
    results = []
    for h in hods:
        u = h.user
        dept = h.department
        results.append(UserResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            is_active=u.is_active,
            created_at=u.created_at,
            hod_id=h.id,
            department_id=h.department_id,
            department_name=dept.name if dept else None
        ))
    return results


@router.post("/hods", response_model=UserResponse)
def create_hod(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    if not user_in.department_id:
        raise HTTPException(status_code=400, detail="Department ID is required for HOD registration")

    existing_hod = db.query(HODProfile).filter(HODProfile.department_id == user_in.department_id).first()
    if existing_hod:
        raise HTTPException(status_code=400, detail="An HOD is already assigned to this department")

    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=UserRole.HOD,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    hod = HODProfile(
        user_id=new_user.id,
        department_id=user_in.department_id
    )
    db.add(hod)
    db.commit()
    db.refresh(hod)

    AuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action="ADMIN_ASSIGNED_HOD",
        entity_type="HOD",
        entity_id=hod.id,
        details={"email": new_user.email, "department_id": hod.department_id},
        commit=True
    )

    dept = hod.department
    return UserResponse(
        id=new_user.id,
        email=new_user.email,
        full_name=new_user.full_name,
        role=new_user.role,
        is_active=new_user.is_active,
        created_at=new_user.created_at,
        hod_id=hod.id,
        department_id=hod.department_id,
        department_name=dept.name if dept else None
    )


@router.put("/hods/{hod_id}", response_model=UserResponse)
def update_hod(
    hod_id: str,
    update_in: HODUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    hod = db.query(HODProfile).filter(HODProfile.id == hod_id).first()
    if not hod:
        raise HTTPException(status_code=404, detail="HOD not found")

    user = hod.user
    updated_fields = []

    if update_in.email and update_in.email != user.email:
        existing = db.query(User).filter(User.email == update_in.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email is already in use")
        user.email = update_in.email
        updated_fields.append("email")

    if update_in.full_name:
        user.full_name = update_in.full_name
        updated_fields.append("full_name")

    if update_in.department_id and update_in.department_id != hod.department_id:
        existing = db.query(HODProfile).filter(HODProfile.department_id == update_in.department_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="An HOD is already assigned to this department")
        hod.department_id = update_in.department_id
        updated_fields.append("department_id")

    AuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action="ADMIN_REASSIGNED_HOD",
        entity_type="HOD",
        entity_id=hod.id,
        details={"updated_fields": updated_fields},
        commit=False
    )
    db.commit()
    db.refresh(user)
    db.refresh(hod)

    dept = hod.department
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        hod_id=hod.id,
        department_id=hod.department_id,
        department_name=dept.name if dept else None
    )


@router.delete("/hods/{hod_id}")
def delete_hod(
    hod_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    hod = db.query(HODProfile).filter(HODProfile.id == hod_id).first()
    if not hod:
        raise HTTPException(status_code=404, detail="HOD not found")

    # Dependency check
    has_approvals = db.query(HODApproval).filter(HODApproval.hod_id == hod_id).first()
    if has_approvals:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete HOD with historical approval decisions. "
                   "Please reassign the department HOD role and deactivate the account instead."
        )

    user = hod.user
    user_email = user.email
    db.delete(user)
    AuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action="ADMIN_DELETED_HOD",
        entity_type="HOD",
        entity_id=hod_id,
        details={"email": user_email},
        commit=False
    )
    db.commit()
    return {"detail": "HOD deleted successfully"}


# --- Unified User Account Management ---
@router.get("/users", response_model=List[UserResponse])
def get_all_users(
    role: Optional[UserRole] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    if search:
        search_term = f"%{search}%"
        query = query.filter(or_(User.full_name.ilike(search_term), User.email.ilike(search_term)))

    users = query.order_by(User.created_at.desc()).all()
    results = []
    for u in users:
        ur = UserResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            is_active=u.is_active,
            created_at=u.created_at
        )
        if u.student_profile:
            ur.roll_number = u.student_profile.roll_number
            ur.student_id = u.student_profile.id
            if u.student_profile.section:
                sec = u.student_profile.section
                ur.section_id = sec.id
                ur.section_label = f"Sem {sec.semester} - Section {sec.section_name}"
                ur.semester = sec.semester
                if sec.department:
                    ur.department_id = sec.department.id
                    ur.department_name = sec.department.name
        elif u.teacher_profile:
            ur.employee_id = u.teacher_profile.employee_id
            ur.teacher_id = u.teacher_profile.id
            if u.teacher_profile.department:
                ur.department_id = u.teacher_profile.department.id
                ur.department_name = u.teacher_profile.department.name
        elif u.hod_profile:
            ur.hod_id = u.hod_profile.id
            if u.hod_profile.department:
                ur.department_id = u.hod_profile.department.id
                ur.department_name = u.hod_profile.department.name
        results.append(ur)
    return results


# --- Department Management ---
@router.get("/departments", response_model=List[DepartmentDetailResponse])
def get_departments_detailed(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    depts = db.query(Department).order_by(Department.code).all()
    results = []
    for d in depts:
        sec_count = len(d.sections)
        sub_count = len(d.subjects)
        teacher_count = len(d.teachers)
        student_count = db.query(StudentProfile).join(Section).filter(Section.department_id == d.id).count()
        hod_name = d.hod.user.full_name if (d.hod and d.hod.user) else None
        hod_id = d.hod.id if d.hod else None

        results.append(DepartmentDetailResponse(
            id=d.id,
            name=d.name,
            code=d.code,
            section_count=sec_count,
            subject_count=sub_count,
            teacher_count=teacher_count,
            student_count=student_count,
            hod_name=hod_name,
            hod_id=hod_id
        ))
    return results


@router.post("/departments", response_model=DepartmentResponse)
def create_department(
    dept_in: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    existing = db.query(Department).filter((Department.code == dept_in.code) | (Department.name == dept_in.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department with this code or name already exists")
    dept = Department(name=dept_in.name, code=dept_in.code)
    db.add(dept)
    db.commit()
    db.refresh(dept)

    AuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action="ADMIN_CREATED_DEPARTMENT",
        entity_type="DEPARTMENT",
        entity_id=dept.id,
        details={"code": dept.code, "name": dept.name},
        commit=True
    )
    return dept


@router.put("/departments/{dept_id}", response_model=DepartmentResponse)
def update_department(
    dept_id: str,
    update_in: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    if update_in.name:
        dept.name = update_in.name
    if update_in.code:
        dept.code = update_in.code

    AuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action="ADMIN_UPDATED_DEPARTMENT",
        entity_type="DEPARTMENT",
        entity_id=dept.id,
        details={"code": dept.code, "name": dept.name},
        commit=False
    )
    db.commit()
    db.refresh(dept)
    return dept


@router.delete("/departments/{dept_id}")
def delete_department(
    dept_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    # Dependency Guard
    has_secs = db.query(Section).filter(Section.department_id == dept_id).count()
    has_subs = db.query(Subject).filter(Subject.department_id == dept_id).count()
    has_teachers = db.query(TeacherProfile).filter(TeacherProfile.department_id == dept_id).count()
    if has_secs > 0 or has_subs > 0 or has_teachers > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete department with active dependencies ({has_secs} sections, {has_subs} subjects, {has_teachers} teachers). "
                   "Remove or reassign these entities first."
        )

    code = dept.code
    db.delete(dept)
    AuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action="ADMIN_DELETED_DEPARTMENT",
        entity_type="DEPARTMENT",
        entity_id=dept_id,
        details={"code": code},
        commit=False
    )
    db.commit()
    return {"detail": "Department deleted successfully"}


# --- Section Management ---
@router.post("/sections", response_model=SectionResponse)
def create_section(
    sec_in: SectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    existing = db.query(Section).filter(
        Section.department_id == sec_in.department_id,
        Section.semester == sec_in.semester,
        Section.section_name == sec_in.section_name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="A section with this department, semester, and name already exists")

    sec = Section(department_id=sec_in.department_id, semester=sec_in.semester, section_name=sec_in.section_name)
    db.add(sec)
    db.commit()
    db.refresh(sec)

    AuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action="ADMIN_CREATED_SECTION",
        entity_type="SECTION",
        entity_id=sec.id,
        details={"department_id": sec.department_id, "semester": sec.semester, "section_name": sec.section_name},
        commit=True
    )

    return SectionResponse(
        id=sec.id,
        department_id=sec.department_id,
        semester=sec.semester,
        section_name=sec.section_name,
        department_name=sec.department.name if sec.department else None,
        department_code=sec.department.code if sec.department else None
    )


@router.put("/sections/{sec_id}", response_model=SectionResponse)
def update_section(
    sec_id: str,
    update_in: SectionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    sec = db.query(Section).filter(Section.id == sec_id).first()
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found")

    if update_in.department_id:
        sec.department_id = update_in.department_id
    if update_in.semester:
        sec.semester = update_in.semester
    if update_in.section_name:
        sec.section_name = update_in.section_name

    AuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action="ADMIN_UPDATED_SECTION",
        entity_type="SECTION",
        entity_id=sec.id,
        details={"department_id": sec.department_id, "semester": sec.semester, "section_name": sec.section_name},
        commit=False
    )
    db.commit()
    db.refresh(sec)
    return SectionResponse(
        id=sec.id,
        department_id=sec.department_id,
        semester=sec.semester,
        section_name=sec.section_name,
        department_name=sec.department.name if sec.department else None,
        department_code=sec.department.code if sec.department else None
    )


@router.delete("/sections/{sec_id}")
def delete_section(
    sec_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    sec = db.query(Section).filter(Section.id == sec_id).first()
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found")

    # Dependency Guard
    has_students = db.query(StudentProfile).filter(StudentProfile.section_id == sec_id).count()
    has_asgns = db.query(TeacherSubjectAssignment).filter(TeacherSubjectAssignment.section_id == sec_id).count()
    if has_students > 0 or has_asgns > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete section with existing dependencies ({has_students} enrolled students, {has_asgns} teacher assignments). "
                   "Reassign students and remove assignments first."
        )

    db.delete(sec)
    AuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action="ADMIN_DELETED_SECTION",
        entity_type="SECTION",
        entity_id=sec_id,
        details={"section_id": sec_id},
        commit=False
    )
    db.commit()
    return {"detail": "Section deleted successfully"}


@router.get("/sections/{sec_id}/students", response_model=List[UserResponse])
def get_section_enrolled_students(
    sec_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    sec = db.query(Section).filter(Section.id == sec_id).first()
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found")

    students = db.query(StudentProfile).filter(StudentProfile.section_id == sec_id).all()
    results = []
    for s in students:
        u = s.user
        results.append(UserResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            is_active=u.is_active,
            created_at=u.created_at,
            student_id=s.id,
            roll_number=s.roll_number,
            section_id=sec.id,
            section_label=f"Sem {sec.semester} - Section {sec.section_name}",
            semester=sec.semester,
            department_id=sec.department_id,
            department_name=sec.department.name if sec.department else None
        ))
    return results


# --- Subject Management ---
@router.post("/subjects", response_model=SubjectResponse)
def create_subject(
    sub_in: SubjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    existing = db.query(Subject).filter(Subject.code == sub_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="A subject with this code already exists")

    sub = Subject(code=sub_in.code, name=sub_in.name, department_id=sub_in.department_id)
    db.add(sub)
    db.commit()
    db.refresh(sub)

    AuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action="ADMIN_CREATED_SUBJECT",
        entity_type="SUBJECT",
        entity_id=sub.id,
        details={"code": sub.code, "name": sub.name, "department_id": sub.department_id},
        commit=True
    )

    return SubjectResponse(
        id=sub.id,
        code=sub.code,
        name=sub.name,
        department_id=sub.department_id,
        department_name=sub.department.name if sub.department else None
    )


@router.put("/subjects/{sub_id}", response_model=SubjectResponse)
def update_subject(
    sub_id: str,
    update_in: SubjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    sub = db.query(Subject).filter(Subject.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subject not found")

    if update_in.code and update_in.code != sub.code:
        existing = db.query(Subject).filter(Subject.code == update_in.code).first()
        if existing:
            raise HTTPException(status_code=400, detail="Subject with this code already exists")
        sub.code = update_in.code

    if update_in.name:
        sub.name = update_in.name
    if update_in.department_id:
        sub.department_id = update_in.department_id

    AuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action="ADMIN_UPDATED_SUBJECT",
        entity_type="SUBJECT",
        entity_id=sub.id,
        details={"code": sub.code, "name": sub.name},
        commit=False
    )
    db.commit()
    db.refresh(sub)
    return SubjectResponse(
        id=sub.id,
        code=sub.code,
        name=sub.name,
        department_id=sub.department_id,
        department_name=sub.department.name if sub.department else None
    )


@router.delete("/subjects/{sub_id}")
def delete_subject(
    sub_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    sub = db.query(Subject).filter(Subject.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Dependency Guard
    has_asgns = db.query(TeacherSubjectAssignment).filter(TeacherSubjectAssignment.subject_id == sub_id).count()
    has_corrs = db.query(AttendanceCorrection).filter(AttendanceCorrection.subject_id == sub_id).count()
    if has_asgns > 0 or has_corrs > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete subject with existing dependencies ({has_asgns} teacher assignments, {has_corrs} attendance corrections). "
                   "Remove assignments first."
        )

    code = sub.code
    db.delete(sub)
    AuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action="ADMIN_DELETED_SUBJECT",
        entity_type="SUBJECT",
        entity_id=sub_id,
        details={"code": code},
        commit=False
    )
    db.commit()
    return {"detail": "Subject deleted successfully"}


# --- Academic Assignments Management (1 Teacher per Subject-Section Enforced) ---
@router.get("/assignments", response_model=List[AssignmentDetailResponse])
def get_assignments(
    department_id: Optional[str] = None,
    semester: Optional[int] = None,
    section_id: Optional[str] = None,
    teacher_id: Optional[str] = None,
    subject_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    query = db.query(TeacherSubjectAssignment).join(Section)

    if section_id:
        query = query.filter(TeacherSubjectAssignment.section_id == section_id)
    if department_id:
        query = query.filter(Section.department_id == department_id)
    if semester:
        query = query.filter(Section.semester == semester)
    if teacher_id:
        query = query.filter(TeacherSubjectAssignment.teacher_id == teacher_id)
    if subject_id:
        query = query.filter(TeacherSubjectAssignment.subject_id == subject_id)

    asgns = query.all()
    results = []
    for a in asgns:
        sec = a.section
        dept = sec.department if sec else None
        teacher = a.teacher
        teacher_user = teacher.user if teacher else None
        results.append(AssignmentDetailResponse(
            id=a.id,
            teacher_id=a.teacher_id,
            teacher_name=teacher_user.full_name if teacher_user else "Unassigned",
            teacher_employee_id=teacher.employee_id if teacher else "",
            subject_id=a.subject_id,
            subject_code=a.subject.code if a.subject else "",
            subject_name=a.subject.name if a.subject else "",
            section_id=a.section_id,
            section_name=sec.section_name if sec else "",
            semester=sec.semester if sec else 0,
            department_id=dept.id if dept else "",
            department_name=dept.name if dept else "",
            department_code=dept.code if dept else ""
        ))
    return results


@router.post("/assignments", response_model=AssignmentDetailResponse)
def create_assignment(
    asgn_in: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    teacher = db.query(TeacherProfile).filter(TeacherProfile.id == asgn_in.teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Selected teacher not found")

    if not teacher.user or not teacher.user.is_active:
        raise HTTPException(status_code=400, detail="Cannot assign a deactivated teacher to a class")

    subject = db.query(Subject).filter(Subject.id == asgn_in.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Selected subject not found")

    section = db.query(Section).filter(Section.id == asgn_in.section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Selected section not found")

    # Enforce 1 Teacher per Subject per Section policy
    existing = db.query(TeacherSubjectAssignment).filter(
        TeacherSubjectAssignment.subject_id == asgn_in.subject_id,
        TeacherSubjectAssignment.section_id == asgn_in.section_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"A teacher ({existing.teacher.user.full_name if existing.teacher and existing.teacher.user else 'faculty'}) "
                   f"is already assigned to {subject.code} for Section {section.section_name}. "
                   "Please use the Reassign action to change the teacher."
        )

    asgn = TeacherSubjectAssignment(
        teacher_id=asgn_in.teacher_id,
        subject_id=asgn_in.subject_id,
        section_id=asgn_in.section_id
    )
    db.add(asgn)
    db.commit()
    db.refresh(asgn)

    AuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action="ADMIN_CREATED_ASSIGNMENT",
        entity_type="ASSIGNMENT",
        entity_id=asgn.id,
        details={"teacher_id": asgn.teacher_id, "subject_id": asgn.subject_id, "section_id": asgn.section_id},
        commit=True
    )

    dept = section.department
    return AssignmentDetailResponse(
        id=asgn.id,
        teacher_id=asgn.teacher_id,
        teacher_name=teacher.user.full_name if teacher.user else "",
        teacher_employee_id=teacher.employee_id,
        subject_id=asgn.subject_id,
        subject_code=subject.code,
        subject_name=subject.name,
        section_id=asgn.section_id,
        section_name=section.section_name,
        semester=section.semester,
        department_id=dept.id if dept else "",
        department_name=dept.name if dept else "",
        department_code=dept.code if dept else ""
    )


@router.put("/assignments/{asgn_id}", response_model=AssignmentDetailResponse)
def reassign_teacher_assignment(
    asgn_id: str,
    update_in: AssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    asgn = db.query(TeacherSubjectAssignment).filter(TeacherSubjectAssignment.id == asgn_id).first()
    if not asgn:
        raise HTTPException(status_code=404, detail="Assignment not found")

    new_teacher = db.query(TeacherProfile).filter(TeacherProfile.id == update_in.teacher_id).first()
    if not new_teacher:
        raise HTTPException(status_code=404, detail="New teacher profile not found")

    if not new_teacher.user or not new_teacher.user.is_active:
        raise HTTPException(status_code=400, detail="Cannot assign a deactivated teacher to a class")

    old_teacher_id = asgn.teacher_id
    asgn.teacher_id = update_in.teacher_id

    AuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action="ADMIN_REASSIGNED_ASSIGNMENT",
        entity_type="ASSIGNMENT",
        entity_id=asgn.id,
        details={
            "old_teacher_id": old_teacher_id,
            "new_teacher_id": new_teacher.id,
            "subject_id": asgn.subject_id,
            "section_id": asgn.section_id
        },
        commit=False
    )
    db.commit()
    db.refresh(asgn)

    sec = asgn.section
    dept = sec.department if sec else None
    return AssignmentDetailResponse(
        id=asgn.id,
        teacher_id=asgn.teacher_id,
        teacher_name=new_teacher.user.full_name if new_teacher.user else "",
        teacher_employee_id=new_teacher.employee_id,
        subject_id=asgn.subject_id,
        subject_code=asgn.subject.code if asgn.subject else "",
        subject_name=asgn.subject.name if asgn.subject else "",
        section_id=asgn.section_id,
        section_name=sec.section_name if sec else "",
        semester=sec.semester if sec else 0,
        department_id=dept.id if dept else "",
        department_name=dept.name if dept else "",
        department_code=dept.code if dept else ""
    )


@router.delete("/assignments/{asgn_id}")
def delete_assignment(
    asgn_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    asgn = db.query(TeacherSubjectAssignment).filter(TeacherSubjectAssignment.id == asgn_id).first()
    if not asgn:
        raise HTTPException(status_code=404, detail="Assignment not found")

    sub_id = asgn.subject_id
    sec_id = asgn.section_id
    t_id = asgn.teacher_id

    db.delete(asgn)
    AuditService.log_action(
        db=db,
        actor_id=current_user.id,
        action="ADMIN_DELETED_ASSIGNMENT",
        entity_type="ASSIGNMENT",
        entity_id=asgn_id,
        details={"teacher_id": t_id, "subject_id": sub_id, "section_id": sec_id},
        commit=False
    )
    db.commit()
    return {"detail": "Assignment removed successfully"}
