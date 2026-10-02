# backend/apps/quests/models.py
from django.db import models
from django.conf import settings
from apps.core.models import TimestampedModel
from apps.classrooms.models import Class


class Quest(TimestampedModel):
    class TableSettingType(models.TextChoices):
        TABLE_SETTING = "table_setting", "Table Setting"
        NAPKIN_FOLDING = "napkin_folding", "Napkin Folding"

    class_obj = models.ForeignKey(Class, on_delete=models.CASCADE, related_name="quests")
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="quests_created",
        limit_choices_to={"role": "teacher"},
    )
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    table_setting_type = models.CharField(max_length=30, choices=TableSettingType.choices)
    order_index = models.PositiveIntegerField(default=0)
    is_published = models.BooleanField(default=False)  # draft vs. visible to students

    class Meta:
        ordering = ["class_obj", "order_index"]

    def __str__(self):
        return self.title

    @property
    def total_steps(self):
        return self.steps.count()


class QuestStep(TimestampedModel):
    quest = models.ForeignKey(Quest, on_delete=models.CASCADE, related_name="steps")
    step_order = models.PositiveIntegerField()
    title = models.CharField(max_length=150)  
    instruction = models.TextField()          
    image_hint = models.ImageField(upload_to="quest_step_hints/", blank=True, null=True)
    is_final_step = models.BooleanField(default=False)
    is_required = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["quest", "step_order"], name="unique_step_order_per_quest")
        ]
        ordering = ["quest", "step_order"]

    def __str__(self):
        return f"{self.quest.title} — {self.title}"


class StepChecklist(TimestampedModel):
    quest_step = models.ForeignKey(QuestStep, on_delete=models.CASCADE, related_name="checklist_items")
    checklist_text = models.CharField(max_length=255)
    order_index = models.PositiveIntegerField(default=0)  # display order within the step

    class Meta:
        ordering = ["quest_step", "order_index"]

    def __str__(self):
        return f"{self.quest_step} — {self.checklist_text}"