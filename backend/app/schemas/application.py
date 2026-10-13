from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from app.models.application import RequestType, ApplicationStatus
from app.models.approval import HODDecisionStatus


class DocumentResponse(BaseModel):
    id: str
    file_name: str
    storage_path: str
    file_type: str
    file_size_bytes: int
    signed_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ApplicationCreate(BaseModel):
    request_type: RequestType
    title: str
    reason: str
    start_date: date
    end_date: date


class HODApprovalResponseSchema(BaseModel):
    id: str
    hod_name: str
    status: HODDecisionStatus
    remarks: Optional[str] = None
    action_timestamp: datetime

    class Config:
        from_attributes = True


class TeacherAcknowledgementResponseSchema(BaseModel):
    id: str
    teacher_id: str
    teacher_name: str
    acknowledged_at: datetime

    class Config:
        from_attributes = True


class ApplicationResponse(BaseModel):
    id: str
    student_id: str
    student_name: str
    student_roll: str
    department_name: str
    section_label: str
    request_type: RequestType
    title: str
    reason: str
    start_date: date
    end_date: date
    status: ApplicationStatus
    created_at: datetime
    updated_at: datetime
    documents: List[DocumentResponse] = []
    hod_approval: Optional[HODApprovalResponseSchema] = None
    acknowledgements: List[TeacherAcknowledgementResponseSchema] = []
    is_acknowledged_by_current_teacher: Optional[bool] = False

    class Config:
        from_attributes = True
