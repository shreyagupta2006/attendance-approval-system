def test_login_success(client):
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "rahul.kumar@student.edu", "password": "student123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_password(client):
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "rahul.kumar@student.edu", "password": "wrongpassword"}
    )
    assert response.status_code == 401
    assert "detail" in response.json()


def test_get_current_user_profile(client):
    # First login to get token
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "rahul.kumar@student.edu", "password": "student123"}
    )
    token = login_res.json()["access_token"]

    profile_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert profile_res.status_code == 200
    user_data = profile_res.json()
    assert user_data["email"] == "rahul.kumar@student.edu"
    assert user_data["role"] == "STUDENT"
    assert user_data["roll_number"] == "21CSE045"
