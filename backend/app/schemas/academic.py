from pydantic import BaseModel
from typing import Optional, List


class DepartmentBase(BaseModel):
    name: str
    code: str


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentResponse(DepartmentBase):
    id: str

    class Config:
        from_attributes = True


class SectionBase(BaseModel):
    department_id: str
    semester: int
    section_name: str


class SectionCreate(SectionBase):
    pass


class SectionResponse(SectionBase):
    id: str
    department_name: Optional[str] = None
    department_code: Optional[str] = None

    class Config:
        from_attributes = True


class SubjectBase(BaseModel):
    code: str
    name: str
    department_id: str


class SubjectCreate(SubjectBase):
    pass


class SubjectResponse(SubjectBase):
    id: str
    department_name: Optional[str] = None

    class Config:
        from_attributes = True


class AssignmentCreate(BaseModel):
    teacher_id: str
    subject_id: str
    section_id: str


class AssignmentResponse(BaseModel):
    id: str
    teacher_id: str
    teacher_name: str
    subject_id: str
    subject_code: str
    subject_name: str
    section_id: str
    section_label: str

    class Config:
        from_attributes = True


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None


class SectionUpdate(BaseModel):
    department_id: Optional[str] = None
    semester: Optional[int] = None
    section_name: Optional[str] = None


class SubjectUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    department_id: Optional[str] = None


class AssignmentUpdate(BaseModel):
    teacher_id: str


class AssignmentDetailResponse(BaseModel):
    id: str
    teacher_id: str
    teacher_name: str
    teacher_employee_id: str
    subject_id: str
    subject_code: str
    subject_name: str
    section_id: str
    section_name: str
    semester: int
    department_id: str
    department_name: str
    department_code: str

    class Config:
        from_attributes = True


class DepartmentDetailResponse(DepartmentResponse):
    student_count: int = 0
    teacher_count: int = 0
    section_count: int = 0
    subject_count: int = 0
    hod_name: Optional[str] = None
    hod_id: Optional[str] = None


