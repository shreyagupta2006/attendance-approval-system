import pytest


def get_token(client, username, password):
    res = client.post("/api/v1/auth/login", data={"username": username, "password": password})
    assert res.status_code == 200, f"Login failed for {username}: {res.text}"
    return res.json()["access_token"]


def test_admin_auth_guards(client):
    # Non-admin roles must be blocked with 403 Forbidden
    student_token = get_token(client, "rahul.kumar@student.edu", "student123")
    teacher_token = get_token(client, "prof.sharma@college.edu", "teacher123")
    hod_token = get_token(client, "hod.cse@college.edu", "hod123")

    for token in [student_token, teacher_token, hod_token]:
        headers = {"Authorization": f"Bearer {token}"}
        res = client.get("/api/v1/admin/stats", headers=headers)
        assert res.status_code == 403
        assert "Operation not permitted" in res.json()["detail"]

    # Admin role must succeed
    admin_token = get_token(client, "admin@college.edu", "admin123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    admin_res = client.get("/api/v1/admin/stats", headers=admin_headers)
    assert admin_res.status_code == 200
    stats = admin_res.json()
    assert "total_students" in stats
    assert "pending_hod_approvals" in stats
    assert "unassigned_section_warnings" in stats


def test_student_lifecycle_and_deactivation(client):
    admin_token = get_token(client, "admin@college.edu", "admin123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create a student
    student_email = "lifecycle.student@college.edu"
    student_roll = "ROLL-LIFE-99"
    create_res = client.post(
        "/api/v1/admin/students",
        json={
            "full_name": "Lifecycle Test Student",
            "email": student_email,
            "password": "lifepassword123",
            "role": "STUDENT",
            "roll_number": student_roll
        },
        headers=admin_headers
    )
    assert create_res.status_code == 200
    student_data = create_res.json()
    user_id = student_data["id"]

    # 2. Student logs in
    student_token = get_token(client, student_email, "lifepassword123")
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # Student accesses profile
    me_res = client.get("/api/v1/auth/me", headers=student_headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == student_email

    # 3. Admin deactivates student
    deact_res = client.patch(
        f"/api/v1/admin/users/{user_id}/status",
        json={"is_active": False},
        headers=admin_headers
    )
    assert deact_res.status_code == 200
    assert deact_res.json()["is_active"] is False

    # 4. Immediate token revocation: subsequent request with existing token is rejected
    revoked_res = client.get("/api/v1/auth/me", headers=student_headers)
    assert revoked_res.status_code == 403
    assert "User account is deactivated" in revoked_res.json()["detail"]

    # 5. Subsequent login attempt is rejected
    login_fail_res = client.post(
        "/api/v1/auth/login",
        data={"username": student_email, "password": "lifepassword123"}
    )
    assert login_fail_res.status_code == 403
    assert "User account is deactivated" in login_fail_res.json()["detail"]

    # 6. Admin reactivates student
    react_res = client.patch(
        f"/api/v1/admin/users/{user_id}/status",
        json={"is_active": True},
        headers=admin_headers
    )
    assert react_res.status_code == 200
    assert react_res.json()["is_active"] is True

    # 7. Student can log in again
    new_token = get_token(client, student_email, "lifepassword123")
    assert new_token is not None


def test_deletion_dependency_guards(client):
    admin_token = get_token(client, "admin@college.edu", "admin123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Find Rahul Kumar's student profile
    students = client.get("/api/v1/admin/students", headers=admin_headers).json()
    rahul = next((s for s in students if s["email"] == "rahul.kumar@student.edu"), None)
    assert rahul is not None

    # Submit an application for Rahul so he has historical records
    import io
    rahul_token = get_token(client, "rahul.kumar@student.edu", "student123")
    pdf_content = b"%PDF-1.4 Mock Application Document Content"
    file_data = {"document": ("medical_cert.pdf", io.BytesIO(pdf_content), "application/pdf")}
    form_data = {
        "request_type": "MEDICAL_LEAVE",
        "title": "Fever Leave Request",
        "reason": "Severe fever for 2 days",
        "start_date": "2026-10-01",
        "end_date": "2026-10-03"
    }
    client.post("/api/v1/applications/", data=form_data, files=file_data, headers={"Authorization": f"Bearer {rahul_token}"})

    # Attempt hard delete on Rahul Kumar must fail with 400 Bad Request
    del_student_res = client.delete(f"/api/v1/admin/students/{rahul['student_id']}", headers=admin_headers)
    assert del_student_res.status_code == 400
    assert "Cannot delete student with historical leave applications" in del_student_res.json()["detail"]

    # Find Prof. Amit Sharma (has existing assignments and acknowledgements)
    teachers = client.get("/api/v1/admin/teachers", headers=admin_headers).json()
    sharma = next((t for t in teachers if t["email"] == "prof.sharma@college.edu"), None)
    assert sharma is not None

    del_teacher_res = client.delete(f"/api/v1/admin/teachers/{sharma['teacher_id']}", headers=admin_headers)
    assert del_teacher_res.status_code == 400
    assert "Cannot delete teacher with existing class assignments" in del_teacher_res.json()["detail"]

    # Find CSE department (has sections and subjects)
    depts = client.get("/api/v1/admin/departments", headers=admin_headers).json()
    cse = next((d for d in depts if d["code"] == "CSE"), None)
    assert cse is not None

    del_dept_res = client.delete(f"/api/v1/admin/departments/{cse['id']}", headers=admin_headers)
    assert del_dept_res.status_code == 400
    assert "Cannot delete department with active dependencies" in del_dept_res.json()["detail"]


def test_academic_assignment_and_reassignment_rules(client):
    admin_token = get_token(client, "admin@college.edu", "admin123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    asgns = client.get("/api/v1/admin/assignments", headers=admin_headers).json()
    assert len(asgns) > 0
    first_asgn = asgns[0]

    # Attempt to create duplicate assignment for same subject and section
    dup_res = client.post(
        "/api/v1/admin/assignments",
        json={
            "teacher_id": first_asgn["teacher_id"],
            "subject_id": first_asgn["subject_id"],
            "section_id": first_asgn["section_id"]
        },
        headers=admin_headers
    )
    assert dup_res.status_code == 400
    assert "already assigned" in dup_res.json()["detail"]

    # Test Reassignment: get all teachers to find an alternate teacher
    teachers = client.get("/api/v1/admin/teachers", headers=admin_headers).json()
    alt_teacher = next((t for t in teachers if t["teacher_id"] != first_asgn["teacher_id"]), None)
    assert alt_teacher is not None

    reassign_res = client.put(
        f"/api/v1/admin/assignments/{first_asgn['id']}",
        json={"teacher_id": alt_teacher["teacher_id"]},
        headers=admin_headers
    )
    assert reassign_res.status_code == 200
    assert reassign_res.json()["teacher_id"] == alt_teacher["teacher_id"]


def test_derived_curriculum_endpoint(client):
    admin_token = get_token(client, "admin@college.edu", "admin123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    students = client.get("/api/v1/admin/students", headers=admin_headers).json()
    student = next((s for s in students if s["section_id"] is not None), None)
    assert student is not None

    curr_res = client.get(
        f"/api/v1/admin/students/{student['student_id']}/derived-curriculum",
        headers=admin_headers
    )
    assert curr_res.status_code == 200
    curr_data = curr_res.json()
    assert "curriculum_source" in curr_data
    assert "assigned_subjects" in curr_data
    assert isinstance(curr_data["assigned_subjects"], list)


def test_admin_self_deactivation_prevention(client):
    admin_token = get_token(client, "admin@college.edu", "admin123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    me_res = client.get("/api/v1/auth/me", headers=admin_headers)
    assert me_res.status_code == 200
    admin_user_id = me_res.json()["id"]

    # Administrator cannot deactivate their own account
    deact_self_res = client.patch(
        f"/api/v1/admin/users/{admin_user_id}/status",
        json={"is_active": False},
        headers=admin_headers
    )
    assert deact_self_res.status_code == 400
    assert "cannot deactivate their own account" in deact_self_res.json()["detail"]


def test_audit_log_retrieval_and_sanitization(client):
    admin_token = get_token(client, "admin@college.edu", "admin123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    logs_res = client.get("/api/v1/audit/", headers=admin_headers)
    assert logs_res.status_code == 200
    logs = logs_res.json()
    assert isinstance(logs, list)

    # Verify no passwords or tokens exist in any audit logs
    for log in logs:
        details_str = str(log.get("details", "")).lower()
        assert "password" not in details_str
        assert "token" not in details_str
        assert "secret" not in details_str


def test_admin_users_list_endpoint(client):
    admin_token = get_token(client, "admin@college.edu", "admin123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    users_res = client.get("/api/v1/admin/users", headers=admin_headers)
    assert users_res.status_code == 200
    users = users_res.json()
    assert isinstance(users, list)
    assert len(users) > 0
    roles = {u["role"] for u in users}
    assert "ADMIN" in roles
    assert "STUDENT" in roles

