import os
import urllib.parse
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import Base, get_db
from app.db.init_db import init_db

# Use PostgreSQL test database strictly - SQLite is disabled across the entire app
TEST_DB_PASSWORD = urllib.parse.quote_plus("Postgres@123")
POSTGRES_TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    f"postgresql+psycopg2://postgres:{TEST_DB_PASSWORD}@localhost:5432/attendance_approval_test"
)

engine = create_engine(POSTGRES_TEST_DATABASE_URL, pool_pre_ping=True)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="module")
def db_session():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    init_db(db)
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="module")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def mock_supabase_storage_for_tests(monkeypatch):
    async def mock_upload_binary(content: bytes, storage_path: str, content_type: str):
        return storage_path, len(content)

    def mock_get_signed_url(storage_path: str, expires_in_seconds: int = 3600):
        return f"https://mock-supabase.supabase.co/storage/v1/object/sign/{storage_path}"

    def mock_delete_document(storage_path: str):
        return True

    monkeypatch.setattr("app.services.storage.StorageService.upload_document_binary", mock_upload_binary)
    monkeypatch.setattr("app.services.storage.StorageService.get_signed_url", mock_get_signed_url)
    monkeypatch.setattr("app.services.storage.StorageService.delete_document", mock_delete_document)

