# backend/apps/users/serializers.py
from rest_framework import serializers
from .models import Reward, QuestStepReward, StudentReward


class RewardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reward
        fields = ["id", "reward_name", "reward_type", "points_value", "badge_image", "description"]


class QuestStepRewardSerializer(serializers.ModelSerializer):
    """Read serializer."""
    reward_detail = RewardSerializer(source="reward", read_only=True)
    effective_points = serializers.IntegerField(read_only=True)

    class Meta:
        model = QuestStepReward
        fields = ["id", "quest_step", "reward", "reward_detail", "reward_condition", "points_override", "effective_points"]
        read_only_fields = ["id", "reward_detail", "effective_points"]


class QuestStepRewardCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestStepReward
        fields = ["id", "reward", "reward_condition", "points_override"]

    def validate(self, attrs):
        quest_step = self.context.get("quest_step")
        reward = attrs.get("reward")
        if quest_step and reward and QuestStepReward.objects.filter(quest_step=quest_step, reward=reward).exists():
            raise serializers.ValidationError("This reward is already attached to this step.")
        return attrs


class StudentRewardSerializer(serializers.ModelSerializer):
    """Read-only — these are never created directly through the API."""
    reward_detail = RewardSerializer(source="reward", read_only=True)
    student_username = serializers.CharField(source="student.username", read_only=True)

    class Meta:
        model = StudentReward
        fields = ["id", "student", "student_username", "reward", "reward_detail", "quest_assignment", "earned_at"]
        read_only_fields = fields