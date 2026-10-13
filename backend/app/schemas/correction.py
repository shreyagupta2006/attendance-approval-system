from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from app.models.correction import CorrectionStatus


class CorrectionCreate(BaseModel):
    teacher_id: str
    subject_id: str
    date_of_absence: date
    reason: str


class CorrectionAction(BaseModel):
    status: CorrectionStatus  # APPROVED or REJECTED
    teacher_remarks: Optional[str] = None


class CorrectionResponse(BaseModel):
    id: str
    student_id: str
    student_name: str
    student_roll: str
    teacher_id: str
    teacher_name: str
    subject_id: str
    subject_code: str
    subject_name: str
    date_of_absence: date
    reason: str
    proof_document_path: Optional[str] = None
    proof_signed_url: Optional[str] = None
    status: CorrectionStatus
    teacher_remarks: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
