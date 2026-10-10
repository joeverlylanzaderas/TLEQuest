# backend/apps/assignments/views.py
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from apps.core.permissions import IsTeacherOrAdmin
from apps.classrooms.models import Group, GroupMember
from apps.quests.models import QuestStep, StepChecklist
from apps.rewards.models import QuestStepReward, StudentReward, Reward
from apps.notifications.utils import notify
from apps.notifications.models import Notification
from .models import QuestAssignment, QuestProgress, StepCompletion, ChecklistItemCompletion
from .serializers import (
    QuestAssignmentSerializer, AssignQuestSerializer, QuestAssignmentDueDateSerializer,
    QuestProgressSerializer, QuestProgressDetailSerializer, ChecklistItemToggleSerializer,
)


class AssignQuestView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]

    def post(self, request):
        serializer = AssignQuestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        quest = serializer.validated_data["quest"]
        quest_mode = serializer.validated_data["quest_mode"]
        due_date = serializer.validated_data.get("due_date")
        group_ids = serializer.validated_data.get("group_ids")

        if request.user.role == "teacher" and quest.teacher_id != request.user.id:
            raise PermissionDenied("You can only assign your own quests.")

        created_assignments = []
        first_step = quest.steps.order_by("step_order").first()

        groups = Group.objects.filter(class_obj__in=quest.classes.all()).distinct()
        # Optional: only the groups the teacher picked
        if group_ids:
            groups = groups.filter(id__in=group_ids)

        for group in groups:
            assignment, _ = QuestAssignment.objects.get_or_create(
                quest=quest, group=group,
                defaults={
                    "quest_mode": quest_mode,
                    "leader_at_assignment": group.leader,
                    "due_date": due_date,
                },
            )
            created_assignments.append(assignment)

            member_ids = GroupMember.objects.filter(group=group).values_list("student_id", flat=True)
            for student_id in member_ids:
                QuestProgress.objects.get_or_create(
                    quest_assignment=assignment,
                    student_id=student_id,
                    defaults={
                        "group": group,
                        "current_step": first_step,
                        "started_at": timezone.now(),
                    },
                )
                notify(
                    recipient_id=student_id,
                    notification_type=Notification.NotificationType.QUEST_ASSIGNED,
                    title="New quest assigned",
                    message=f"\"{quest.title}\" has been assigned to your group.",
                    related_type="quest_assignment",
                    related_id=assignment.id,
                )

        return Response(
            QuestAssignmentSerializer(created_assignments, many=True).data,
            status=status.HTTP_201_CREATED,
        )


class QuestAssignmentListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = QuestAssignmentSerializer

    def get_queryset(self):
        user = self.request.user
        qs = QuestAssignment.objects.select_related("quest", "group")

        if user.role == "teacher":
            qs = qs.filter(quest__teacher=user)
        elif user.role != "admin":
            raise PermissionDenied("You do not have access to this data.")

        quest_id = self.request.query_params.get("quest")
        if quest_id:
            qs = qs.filter(quest_id=quest_id)
        return qs


class QuestAssignmentUpdateView(generics.UpdateAPIView):
    """PATCH a single assignment's due_date."""
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]
    serializer_class = QuestAssignmentDueDateSerializer
    http_method_names = ["patch", "options"]

    def get_queryset(self):
        qs = QuestAssignment.objects.select_related("quest", "group")
        if self.request.user.role == "teacher":
            qs = qs.filter(quest__teacher=self.request.user)
        return qs

    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = QuestAssignmentDueDateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance.due_date = serializer.validated_data["due_date"]
        instance.save()
        return Response(QuestAssignmentSerializer(instance).data)


class QuestProgressListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = QuestProgressSerializer

    def get_queryset(self):
        user = self.request.user
        qs = QuestProgress.objects.select_related(
            "student", "student__profile", "quest_assignment__quest", "group", "current_step"
        ).prefetch_related("step_completions__checklist_completions")

        if user.role == "student":
            qs = qs.filter(student=user)
        elif user.role == "teacher":
            qs = qs.filter(quest_assignment__quest__teacher=user)

        group_id = self.request.query_params.get("group_id")
        if group_id:
            qs = qs.filter(group_id=group_id)
        assignment_id = self.request.query_params.get("quest_assignment_id")
        if assignment_id:
            qs = qs.filter(quest_assignment_id=assignment_id)
        return qs


class QuestProgressDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = QuestProgressDetailSerializer
    queryset = QuestProgress.objects.select_related(
        "student", "group", "quest_assignment__quest", "current_step"
    ).prefetch_related(
        "step_completions__checklist_completions",
        "quest_assignment__quest__steps__checklist_items",
    )

    def get_object(self):
        obj = super().get_object()
        user = self.request.user
        has_access = (
            user.role == "admin"
            or (user.role == "teacher" and obj.quest_assignment.quest.teacher_id == user.id)
            or (user.role == "student" and obj.student_id == user.id)
        )
        if not has_access:
            raise PermissionDenied("You do not have access to this progress record.")
        return obj


class ChecklistItemToggleView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, progress_id, step_id, checklist_id):
        progress = generics.get_object_or_404(QuestProgress, pk=progress_id)
        if request.user.role != "student" or progress.student_id != request.user.id:
            raise PermissionDenied("You can only update your own checklist.")

        quest_step = generics.get_object_or_404(QuestStep, pk=step_id, quest=progress.quest_assignment.quest)
        step_checklist = generics.get_object_or_404(StepChecklist, pk=checklist_id, quest_step=quest_step)

        serializer = ChecklistItemToggleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        is_checked = serializer.validated_data["is_checked"]

        step_completion, _ = StepCompletion.objects.get_or_create(
            quest_progress=progress, quest_step=quest_step,
            defaults={"completed_by": request.user},
        )

        already_completed = step_completion.completed_at is not None

        ChecklistItemCompletion.objects.update_or_create(
            step_completion=step_completion, step_checklist=step_checklist,
            defaults={
                "is_checked": is_checked,
                "checked_at": timezone.now() if is_checked else None,
            },
        )

        if not already_completed:
            all_checked = (
                not step_completion.checklist_completions.filter(is_checked=False).exists()
                and step_completion.checklist_completions.count() == quest_step.checklist_items.count()
            )
            if all_checked:
                step_completion.completed_at = timezone.now()
                step_completion.save()

                for step_reward in QuestStepReward.objects.filter(quest_step=quest_step).select_related("reward"):
                    _, created = StudentReward.objects.get_or_create(
                        student=request.user,
                        quest_step_reward=step_reward,
                        defaults={
                            "reward": step_reward.reward,
                            "quest_assignment": progress.quest_assignment,
                        },
                    )
                    if created:
                        progress.points_earned += step_reward.effective_points
                        if step_reward.reward.reward_type == Reward.RewardType.BADGE:
                            progress.badge_earned = True

                if quest_step.is_final_step:
                    progress.completed_at = timezone.now()
                else:
                    next_step = QuestStep.objects.filter(
                        quest=progress.quest_assignment.quest, step_order__gt=quest_step.step_order
                    ).order_by("step_order").first()
                    if next_step:
                        progress.current_step = next_step
                progress.save()

        # Re-fetch so the detail serializer sees the fresh step completions
        progress.refresh_from_db()
        return Response(
            QuestProgressDetailSerializer(progress, context={"request": request}).data,
            status=status.HTTP_201_CREATED if False else status.HTTP_200_OK,
        )