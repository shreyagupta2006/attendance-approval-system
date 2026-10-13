import logging
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.notification import Notification

logger = logging.getLogger("notification")


class NotificationService:
    @staticmethod
    def create_notification(
        db: Session,
        user_id: str,
        title: str,
        message: str,
        link: Optional[str] = None,
        commit: bool = True
    ) -> Notification:
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            link=link
        )
        db.add(notification)
        if commit:
            db.commit()
            db.refresh(notification)
        else:
            db.flush()
        return notification

    @staticmethod
    def notify_multiple_users(
        db: Session,
        user_ids: List[str],
        title: str,
        message: str,
        link: Optional[str] = None,
        commit: bool = True
    ):
        for uid in user_ids:
            notification = Notification(
                user_id=uid,
                title=title,
                message=message,
                link=link
            )
            db.add(notification)
        if commit:
            db.commit()
        else:
            db.flush()

