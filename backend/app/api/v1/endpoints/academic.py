from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.academic import Department, Section, Subject, TeacherSubjectAssignment
from app.models.user import User
from app.schemas.academic import DepartmentResponse, SectionResponse, SubjectResponse, AssignmentResponse

router = APIRouter()


@router.get("/departments", response_model=List[DepartmentResponse])
def get_departments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Department).all()


@router.get("/sections", response_model=List[SectionResponse])
def get_sections(department_id: str = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Section)
    if department_id:
        query = query.filter(Section.department_id == department_id)
    
    sections = query.all()
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


@router.get("/subjects", response_model=List[SubjectResponse])
def get_subjects(department_id: str = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Subject)
    if department_id:
        query = query.filter(Subject.department_id == department_id)
    
    subjects = query.all()
    results = []
    for sub in subjects:
        results.append(SubjectResponse(
            id=sub.id,
            code=sub.code,
            name=sub.name,
            department_id=sub.department_id,
            department_name=sub.department.name if sub.department else None
        ))
    return results


@router.get("/assignments", response_model=List[AssignmentResponse])
def get_teacher_assignments(teacher_id: str = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(TeacherSubjectAssignment)
    if teacher_id:
        query = query.filter(TeacherSubjectAssignment.teacher_id == teacher_id)
        
    assignments = query.all()
    results = []
    for a in assignments:
        sec_label = f"Sem {a.section.semester} - Section {a.section.section_name}" if a.section else ""
        results.append(AssignmentResponse(
            id=a.id,
            teacher_id=a.teacher_id,
            teacher_name=a.teacher.user.full_name if a.teacher and a.teacher.user else "",
            subject_id=a.subject_id,
            subject_code=a.subject.code if a.subject else "",
            subject_name=a.subject.name if a.subject else "",
            section_id=a.section_id,
            section_label=sec_label
        ))
    return results
