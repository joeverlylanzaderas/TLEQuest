# backend/apps/rewards/models.py
from django.db import models
from django.conf import settings
from apps.core.models import TimestampedModel
from apps.quests.models import QuestStep
from apps.assignments.models import QuestAssignment


class Reward(TimestampedModel):
    class RewardType(models.TextChoices):
        POINTS = "points", "Points"
        BADGE = "badge", "Badge"

    reward_name = models.CharField(max_length=100)
    reward_type = models.CharField(max_length=20, choices=RewardType.choices)
    points_value = models.PositiveIntegerField(default=0)
    badge_image = models.ImageField(upload_to="badges/", blank=True, null=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.reward_name


class QuestStepReward(TimestampedModel):
    quest_step = models.ForeignKey(QuestStep, on_delete=models.CASCADE, related_name="step_rewards")
    reward = models.ForeignKey(Reward, on_delete=models.CASCADE, related_name="quest_step_links")
    reward_condition = models.CharField(max_length=255, blank=True)
    points_override = models.PositiveIntegerField(null=True, blank=True)  # NEW

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["quest_step", "reward"], name="unique_reward_per_step")
        ]

    @property
    def effective_points(self):
        return self.points_override if self.points_override is not None else self.reward.points_value

    def __str__(self):
        return f"{self.quest_step} → {self.reward.reward_name} ({self.effective_points} pts)"


class StudentReward(TimestampedModel):
    """Actual earned instance — one row per student per reward earned."""
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="rewards_earned", limit_choices_to={"role": "student"},
    )
    reward = models.ForeignKey(Reward, on_delete=models.CASCADE, related_name="earned_by")
    quest_assignment = models.ForeignKey(QuestAssignment, on_delete=models.CASCADE, related_name="rewards_given")
    # Traceability — which specific step-reward link triggered this, not in
    # the original ERD but useful for "why did I get this" display/debugging.
    quest_step_reward = models.ForeignKey(
        QuestStepReward, on_delete=models.SET_NULL, null=True, blank=True, related_name="+",
    )
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            # Prevents double-granting the same step's reward to the same
            # student twice, e.g. from a duplicate/retried request.
            models.UniqueConstraint(fields=["student", "quest_step_reward"], name="unique_reward_earned_once")
        ]
        ordering = ["-earned_at"]

    def __str__(self):
        return f"{self.student.username} earned {self.reward.reward_name}"