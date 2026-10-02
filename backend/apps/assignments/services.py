# apps/assignments/services.py (new file)
from django.utils import timezone
from apps.notifications.utils import notify
from apps.notifications.models import Notification
from .models import QuestAssignment, QuestProgress


def sync_progress_for_new_group_member(group, student):
    """Catches up a newly added group member on any quests already
    assigned to that group — mirrors AssignQuestView's per-member logic,
    including the QUEST_ASSIGNED notification, just triggered by group
    membership instead of the original bulk assignment."""
    assignments = QuestAssignment.objects.filter(group=group).select_related("quest")
    for assignment in assignments:
        first_step = assignment.quest.steps.order_by("step_order").first()
        progress, created = QuestProgress.objects.get_or_create(
            quest_assignment=assignment,
            student=student,
            defaults={
                "group": group,
                "current_step": first_step,
                "started_at": timezone.now(),
            },
        )
        if created:
            notify(
                recipient=student,
                notification_type=Notification.NotificationType.QUEST_ASSIGNED,
                title="New quest assigned",
                message=f"\"{assignment.quest.title}\" has been assigned to your group.",
                related_type="quest_assignment",
                related_id=assignment.id,
            )