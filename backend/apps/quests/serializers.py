# backend/apps/quests/serializers.py
from rest_framework import serializers
from .models import Quest, QuestStep, StepChecklist
from .services import apply_step_rewards


class StepChecklistSerializer(serializers.ModelSerializer):
    class Meta:
        model = StepChecklist
        fields = ["id", "checklist_text", "order_index"]


class QuestStepSerializer(serializers.ModelSerializer):
    checklist_items = StepChecklistSerializer(many=True, read_only=True)
    # What this step awards: points (0 = none) and the badge name ("" = none)
    points = serializers.SerializerMethodField()
    badge_name = serializers.SerializerMethodField()

    class Meta:
        model = QuestStep
        fields = [
            "id", "step_order", "title", "instruction", "image_hint",
            "is_final_step", "is_required", "checklist_items", "points", "badge_name",
        ]

    def get_points(self, obj):
        return sum(
            link.awarded_points for link in obj.step_rewards.all()
            if link.reward.reward_type == "points"
        )

    def get_badge_name(self, obj):
        for link in obj.step_rewards.all():
            if link.reward.reward_type == "badge":
                return link.reward.reward_name
        return ""


class QuestSerializer(serializers.ModelSerializer):
    steps = QuestStepSerializer(many=True, read_only=True)
    teacher = serializers.StringRelatedField()
    total_steps = serializers.IntegerField(read_only=True)
    classes = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta:
        model = Quest
        fields = [
            "id", "classes", "teacher", "title", "description",
            "table_setting_type", "order_index", "is_published", "cover_image_url",
            "total_steps", "steps", "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class QuestCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quest
        fields = [
            "id", "classes", "title", "description", "table_setting_type",
            "order_index", "is_published", "cover_image_url",
        ]

    def validate_cover_image_url(self, value):
        # Only photos uploaded to our Cloudinary account are accepted (or empty = no cover).
        if value and not value.startswith("https://res.cloudinary.com/"):
            raise serializers.ValidationError("Cover photo must be uploaded through the app.")
        return value


class QuestStepCreateUpdateSerializer(serializers.ModelSerializer):
    # Optional: set what the step awards. Left out = unchanged; 0 / "" = remove it.
    points = serializers.IntegerField(required=False, min_value=0, max_value=1000, write_only=True)
    badge_name = serializers.CharField(required=False, allow_blank=True, max_length=80, write_only=True)

    class Meta:
        model = QuestStep
        fields = ["id", "step_order", "title", "instruction", "image_hint", "is_final_step", "is_required", "points", "badge_name"]

    def create(self, validated_data):
        points = validated_data.pop("points", None)
        badge_name = validated_data.pop("badge_name", None)
        step = super().create(validated_data)
        apply_step_rewards(step, points, badge_name)
        return step

    def update(self, instance, validated_data):
        points = validated_data.pop("points", None)
        badge_name = validated_data.pop("badge_name", None)
        step = super().update(instance, validated_data)
        apply_step_rewards(step, points, badge_name)
        return step


class StepChecklistCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = StepChecklist
        fields = ["id", "checklist_text", "order_index"]