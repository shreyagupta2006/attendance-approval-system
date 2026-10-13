from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class AdminDashboardStats(BaseModel):
    total_students: int
    total_teachers: int
    total_hods: int
    total_departments: int
    total_sections: int
    total_subjects: int
    total_teacher_assignments: int
    pending_hod_approvals: int
    applications_awaiting_teacher_ack: int
    total_unacknowledged_teacher_slots: int
    unassigned_section_warnings: int
    pending_attendance_corrections: int
