import re
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Enforce PostgreSQL - SQLite is strictly prohibited
if "sqlite" in settings.DATABASE_URL.lower():
    raise ValueError(
        "SQLite is strictly disabled for this application. "
        "Please provide a valid PostgreSQL DATABASE_URL in .env"
    )

# Get URL for synchronous SQLAlchemy engine (psycopg2 driver)
sync_db_url = settings.DATABASE_URL
if sync_db_url.startswith("postgresql+asyncpg://"):
    sync_db_url = sync_db_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
elif sync_db_url.startswith("postgresql://"):
    sync_db_url = sync_db_url.replace("postgresql://", "postgresql+psycopg2://")

engine = create_engine(
    sync_db_url,
    pool_size=20,
    max_overflow=20,
    pool_timeout=10.0,
    pool_pre_ping=True,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
