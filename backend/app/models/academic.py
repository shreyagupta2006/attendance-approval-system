import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), unique=True, nullable=False)
    code = Column(String(50), unique=True, nullable=False)

    sections = relationship("Section", back_populates="department", cascade="all, delete-orphan")
    subjects = relationship("Subject", back_populates="department", cascade="all, delete-orphan")
    teachers = relationship("TeacherProfile", back_populates="department")
    hod = relationship("HODProfile", back_populates="department", uselist=False)


class Section(Base):
    __tablename__ = "sections"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    department_id = Column(String(36), ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    semester = Column(Integer, nullable=False)
    section_name = Column(String(50), nullable=False)  # e.g., "A", "B"

    department = relationship("Department", back_populates="sections")
    students = relationship("StudentProfile", back_populates="section")
    teacher_assignments = relationship("TeacherSubjectAssignment", back_populates="section", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("department_id", "semester", "section_name", name="uix_section_dept_sem_name"),
    )


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    department_id = Column(String(36), ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)

    department = relationship("Department", back_populates="subjects")
    teacher_assignments = relationship("TeacherSubjectAssignment", back_populates="subject", cascade="all, delete-orphan")
    attendance_corrections = relationship("AttendanceCorrection", back_populates="subject")


class StudentProfile(Base):
    __tablename__ = "students"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    roll_number = Column(String(100), unique=True, nullable=False, index=True)
    section_id = Column(String(36), ForeignKey("sections.id", ondelete="SET NULL"), nullable=True)

    user = relationship("User", back_populates="student_profile")
    section = relationship("Section", back_populates="students")
    applications = relationship("Application", back_populates="student", cascade="all, delete-orphan")
    attendance_corrections = relationship("AttendanceCorrection", back_populates="student", cascade="all, delete-orphan")


class TeacherProfile(Base):
    __tablename__ = "teachers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    employee_id = Column(String(100), unique=True, nullable=False)
    department_id = Column(String(36), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)

    user = relationship("User", back_populates="teacher_profile")
    department = relationship("Department", back_populates="teachers")
    assignments = relationship("TeacherSubjectAssignment", back_populates="teacher", cascade="all, delete-orphan")
    acknowledgements = relationship("TeacherAcknowledgement", back_populates="teacher")
    attendance_corrections = relationship("AttendanceCorrection", back_populates="teacher")


class HODProfile(Base):
    __tablename__ = "hods"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    department_id = Column(String(36), ForeignKey("departments.id", ondelete="CASCADE"), unique=True, nullable=False)

    user = relationship("User", back_populates="hod_profile")
    department = relationship("Department", back_populates="hod")
    approvals = relationship("HODApproval", back_populates="hod")


class TeacherSubjectAssignment(Base):
    """Maps a teacher to teach a subject for a specific department section"""
    __tablename__ = "teacher_subject_assignments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    teacher_id = Column(String(36), ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    section_id = Column(String(36), ForeignKey("sections.id", ondelete="CASCADE"), nullable=False)

    teacher = relationship("TeacherProfile", back_populates="assignments")
    subject = relationship("Subject", back_populates="teacher_assignments")
    section = relationship("Section", back_populates="teacher_assignments")

    __table_args__ = (
        UniqueConstraint("teacher_id", "subject_id", "section_id", name="uix_teacher_sub_section"),
    )
