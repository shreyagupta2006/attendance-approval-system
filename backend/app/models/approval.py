import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


class HODDecisionStatus(str, enum.Enum):
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class HODApproval(Base):
    __tablename__ = "hod_approvals"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), unique=True, nullable=False)
    hod_id = Column(String(36), ForeignKey("hods.id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum(HODDecisionStatus), nullable=False)
    remarks = Column(Text, nullable=True)
    action_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    application = relationship("Application", back_populates="hod_approval")
    hod = relationship("HODProfile", back_populates="approvals")


class TeacherAcknowledgement(Base):
    __tablename__ = "teacher_acknowledgements"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    teacher_id = Column(String(36), ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    acknowledged_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    application = relationship("Application", back_populates="acknowledgements")
    teacher = relationship("TeacherProfile", back_populates="acknowledgements")

    __table_args__ = (
        UniqueConstraint("application_id", "teacher_id", name="uix_app_teacher_ack"),
    )
