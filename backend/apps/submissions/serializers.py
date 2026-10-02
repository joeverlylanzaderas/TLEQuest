# backend/apps/submissions/serializers.py
from rest_framework import serializers
from apps.classrooms.models import GroupMember
from apps.assignments.models import QuestProgress
from .models import Submission


class SubmissionCreateSerializer(serializers.ModelSerializer):
    """Written by the current group leader. quest_assignment/group come
    from the URL; student is set from request.user in the view."""
    class Meta:
        model = Submission
        fields = ["id", "image_url", "classifier_result", "confidence_score", "generated_feedback"]

    def validate(self, attrs):
        quest_assignment = self.context["quest_assignment"]
        group = self.context["group"]

        member_ids = list(GroupMember.objects.filter(group=group).values_list("student_id", flat=True))
        finished_ids = set(
            QuestProgress.objects.filter(
                quest_assignment=quest_assignment, student_id__in=member_ids, completed_at__isnull=False
            ).values_list("student_id", flat=True)
        )
        unfinished = [sid for sid in member_ids if sid not in finished_ids]
        if unfinished:
            raise serializers.ValidationError(
                f"Cannot submit yet — {len(unfinished)} group member(s) haven't finished their checklists."
            )
        return attrs


class TeacherReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Submission
        fields = ["teacher_feedback", "teacher_rating"]


class SubmissionSerializer(serializers.ModelSerializer):
    """Read serializer."""
    student_username = serializers.CharField(source="student.username", read_only=True)
    quest_title = serializers.CharField(source="quest_assignment.quest.title", read_only=True)
    group_name = serializers.CharField(source="group.group_name", read_only=True)
    is_reviewed = serializers.BooleanField(source="reviewed_at", read_only=True)  # truthy check via serializer
    # NEW — surfaces who actually left the review, now that it's tracked
    # explicitly (reviewed_by on the model) instead of only being
    # inferable from the quest's owning teacher.
    reviewed_by_username = serializers.CharField(source="reviewed_by.username", read_only=True, default=None)

    class Meta:
        model = Submission
        fields = [
            "id", "quest_assignment", "quest_title", "group", "group_name",
            "student", "student_username", "image_url", "classifier_result",
            "confidence_score", "generated_feedback", "teacher_feedback",
            "teacher_rating", "is_reviewed", "reviewed_by", "reviewed_by_username",
            "submitted_at", "reviewed_at",
        ]
        read_only_fields = fields