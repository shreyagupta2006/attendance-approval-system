import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, Date, DateTime, Enum, ForeignKey, Integer
from sqlalchemy.orm import relationship
from app.core.database import Base


class CorrectionStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class AttendanceCorrection(Base):
    __tablename__ = "attendance_corrections"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    teacher_id = Column(String(36), ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    date_of_absence = Column(Date, nullable=False)
    reason = Column(Text, nullable=False)
    proof_document_path = Column(String(500), nullable=True)  # Supabase key
    status = Column(Enum(CorrectionStatus), default=CorrectionStatus.PENDING, nullable=False, index=True)
    teacher_remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    student = relationship("StudentProfile", back_populates="attendance_corrections")
    teacher = relationship("TeacherProfile", back_populates="attendance_corrections")
    subject = relationship("Subject", back_populates="attendance_corrections")
