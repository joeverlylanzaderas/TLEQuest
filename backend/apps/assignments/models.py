# backend/apps/assignments/models.py
from django.db import models
from django.conf import settings
from apps.core.models import TimestampedModel
from apps.classrooms.models import Group
from apps.quests.models import Quest, QuestStep, StepChecklist


class QuestAssignment(TimestampedModel):
    class QuestMode(models.TextChoices):
        INDIVIDUAL = "individual", "Individual"
        GROUP = "group", "Group"

    quest = models.ForeignKey(Quest, on_delete=models.CASCADE, related_name="assignments")
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="quest_assignments")
    quest_mode = models.CharField(max_length=20, choices=QuestMode.choices)
    # Snapshot of who led the group AT THE TIME this assignment was created —
    # same reasoning as leader_id_at_submission. Group.leader can rotate after
    # this, but this field intentionally does not follow that change.
    leader_at_assignment = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="quest_assignments_led",
    )
    # Students see the quest from start_date on (empty = right away).
    start_date = models.DateTimeField(null=True, blank=True)
    due_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["quest", "group"], name="unique_assignment_per_quest_per_group")
        ]
        ordering = ["-created_at"]

    @property
    def has_started(self):
        from django.utils import timezone
        return self.start_date is None or self.start_date <= timezone.now()

    def __str__(self):
        return f"{self.quest.title} → {self.group}"


class QuestProgress(TimestampedModel):
    """One row per (assignment, student) — NOT per group. See decision #16."""
    quest_assignment = models.ForeignKey(QuestAssignment, on_delete=models.CASCADE, related_name="progress_records")
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="progress_records")  # denormalized for reporting queries
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="quest_progress", limit_choices_to={"role": "student"},
    )
    current_step = models.ForeignKey(
        QuestStep, on_delete=models.SET_NULL, null=True, blank=True, related_name="+",
    )
    # Cached totals — populated by reward logic once the `rewards` app exists,
    # not authoritative on their own. StudentReward (rewards app) will be the
    # source of truth; these are a denormalized shortcut for quick dashboard display.
    points_earned = models.PositiveIntegerField(default=0)
    badge_earned = models.BooleanField(default=False)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["quest_assignment", "student"], name="unique_progress_per_student_per_assignment")
        ]
        ordering = ["-started_at"]

    def __str__(self):
        return f"{self.student.username} — {self.quest_assignment.quest.title}"


class StepCompletion(TimestampedModel):
    quest_progress = models.ForeignKey(QuestProgress, on_delete=models.CASCADE, related_name="step_completions")
    quest_step = models.ForeignKey(QuestStep, on_delete=models.CASCADE, related_name="completions")
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name="+",  # normally == quest_progress.student; kept separate in case a teacher ever marks it manually
    )
    image_url = models.URLField(blank=True, null=True)  # optional evidence photo for THIS step, separate from final quest submission
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["quest_progress", "quest_step"], name="unique_completion_per_step_per_progress")
        ]

    def __str__(self):
        return f"{self.quest_progress.student.username} — Step {self.quest_step.step_order}"


class ChecklistItemCompletion(TimestampedModel):
    """NOT in the original ERD — added per decision #18, to track each
    individual checkbox from the Quest Step screen, per student."""
    step_completion = models.ForeignKey(StepCompletion, on_delete=models.CASCADE, related_name="checklist_completions")
    step_checklist = models.ForeignKey(StepChecklist, on_delete=models.CASCADE, related_name="+")
    is_checked = models.BooleanField(default=False)
    checked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["step_completion", "step_checklist"], name="unique_checklist_completion")
        ]

    def __str__(self):
        return f"{self.step_completion} — {self.step_checklist.checklist_text}"