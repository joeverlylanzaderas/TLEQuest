# backend/apps/notifications/utils.py
from apps.accounts.models import User
from .models import Notification


def notify(notification_type, title, message="", related_type="", related_id=None,
           recipient=None, recipient_id=None):
    """Create a notification. Pass either a User instance (recipient) or a
    raw pk (recipient_id) — useful in loops where you already have IDs
    and don't want an extra query per iteration to fetch the User first."""
    if recipient is None and recipient_id is None:
        raise ValueError("notify() requires either recipient or recipient_id.")

    return Notification.objects.create(
        recipient_id=recipient.id if recipient is not None else recipient_id,
        notification_type=notification_type,
        title=title,
        message=message,
        related_type=related_type,
        related_id=related_id,
    )