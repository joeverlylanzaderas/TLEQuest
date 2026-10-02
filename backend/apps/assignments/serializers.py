# backend/apps/assignments/serializers.py
from rest_framework import serializers
from apps.quests.models import Quest, QuestStep
from apps.classrooms.models import Group
from .models import QuestAssignment, QuestProgress, StepCompletion, ChecklistItemCompletion


class QuestAssignmentSerializer(serializers.ModelSerializer):
    """Read serializer."""
    quest_title = serializers.CharField(source="quest.title", read_only=True)
    group_name = serializers.CharField(source="group.group_name", read_only=True)
    leader_at_assignment = serializers.StringRelatedField()

    class Meta:
        model = QuestAssignment
        fields = [
            "id", "quest", "quest_title", "group", "group_name",
            "quest_mode", "leader_at_assignment", "due_date", "created_at",
        ]
        read_only_fields = fields


class AssignQuestSerializer(serializers.Serializer):
    """Write serializer for the bulk 'assign this quest to the whole class'
    action. Does NOT map 1:1 to QuestAssignment — the view fans this out
    into one QuestAssignment (+ one QuestProgress per group member) per
    existing group in the quest's class."""
    quest = serializers.PrimaryKeyRelatedField(queryset=Quest.objects.all())
    quest_mode = serializers.ChoiceField(choices=QuestAssignment.QuestMode.choices)
    due_date = serializers.DateTimeField(required=False, allow_null=True)

    def validate_quest(self, value):
        if not value.is_published:
            raise serializers.ValidationError("Cannot assign an unpublished quest.")
        if not Group.objects.filter(class_obj=value.class_obj).exists():
            raise serializers.ValidationError("This quest's class has no groups yet — create groups first.")
        return value


class ChecklistItemCompletionSerializer(serializers.ModelSerializer):
    checklist_text = serializers.CharField(source="step_checklist.checklist_text", read_only=True)
    order_index = serializers.IntegerField(source="step_checklist.order_index", read_only=True)

    class Meta:
        model = ChecklistItemCompletion
        fields = ["id", "step_checklist", "checklist_text", "order_index", "is_checked", "checked_at"]
        read_only_fields = ["id", "step_checklist", "checklist_text", "order_index", "checked_at"]


class ChecklistItemToggleSerializer(serializers.Serializer):
    """Write serializer — the actual checkbox tap from the mobile app.
    step_completion + step_checklist come from the URL, not the body."""
    is_checked = serializers.BooleanField()


class StepCompletionSerializer(serializers.ModelSerializer):
    checklist_completions = ChecklistItemCompletionSerializer(many=True, read_only=True)
    step_order = serializers.IntegerField(source="quest_step.step_order", read_only=True)
    instruction = serializers.CharField(source="quest_step.instruction", read_only=True)
    is_locked = serializers.SerializerMethodField()

    class Meta:
        model = StepCompletion
        fields = [
            "id", "quest_step", "step_order", "instruction", "is_locked",
            "completed_by", "image_url", "completed_at", "checklist_completions",
        ]
        read_only_fields = ["id", "completed_by", "completed_at", "checklist_completions"]

    def get_is_locked(self, obj):
        """Computed per decision #17 — never stored. Locked unless the
        immediately preceding step (by step_order) is fully completed."""
        previous_step = QuestStep.objects.filter(
            quest=obj.quest_step.quest, step_order__lt=obj.quest_step.step_order
        ).order_by("-step_order").first()
        if previous_step is None:
            return False  # first step is never locked
        prev_completion = StepCompletion.objects.filter(
            quest_progress=obj.quest_progress, quest_step=previous_step
        ).first()
        return not (prev_completion and prev_completion.completed_at is not None)


class QuestProgressSerializer(serializers.ModelSerializer):
    step_completions = StepCompletionSerializer(many=True, read_only=True)
    student_username = serializers.CharField(source="student.username", read_only=True)
    quest_title = serializers.CharField(source="quest_assignment.quest.title", read_only=True)
    quest_mode = serializers.CharField(source="quest_assignment.quest_mode", read_only=True)  # NEW
    table_setting_type = serializers.CharField(source="quest_assignment.quest.table_setting_type", read_only=True)  # NEW
    total_steps = serializers.IntegerField(source="quest_assignment.quest.total_steps", read_only=True)
    percent_complete = serializers.SerializerMethodField()

    class Meta:
        model = QuestProgress
        fields = [
            "id", "quest_assignment", "quest_title", "quest_mode", "table_setting_type",
            "group", "student", "student_username", "current_step", "total_steps",
            "percent_complete", "points_earned", "badge_earned", "started_at",
            "completed_at", "step_completions",
        ]
        read_only_fields = [f for f in fields if f not in ()]  # keep as fully read-only, matches original

    def get_percent_complete(self, obj):
        total = obj.quest_assignment.quest.total_steps
        if total == 0:
            return 0
        done = obj.step_completions.filter(completed_at__isnull=False).count()
        return round((done / total) * 100)