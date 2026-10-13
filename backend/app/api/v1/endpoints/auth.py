from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.dependencies.auth import get_current_user
from app.models.user import User, UserRole
from app.models.academic import StudentProfile, Section
from app.schemas.user import Token, UserResponse, StudentRegister
from app.schemas.academic import SectionResponse

router = APIRouter()


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    access_token = create_access_token(data={"sub": user.id, "role": user.role.value})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register-student", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_student(user_in: StudentRegister, db: Session = Depends(get_db)):
    # Public registration strictly creates STUDENT accounts only
    existing_email = db.query(User).filter(User.email == user_in.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    existing_roll = db.query(StudentProfile).filter(StudentProfile.roll_number == user_in.roll_number).first()
    if existing_roll:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A student with this roll number already exists."
        )

    # 1. Create user in PostgreSQL users table
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=UserRole.STUDENT,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # 2. Create student profile in PostgreSQL students table
    student = StudentProfile(
        user_id=user.id,
        roll_number=user_in.roll_number,
        section_id=user_in.section_id
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    # Return structured user response
    resp = UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        student_id=student.id,
        roll_number=student.roll_number,
        section_id=student.section_id
    )
    if student.section:
        sec = student.section
        resp.section_label = f"Sem {sec.semester} - Section {sec.section_name}"
        if sec.department:
            resp.department_id = sec.department.id
            resp.department_name = sec.department.name

    return resp


@router.get("/public/sections", response_model=List[SectionResponse])
def get_public_sections(db: Session = Depends(get_db)):
    """Public unauthenticated endpoint to list sections for student registration dropdown"""
    sections = db.query(Section).all()
    results = []
    for s in sections:
        results.append(SectionResponse(
            id=s.id,
            department_id=s.department_id,
            semester=s.semester,
            section_name=s.section_name,
            department_name=s.department.name if s.department else None,
            department_code=s.department.code if s.department else None
        ))
    return results


@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    resp = UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at
    )
    
    # Populate profile details
    if current_user.student_profile:
        resp.student_id = current_user.student_profile.id
        resp.roll_number = current_user.student_profile.roll_number
        if current_user.student_profile.section:
            sec = current_user.student_profile.section
            resp.section_id = sec.id
            resp.section_label = f"Sem {sec.semester} - Section {sec.section_name}"
            if sec.department:
                resp.department_id = sec.department.id
                resp.department_name = sec.department.name
                
    elif current_user.teacher_profile:
        resp.teacher_id = current_user.teacher_profile.id
        resp.employee_id = current_user.teacher_profile.employee_id
        if current_user.teacher_profile.department:
            resp.department_id = current_user.teacher_profile.department.id
            resp.department_name = current_user.teacher_profile.department.name

    elif current_user.hod_profile:
        resp.hod_id = current_user.hod_profile.id
        if current_user.hod_profile.department:
            resp.department_id = current_user.hod_profile.department.id
            resp.department_name = current_user.hod_profile.department.name
            
    return resp
