from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, academic, applications, hod, teacher, corrections, notifications, audit, admin
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(academic.router, prefix="/academic", tags=["academic"])
api_router.include_router(applications.router, prefix="/applications", tags=["applications"])
api_router.include_router(hod.router, prefix="/hod", tags=["hod"])
api_router.include_router(teacher.router, prefix="/teacher", tags=["teacher"])
api_router.include_router(corrections.router, prefix="/corrections", tags=["corrections"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
