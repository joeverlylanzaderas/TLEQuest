# backend/apps/submissions/views.py
from django.db import transaction
from django.utils import timezone
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from apps.core.permissions import IsTeacherOrAdmin
from apps.classrooms.models import Group, GroupMember
from apps.assignments.models import QuestAssignment
from apps.notifications.utils import notify
from apps.notifications.models import Notification
from apps.core.mixins import ReadAfterWriteMixin
from apps.rewards.services import release_quest_rewards

from .models import Submission
from .serializers import SubmissionSerializer, SubmissionCreateSerializer, TeacherReviewSerializer


class SubmissionListCreateView(ReadAfterWriteMixin, generics.ListCreateAPIView):
    read_serializer_class = SubmissionSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return SubmissionCreateSerializer if self.request.method == "POST" else SubmissionSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Submission.objects.select_related("student", "group", "quest_assignment__quest")
        if user.role == "admin":
            return qs
        if user.role == "teacher":
            return qs.filter(quest_assignment__quest__teacher=user)
        # student sees only their own group's submissions
        return qs.filter(group__members__student=user).distinct()

    def get_assignment_and_group(self):
        assignment_id = self.request.data.get("quest_assignment") or self.request.query_params.get("quest_assignment")
        quest_assignment = generics.get_object_or_404(QuestAssignment, pk=assignment_id)
        return quest_assignment, quest_assignment.group

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.request.method == "POST":
            quest_assignment, group = self.get_assignment_and_group()
            context["quest_assignment"] = quest_assignment
            context["group"] = group
        return context

    def perform_create(self, serializer):
        quest_assignment, group = self.get_assignment_and_group()
        if group.leader_id != self.request.user.id:
            raise PermissionDenied("Only the current group leader can submit the final output.")
        if Submission.objects.filter(quest_assignment=quest_assignment, reviewed_at__isnull=False).exists():
            raise PermissionDenied("Your teacher already reviewed this quest's output.")
        submission = serializer.save(quest_assignment=quest_assignment, group=group, student=self.request.user)

        notify(
            recipient=quest_assignment.quest.teacher,
            notification_type=Notification.NotificationType.NEW_SUBMISSION,
            title="New submission received",
            message=f"{group} submitted an output for \"{quest_assignment.quest.title}\".",
            related_type="submission",
            related_id=submission.id,
        )


class SubmissionDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SubmissionSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Submission.objects.select_related("student", "group", "quest_assignment__quest")
        if user.role == "admin":
            return qs
        if user.role == "teacher":
            return qs.filter(quest_assignment__quest__teacher=user)
        return qs.filter(group__members__student=user).distinct()


class TeacherReviewView(ReadAfterWriteMixin, generics.UpdateAPIView):
    read_serializer_class = SubmissionSerializer
    """Teacher leaves feedback/rating. Doing so releases the quest's final
    points + badge to every member of the group, once (idempotent)."""
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]
    serializer_class = TeacherReviewSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Submission.objects.select_related("quest_assignment__quest")
        if user.role == "admin":
            return qs
        return qs.filter(quest_assignment__quest__teacher=user)

    def perform_update(self, serializer):
        # reviewed_by set here — never from client data — same treatment as
        # reviewed_at.
        with transaction.atomic():
            submission = serializer.save(reviewed_at=timezone.now(), reviewed_by=self.request.user)
            quest_title = submission.quest_assignment.quest.title
            member_ids = list(
                GroupMember.objects.filter(group=submission.group).values_list("student_id", flat=True)
            )

            title = "Your submission was reviewed"
            message = f"Feedback is in for \"{quest_title}\"."
            released = release_quest_rewards(submission.quest_assignment)

        for student_id in member_ids:
            notify(
                recipient_id=student_id,
                notification_type=Notification.NotificationType.SUBMISSION_FEEDBACK,
                title=title,
                message=message,
                related_type="submission",
                related_id=submission.id,
            )

        for student_id, got in released.items():
            parts = []
            if got["points"]:
                parts.append(f"{got['points']} points")
            if got["badges"]:
                parts.append(f"{got['badges']} badge" + ("s" if got["badges"] > 1 else ""))
            notify(
                recipient_id=student_id,
                notification_type=Notification.NotificationType.SUBMISSION_FEEDBACK,
                title="Rewards earned!",
                message=f"You earned {' and '.join(parts)} for \"{quest_title}\".",
                related_type="submission",
                related_id=submission.id,
            )
