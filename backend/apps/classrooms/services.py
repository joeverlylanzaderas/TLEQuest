# apps/classrooms/services.py
from apps.assignments.models import QuestProgress
from apps.notifications.models import Notification
from apps.rewards.models import StudentReward


def purge_student_group_links(group, student_id):
    """Cut every link between a student and ONE group (their other groups and their class
    enrollment are not touched). Used when a member is removed, and by prune_orphan_progress
    for students who were removed before this cleanup existed. Returns what was deleted."""
    assignment_ids = list(group.quest_assignments.values_list("id", flat=True))
    submission_ids = list(group.submissions.values_list("id", flat=True))
    counts = {}
    #  - their quest progress (steps and checklists go with it), so the quest disappears for them
    counts["progress"] = QuestProgress.objects.filter(group=group, student_id=student_id).delete()[0]
    #  - the points and badges they earned from this group's quests
    counts["rewards"] = StudentReward.objects.filter(
        student_id=student_id, quest_assignment_id__in=assignment_ids
    ).delete()[0]
    #  - notifications about this group's quests and submissions
    counts["notifications"] = (
        Notification.objects.filter(
            recipient_id=student_id, related_type="quest_assignment", related_id__in=assignment_ids
        ).delete()[0]
        + Notification.objects.filter(
            recipient_id=student_id, related_type="submission", related_id__in=submission_ids
        ).delete()[0]
    )
    #  - leader links: the group's leader, and "leader at the time" on its assignments
    if group.leader_id == student_id:
        group.leader = None
        group.save(update_fields=["leader"])
    group.quest_assignments.filter(leader_at_assignment_id=student_id).update(leader_at_assignment=None)
    return counts
