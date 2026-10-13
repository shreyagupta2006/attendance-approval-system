import io


def get_token(client, username, password):
    res = client.post("/api/v1/auth/login", data={"username": username, "password": password})
    return res.json()["access_token"]


def test_full_application_and_teacher_isolation(client):
    # 1. Login Student (Rahul)
    student_token = get_token(client, "rahul.kumar@student.edu", "student123")
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # Submit Application
    pdf_content = b"%PDF-1.4 Mock Application Document Content"
    file_data = {"document": ("medical_cert.pdf", io.BytesIO(pdf_content), "application/pdf")}
    form_data = {
        "request_type": "MEDICAL_LEAVE",
        "title": "Fever Leave Request",
        "reason": "Severe fever for 2 days",
        "start_date": "2026-10-01",
        "end_date": "2026-10-03"
    }

    sub_res = client.post("/api/v1/applications/", data=form_data, files=file_data, headers=student_headers)
    assert sub_res.status_code == 200
    app_data = sub_res.json()
    app_id = app_data["id"]
    assert app_data["status"] == "SUBMITTED"

    # 2. Login Teacher 1 (Prof. Sharma - Assigned to Sec A) & try to view BEFORE HOD Approval
    t1_token = get_token(client, "prof.sharma@college.edu", "teacher123")
    t1_headers = {"Authorization": f"Bearer {t1_token}"}

    t1_approved_feed = client.get("/api/v1/teacher/applications/approved", headers=t1_headers)
    assert t1_approved_feed.status_code == 200
    # Must NOT contain the unapproved application!
    app_ids_in_feed = [a["id"] for a in t1_approved_feed.json()]
    assert app_id not in app_ids_in_feed

    # Direct access by Application ID must fail with 403 Forbidden!
    t1_direct_res = client.get(f"/api/v1/teacher/applications/{app_id}", headers=t1_headers)
    assert t1_direct_res.status_code == 403
    assert "Teachers are not permitted to view applications until they are officially approved by HOD" in t1_direct_res.json()["detail"]

    # 3. Login HOD (CSE Dept) & Approve Application
    hod_token = get_token(client, "hod.cse@college.edu", "hod123")
    hod_headers = {"Authorization": f"Bearer {hod_token}"}

    pending_res = client.get("/api/v1/hod/applications/pending", headers=hod_headers)
    assert pending_res.status_code == 200
    pending_apps = pending_res.json()
    assert any(a["id"] == app_id for a in pending_apps)

    review_res = client.post(
        f"/api/v1/hod/applications/{app_id}/review",
        json={"decision": "APPROVED", "remarks": "Approved by HOD"},
        headers=hod_headers
    )
    assert review_res.status_code == 200
    assert review_res.json()["status"] == "APPROVED_BY_HOD"

    # 4. Now Teacher 1 (Prof. Sharma - Assigned to Sec A) SHOULD see it & acknowledge
    t1_approved_feed = client.get("/api/v1/teacher/applications/approved", headers=t1_headers)
    assert t1_approved_feed.status_code == 200
    assert any(a["id"] == app_id for a in t1_approved_feed.json())

    ack_res = client.post(f"/api/v1/teacher/applications/{app_id}/acknowledge", headers=t1_headers)
    assert ack_res.status_code == 200
    assert len(ack_res.json()["acknowledgements"]) == 1

    # 5. Teacher 3 (Prof. Unassigned - Assigned ONLY to Sec B) MUST STILL BE DENIED ACCESS!
    t3_token = get_token(client, "prof.unassigned@college.edu", "teacher123")
    t3_headers = {"Authorization": f"Bearer {t3_token}"}

    t3_direct_res = client.get(f"/api/v1/teacher/applications/{app_id}", headers=t3_headers)
    assert t3_direct_res.status_code == 403
    assert "You are not an assigned teacher for this student's class section" in t3_direct_res.json()["detail"]


def test_attendance_correction_bypasses_hod(client):
    student_token = get_token(client, "rahul.kumar@student.edu", "student123")
    student_headers = {"Authorization": f"Bearer {student_token}"}

    t1_token = get_token(client, "prof.sharma@college.edu", "teacher123")
    t1_headers = {"Authorization": f"Bearer {t1_token}"}

    # Get teacher ID & subject ID
    t1_profile = client.get("/api/v1/auth/me", headers=t1_headers).json()
    teacher_id = t1_profile["teacher_id"]

    subjects_res = client.get("/api/v1/academic/subjects", headers=student_headers)
    subject_id = subjects_res.json()[0]["id"]

    # Submit Attendance Correction directly to Teacher
    form_data = {
        "teacher_id": teacher_id,
        "subject_id": subject_id,
        "date_of_absence": "2026-09-20",
        "reason": "Marked absent by mistake while present"
    }
    corr_res = client.post("/api/v1/corrections/", data=form_data, headers=student_headers)
    assert corr_res.status_code == 200
    corr_data = corr_res.json()
    corr_id = corr_data["id"]
    assert corr_data["status"] == "PENDING"

    # Teacher reviews pending corrections directly
    t_pending = client.get("/api/v1/corrections/teacher/pending", headers=t1_headers)
    assert t_pending.status_code == 200
    assert any(c["id"] == corr_id for c in t_pending.json())

    # Teacher approves correction
    rev_res = client.post(
        f"/api/v1/corrections/{corr_id}/review",
        json={"status": "APPROVED", "teacher_remarks": "Verified attendance register"},
        headers=t1_headers
    )
    assert rev_res.status_code == 200
    assert rev_res.json()["status"] == "APPROVED"
