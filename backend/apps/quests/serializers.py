# backend/apps/quests/serializers.py
from rest_framework import serializers
from .models import Quest, QuestStep, StepChecklist


class StepChecklistSerializer(serializers.ModelSerializer):
    class Meta:
        model = StepChecklist
        fields = ["id", "checklist_text", "order_index"]


class QuestStepSerializer(serializers.ModelSerializer):
    checklist_items = StepChecklistSerializer(many=True, read_only=True)

    class Meta:
        model = QuestStep
        fields = [
            "id", "step_order", "title", "instruction", "image_hint",
            "is_final_step", "is_required", "checklist_items",
        ]


class QuestSerializer(serializers.ModelSerializer):
    """Read serializer — full detail, including nested steps + checklists."""
    steps = QuestStepSerializer(many=True, read_only=True)
    teacher = serializers.StringRelatedField()
    total_steps = serializers.IntegerField(read_only=True)

    class Meta:
        model = Quest
        fields = [
            "id", "class_obj", "teacher", "title", "description",
            "table_setting_type", "order_index", "is_published",
            "total_steps", "steps", "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class QuestCreateUpdateSerializer(serializers.ModelSerializer):
    """Write serializer — flat, no nested steps. Steps/checklists are
    managed through their own endpoints once a quest exists."""
    class Meta:
        model = Quest
        fields = ["id", "class_obj", "title", "description", "table_setting_type", "order_index", "is_published"]
        # teacher is deliberately excluded — set by the view from request.user,
        # same reasoning as ClassCreateSerializer


class QuestStepCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestStep
        fields = ["id", "step_order", "title", "instruction", "image_hint", "is_final_step", "is_required"]
        # quest itself comes from the URL, not the request body — set in the view


class StepChecklistCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = StepChecklist
        fields = ["id", "checklist_text", "order_index"]
        # quest_step comes from the URL, same pattern