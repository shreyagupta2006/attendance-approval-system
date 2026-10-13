import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, Date, DateTime, Enum, ForeignKey, Integer
from sqlalchemy.orm import relationship
from app.core.database import Base


class RequestType(str, enum.Enum):
    MEDICAL_LEAVE = "MEDICAL_LEAVE"
    ATTENDANCE_CORRECTION = "ATTENDANCE_CORRECTION"
    EVENT_PERMISSION = "EVENT_PERMISSION"
    COLLEGE_ACTIVITY = "COLLEGE_ACTIVITY"
    EMERGENCY_LEAVE = "EMERGENCY_LEAVE"
    OTHER = "OTHER"


class ApplicationStatus(str, enum.Enum):
    SUBMITTED = "SUBMITTED"
    APPROVED_BY_HOD = "APPROVED_BY_HOD"
    REJECTED_BY_HOD = "REJECTED_BY_HOD"


class Application(Base):
    __tablename__ = "applications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    request_type = Column(Enum(RequestType), nullable=False)
    title = Column(String(255), nullable=False)
    reason = Column(Text, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.SUBMITTED, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    student = relationship("StudentProfile", back_populates="applications")
    documents = relationship("ApplicationDocument", back_populates="application", cascade="all, delete-orphan")
    hod_approval = relationship("HODApproval", back_populates="application", uselist=False, cascade="all, delete-orphan")
    acknowledgements = relationship("TeacherAcknowledgement", back_populates="application", cascade="all, delete-orphan")


class ApplicationDocument(Base):
    __tablename__ = "application_documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String(255), nullable=False)
    storage_path = Column(String(500), nullable=False)  # Key inside Supabase Storage bucket
    file_type = Column(String(100), nullable=False)     # e.g., application/pdf, image/jpeg
    file_size_bytes = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    application = relationship("Application", back_populates="documents")
