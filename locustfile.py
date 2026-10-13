from locust import HttpUser, task, between


class StudentUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        username = "chiku@gmail.com"
        password = "chiku123"

        response = self.client.post(
            "/api/v1/auth/login",
            data={
                "username": username,
                "password": password,
            },
            name="POST /auth/login",
        )

        if response.status_code != 200:
            print("Login failed:", response.status_code, response.text)
            return

        token = response.json()["access_token"]

        self.client.headers.update({
            "Authorization": f"Bearer {token}"
        })

    @task(3)
    def get_profile(self):
        self.client.get(
            "/api/v1/auth/me",
            name="GET /auth/me",
        )

    @task(3)
    def get_my_applications(self):
        self.client.get(
            "/api/v1/applications/my-applications",
            name="GET /applications/my-applications",
        )

    @task(2)
    def get_notifications(self):
        self.client.get(
            "/api/v1/notifications/",
            name="GET /notifications/",
        )