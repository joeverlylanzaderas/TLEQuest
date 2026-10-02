# backend/apps/notifications/models.py
from django.db import models
from django.conf import settings
from apps.core.models import TimestampedModel


class Notification(TimestampedModel):
    class NotificationType(models.TextChoices):
        NEW_SUBMISSION = "new_submission", "New Submission"           # → teacher
        QUEST_ASSIGNED = "quest_assigned", "Quest Assigned"            # → student
        SUBMISSION_FEEDBACK = "submission_feedback", "Submission Feedback"  # → student

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    notification_type = models.CharField(max_length=30, choices=NotificationType.choices)
    title = models.CharField(max_length=150)
    message = models.TextField(blank=True)

    # Generic-ish pointer back to whatever triggered this, without a full
    # GenericForeignKey — simpler to query/serialize, at the cost of the
    # frontend needing to know which endpoint to hit based on related_type.
    related_type = models.CharField(max_length=30, blank=True)  # "submission", "quest_assignment", etc.
    related_id = models.PositiveIntegerField(null=True, blank=True)

    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.recipient.username} — {self.title}"