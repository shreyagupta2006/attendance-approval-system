from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "Attendance Approval System"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "super-secret-jwt-key-change-this-in-production-attendance-system"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # PostgreSQL Database URL
    DATABASE_URL: str = "postgresql+asyncpg://postgres:Postgres%40123@localhost:5432/attendance_approval"

    # Supabase Storage Configuration
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    SUPABASE_BUCKET: str = "attendance-documents"

    ENVIRONMENT: str = "development"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
