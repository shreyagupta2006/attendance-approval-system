import json
import logging
from typing import Any, Optional
from sqlalchemy.orm import Session
from app.models.audit import AuditLog

logger = logging.getLogger("audit")


class AuditService:
    @staticmethod
    def log_action(
        db: Session,
        actor_id: Optional[str],
        action: str,
        entity_type: str,
        entity_id: str,
        details: Optional[Any] = None,
        ip_address: Optional[str] = None,
        commit: bool = True
    ) -> AuditLog:
        details_str = None
        if details is not None:
            if isinstance(details, (dict, list)):
                details_str = json.dumps(details)
            else:
                details_str = str(details)

        audit = AuditLog(
            actor_id=actor_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details_str,
            ip_address=ip_address
        )
        db.add(audit)
        if commit:
            db.commit()
            db.refresh(audit)
        else:
            db.flush()
        return audit

