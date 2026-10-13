from pydantic import BaseModel
from typing import Optional
from app.models.approval import HODDecisionStatus


class HODActionRequest(BaseModel):
    decision: HODDecisionStatus
    remarks: Optional[str] = None
