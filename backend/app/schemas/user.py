from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from app.models.user import UserRole


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole


class UserCreate(UserBase):
    password: str
    roll_number: Optional[str] = None      # Required if role == STUDENT
    employee_id: Optional[str] = None      # Required if role == TEACHER or HOD
    department_id: Optional[str] = None    # Required for TEACHER / HOD
    section_id: Optional[str] = None       # Required for STUDENT


class StudentRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    roll_number: str
    section_id: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[UserRole] = None


class UserResponse(UserBase):
    id: str
    is_active: bool
    created_at: datetime
    
    # Extended profile attributes
    roll_number: Optional[str] = None
    employee_id: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    section_id: Optional[str] = None
    section_label: Optional[str] = None
    semester: Optional[int] = None
    student_id: Optional[str] = None
    teacher_id: Optional[str] = None
    hod_id: Optional[str] = None

    class Config:
        from_attributes = True


class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    roll_number: Optional[str] = None
    section_id: Optional[str] = None


class TeacherUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    employee_id: Optional[str] = None
    department_id: Optional[str] = None


class HODUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    department_id: Optional[str] = None


class UserStatusUpdate(BaseModel):
    is_active: bool


class DerivedSubjectTeacher(BaseModel):
    assignment_id: str
    subject_id: str
    subject_code: str
    subject_name: str
    teacher_id: str
    teacher_name: str
    teacher_employee_id: str


class StudentDerivedCurriculumResponse(BaseModel):
    student_id: str
    user_id: str
    full_name: str
    email: str
    roll_number: str
    is_active: bool
    section_id: Optional[str] = None
    section_name: Optional[str] = None
    semester: Optional[int] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    curriculum_source: str = "Derived from Section Assignment"
    assigned_subjects: List[DerivedSubjectTeacher] = []


