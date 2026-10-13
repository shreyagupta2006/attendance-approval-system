from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.academic import Department, Section, Subject, StudentProfile, TeacherProfile, HODProfile, TeacherSubjectAssignment


def init_db(db: Session):
    Base.metadata.create_all(bind=engine)

    # 1. Create Department
    cse_dept = db.query(Department).filter(Department.code == "CSE").first()
    if not cse_dept:
        cse_dept = Department(name="Computer Science & Engineering", code="CSE")
        db.add(cse_dept)
        db.commit()
        db.refresh(cse_dept)

    ece_dept = db.query(Department).filter(Department.code == "ECE").first()
    if not ece_dept:
        ece_dept = Department(name="Electronics & Communication Engineering", code="ECE")
        db.add(ece_dept)
        db.commit()
        db.refresh(ece_dept)

    # 2. Create Sections
    sec_a = db.query(Section).filter(Section.department_id == cse_dept.id, Section.semester == 5, Section.section_name == "A").first()
    if not sec_a:
        sec_a = Section(department_id=cse_dept.id, semester=5, section_name="A")
        db.add(sec_a)
        db.commit()
        db.refresh(sec_a)

    sec_b = db.query(Section).filter(Section.department_id == cse_dept.id, Section.semester == 5, Section.section_name == "B").first()
    if not sec_b:
        sec_b = Section(department_id=cse_dept.id, semester=5, section_name="B")
        db.add(sec_b)
        db.commit()
        db.refresh(sec_b)

    # 3. Create Subjects
    sub_dbms = db.query(Subject).filter(Subject.code == "CS501").first()
    if not sub_dbms:
        sub_dbms = Subject(code="CS501", name="Database Management Systems", department_id=cse_dept.id)
        db.add(sub_dbms)

    sub_web = db.query(Subject).filter(Subject.code == "CS502").first()
    if not sub_web:
        sub_web = Subject(code="CS502", name="Web Technologies & Frameworks", department_id=cse_dept.id)
        db.add(sub_web)

    db.commit()
    db.refresh(sub_dbms)
    db.refresh(sub_web)

    # 4. Create Admin User
    admin = db.query(User).filter(User.email == "admin@college.edu").first()
    if not admin:
        admin = User(
            email="admin@college.edu",
            hashed_password=get_password_hash("admin123"),
            full_name="System Administrator",
            role=UserRole.ADMIN
        )
        db.add(admin)

    # 5. Create HOD User (CSE Department)
    hod_user = db.query(User).filter(User.email == "hod.cse@college.edu").first()
    if not hod_user:
        hod_user = User(
            email="hod.cse@college.edu",
            hashed_password=get_password_hash("hod123"),
            full_name="Dr. Rajesh Gupta (HOD CSE)",
            role=UserRole.HOD
        )
        db.add(hod_user)
        db.commit()
        db.refresh(hod_user)

        hod_profile = HODProfile(user_id=hod_user.id, department_id=cse_dept.id)
        db.add(hod_profile)

    # 6. Create Teachers
    # Teacher 1: Prof. Sharma (Teaches DBMS in Sem 5 - Sec A)
    t1_user = db.query(User).filter(User.email == "prof.sharma@college.edu").first()
    if not t1_user:
        t1_user = User(
            email="prof.sharma@college.edu",
            hashed_password=get_password_hash("teacher123"),
            full_name="Prof. Amit Sharma",
            role=UserRole.TEACHER
        )
        db.add(t1_user)
        db.commit()
        db.refresh(t1_user)

        t1_profile = TeacherProfile(user_id=t1_user.id, employee_id="EMP-CSE-001", department_id=cse_dept.id)
        db.add(t1_profile)
        db.commit()
        db.refresh(t1_profile)

        # Assign to DBMS in Sec A
        asgn1 = TeacherSubjectAssignment(teacher_id=t1_profile.id, subject_id=sub_dbms.id, section_id=sec_a.id)
        db.add(asgn1)

    # Teacher 2: Prof. Verma (Teaches Web Tech in Sem 5 - Sec A)
    t2_user = db.query(User).filter(User.email == "prof.verma@college.edu").first()
    if not t2_user:
        t2_user = User(
            email="prof.verma@college.edu",
            hashed_password=get_password_hash("teacher123"),
            full_name="Prof. Priya Verma",
            role=UserRole.TEACHER
        )
        db.add(t2_user)
        db.commit()
        db.refresh(t2_user)

        t2_profile = TeacherProfile(user_id=t2_user.id, employee_id="EMP-CSE-002", department_id=cse_dept.id)
        db.add(t2_profile)
        db.commit()
        db.refresh(t2_profile)

        # Assign to Web Tech in Sec A
        asgn2 = TeacherSubjectAssignment(teacher_id=t2_profile.id, subject_id=sub_web.id, section_id=sec_a.id)
        db.add(asgn2)

    # Teacher 3: Prof. Unassigned (Assigned ONLY to Section B, for testing security isolation)
    t3_user = db.query(User).filter(User.email == "prof.unassigned@college.edu").first()
    if not t3_user:
        t3_user = User(
            email="prof.unassigned@college.edu",
            hashed_password=get_password_hash("teacher123"),
            full_name="Prof. Unassigned (Sec B)",
            role=UserRole.TEACHER
        )
        db.add(t3_user)
        db.commit()
        db.refresh(t3_user)

        t3_profile = TeacherProfile(user_id=t3_user.id, employee_id="EMP-CSE-003", department_id=cse_dept.id)
        db.add(t3_profile)
        db.commit()
        db.refresh(t3_profile)

        asgn3 = TeacherSubjectAssignment(teacher_id=t3_profile.id, subject_id=sub_dbms.id, section_id=sec_b.id)
        db.add(asgn3)

    # 7. Create Students
    # Student 1: Rahul Kumar (Sem 5 - Sec A)
    s1_user = db.query(User).filter(User.email == "rahul.kumar@student.edu").first()
    if not s1_user:
        s1_user = User(
            email="rahul.kumar@student.edu",
            hashed_password=get_password_hash("student123"),
            full_name="Rahul Kumar",
            role=UserRole.STUDENT
        )
        db.add(s1_user)
        db.commit()
        db.refresh(s1_user)

        s1_profile = StudentProfile(user_id=s1_user.id, roll_number="21CSE045", section_id=sec_a.id)
        db.add(s1_profile)

    # Student 2: Ananya Singh (Sem 5 - Sec A)
    s2_user = db.query(User).filter(User.email == "ananya.singh@student.edu").first()
    if not s2_user:
        s2_user = User(
            email="ananya.singh@student.edu",
            hashed_password=get_password_hash("student123"),
            full_name="Ananya Singh",
            role=UserRole.STUDENT
        )
        db.add(s2_user)
        db.commit()
        db.refresh(s2_user)

        s2_profile = StudentProfile(user_id=s2_user.id, roll_number="21CSE012", section_id=sec_a.id)
        db.add(s2_profile)

    db.commit()
    print("Database seeding completed successfully.")


if __name__ == "__main__":
    db = SessionLocal()
    init_db(db)
    db.close()
