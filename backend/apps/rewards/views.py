# backend/apps/rewards/views.py
from django.db.models import Sum, Count, Q
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from apps.core.permissions import IsTeacherOrAdmin
from apps.core.mixins import ReadAfterWriteMixin

from .models import Reward, QuestStepReward, StudentReward
from .serializers import (
    RewardSerializer, QuestStepRewardSerializer, QuestStepRewardCreateUpdateSerializer,
    StudentRewardSerializer,
)


class RewardListCreateView(generics.ListCreateAPIView):
    """Reward templates — teacher/admin manage these, everyone can view."""
    permission_classes = [IsAuthenticated]
    serializer_class = RewardSerializer
    queryset = Reward.objects.all()

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), IsTeacherOrAdmin()]
        return [IsAuthenticated()]


class RewardDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = RewardSerializer
    queryset = Reward.objects.all()

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuthenticated(), IsTeacherOrAdmin()]
        return [IsAuthenticated()]


class QuestStepRewardListCreateView(ReadAfterWriteMixin, generics.ListCreateAPIView):
    read_serializer_class = QuestStepRewardSerializer
    """Attaching a reward to a specific step. Ownership check mirrors quests'
    _assert_owns_quest pattern — teacher must own the step's quest's class."""
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), IsTeacherOrAdmin()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        return QuestStepRewardCreateUpdateSerializer if self.request.method == "POST" else QuestStepRewardSerializer

    def get_step(self):
        from apps.quests.models import QuestStep
        return generics.get_object_or_404(QuestStep, pk=self.kwargs["step_id"])

    def get_queryset(self):
        return QuestStepReward.objects.filter(quest_step=self.get_step()).select_related("reward")
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.request.method == "POST":
            context["quest_step"] = self.get_step()
        return context

    def perform_create(self, serializer):
        step = self.get_step()
        user = self.request.user
        if user.role == "teacher" and step.quest.teacher_id != user.id:
            raise PermissionDenied("You can only attach rewards to your own quests.")
        serializer.save(quest_step=step)


def _visible_student_rewards(request):
    """StudentReward rows the requesting user may see (same rules as the list view)."""
    user = request.user
    qs = StudentReward.objects.select_related("student", "reward", "quest_assignment__quest")
    if user.role == "student":
        qs = qs.filter(student=user)
    elif user.role == "teacher":
        qs = qs.filter(quest_assignment__quest__teacher=user)
    student_id = request.query_params.get("student_id")
    if student_id:
        qs = qs.filter(student_id=student_id)
    return qs


class StudentRewardSummaryView(APIView):
    """One place that answers "how many points / badges do I have?".

    total_points / total_badges are the sums over EVERY quest the student has
    earned rewards in, so finishing another quest simply adds to them.
    per_quest is the same numbers split by quest, for breakdown displays."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _visible_student_rewards(request)
        total = qs.aggregate(
            points=Sum("points_awarded"),
            badges=Count("id", filter=Q(reward__reward_type="badge")),
        )
        rows = (
            qs.values("quest_assignment_id", "quest_assignment__quest__title")
            .annotate(points=Sum("points_awarded"), badges=Count("id", filter=Q(reward__reward_type="badge")))
            .order_by("quest_assignment__quest__title")
        )
        return Response({
            "total_points": total["points"] or 0,
            "total_badges": total["badges"] or 0,
            "per_quest": [
                {
                    "quest_assignment": r["quest_assignment_id"],
                    "quest_title": r["quest_assignment__quest__title"],
                    "points": r["points"] or 0,
                    "badges": r["badges"] or 0,
                }
                for r in rows
            ],
        })


class StudentRewardListView(generics.ListAPIView):
    """Read-only — students see their own earned rewards; teacher/admin see
    everyone's, filterable by ?student_id= or ?quest_assignment_id=."""
    permission_classes = [IsAuthenticated]
    serializer_class = StudentRewardSerializer

    def get_queryset(self):
        user = self.request.user
        qs = StudentReward.objects.select_related("student", "reward", "quest_assignment__quest")

        if user.role == "student":
            qs = qs.filter(student=user)
        elif user.role == "teacher":
            qs = qs.filter(quest_assignment__quest__teacher=user)
        # admin sees all

        student_id = self.request.query_params.get("student_id")
        if student_id:
            qs = qs.filter(student_id=student_id)
        assignment_id = self.request.query_params.get("quest_assignment_id")
        if assignment_id:
            qs = qs.filter(quest_assignment_id=assignment_id)
        return qs