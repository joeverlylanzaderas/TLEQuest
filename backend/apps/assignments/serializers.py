# backend/apps/assignments/serializers.py
from rest_framework import serializers
from apps.quests.models import Quest, QuestStep
from apps.classrooms.models import Group
from .models import QuestAssignment, QuestProgress, StepCompletion, ChecklistItemCompletion


class QuestAssignmentSerializer(serializers.ModelSerializer):
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
    quest = serializers.PrimaryKeyRelatedField(queryset=Quest.objects.all())
    quest_mode = serializers.ChoiceField(choices=QuestAssignment.QuestMode.choices)
    due_date = serializers.DateTimeField(required=False, allow_null=True)
    # Optional: assign only to these groups. Omitted = every group in the quest's classes.
    group_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, allow_empty=False
    )

    def validate_quest(self, value):
        if not value.is_published:
            raise serializers.ValidationError("Cannot assign an unpublished quest.")
        if not Group.objects.filter(class_obj__in=value.classes.all()).exists():
            raise serializers.ValidationError(
                "None of this quest's classes have groups yet — create groups first."
            )
        return value

    def validate(self, attrs):
        group_ids = attrs.get("group_ids")
        if group_ids:
            valid = set(
                Group.objects.filter(
                    id__in=group_ids, class_obj__in=attrs["quest"].classes.all()
                ).values_list("id", flat=True)
            )
            if set(group_ids) - valid:
                raise serializers.ValidationError(
                    {"group_ids": "Some groups do not belong to this quest's classes."}
                )
        return attrs


class QuestAssignmentDueDateSerializer(serializers.Serializer):
    due_date = serializers.DateTimeField(allow_null=True)


class ChecklistItemCompletionSerializer(serializers.ModelSerializer):
    checklist_text = serializers.CharField(source="step_checklist.checklist_text", read_only=True)
    order_index = serializers.IntegerField(source="step_checklist.order_index", read_only=True)

    class Meta:
        model = ChecklistItemCompletion
        fields = ["id", "step_checklist", "checklist_text", "order_index", "is_checked", "checked_at"]
        read_only_fields = ["id", "step_checklist", "checklist_text", "order_index", "checked_at"]


class ChecklistItemToggleSerializer(serializers.Serializer):
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
        previous_step = QuestStep.objects.filter(
            quest=obj.quest_step.quest, step_order__lt=obj.quest_step.step_order
        ).order_by("-step_order").first()
        if previous_step is None:
            return False
        prev_completion = StepCompletion.objects.filter(
            quest_progress=obj.quest_progress, quest_step=previous_step
        ).first()
        return not (prev_completion and prev_completion.completed_at is not None)


class QuestProgressSerializer(serializers.ModelSerializer):
    step_completions = StepCompletionSerializer(many=True, read_only=True)
    student_username = serializers.CharField(source="student.username", read_only=True)
    quest_title = serializers.CharField(source="quest_assignment.quest.title", read_only=True)
    quest_mode = serializers.CharField(source="quest_assignment.quest_mode", read_only=True)
    table_setting_type = serializers.CharField(source="quest_assignment.quest.table_setting_type", read_only=True)
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
        read_only_fields = [
            "id", "quest_assignment", "group", "student", "student_username",
            "total_steps", "percent_complete", "step_completions",
        ]

    def get_percent_complete(self, obj):
        total = obj.quest_assignment.quest.total_steps
        if total == 0:
            return 0
        done = obj.step_completions.filter(completed_at__isnull=False).count()
        return round((done / total) * 100)


class QuestProgressDetailSerializer(QuestProgressSerializer):
    """Full detail for the Quest Overview / Step Details / Progress screens:
    every step of the quest (even untouched ones), with checklist state and a
    computed status. Used only on the detail endpoint, so the list stays light."""
    quest_id = serializers.IntegerField(source="quest_assignment.quest_id", read_only=True)
    quest_description = serializers.CharField(source="quest_assignment.quest.description", read_only=True)
    due_date = serializers.DateTimeField(source="quest_assignment.due_date", read_only=True)
    group_name = serializers.CharField(source="group.group_name", read_only=True)
    is_group_leader = serializers.SerializerMethodField()
    steps = serializers.SerializerMethodField()

    class Meta(QuestProgressSerializer.Meta):
        fields = QuestProgressSerializer.Meta.fields + [
            "quest_id", "quest_description", "due_date", "group_name",
            "is_group_leader", "steps",
        ]

    def get_is_group_leader(self, obj):
        request = self.context.get("request")
        return bool(request and obj.group.leader_id == request.user.id)

    def get_steps(self, obj):
        quest = obj.quest_assignment.quest
        completions = {sc.quest_step_id: sc for sc in obj.step_completions.all()}
        result = []
        previous_completed = True  # the first step is never locked

        for step in quest.steps.all():
            sc = completions.get(step.id)
            checked_ids = set()
            if sc:
                checked_ids = {c.step_checklist_id for c in sc.checklist_completions.all() if c.is_checked}

            is_completed = bool(sc and sc.completed_at)
            if is_completed:
                step_status = "completed"
            elif previous_completed:
                step_status = "available"
            else:
                step_status = "locked"

            result.append({
                "id": step.id,
                "step_order": step.step_order,
                "title": step.title,
                "instruction": step.instruction,
                "is_final_step": step.is_final_step,
                "status": step_status,
                "checklist_items": [
                    {
                        "id": item.id,
                        "checklist_text": item.checklist_text,
                        "order_index": item.order_index,
                        "is_checked": item.id in checked_ids,
                    }
                    for item in step.checklist_items.all()
                ],
            })
            previous_completed = is_completed

        return result