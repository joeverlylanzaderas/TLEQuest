# backend/apps/submissions/views.py
from django.utils import timezone
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from apps.core.permissions import IsTeacherOrAdmin
from apps.classrooms.models import Group
from apps.assignments.models import QuestAssignment
from apps.notifications.utils import notify
from apps.notifications.models import Notification
from apps.core.mixins import ReadAfterWriteMixin

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
            return qs.filter(quest_assignment__quest__class_obj__teacher=user)
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
        submission = serializer.save(quest_assignment=quest_assignment, group=group, student=self.request.user)

        notify(
            recipient=quest_assignment.quest.class_obj.teacher,
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
            return qs.filter(quest_assignment__quest__class_obj__teacher=user)
        return qs.filter(group__members__student=user).distinct()


class TeacherReviewView(ReadAfterWriteMixin, generics.UpdateAPIView):
    read_serializer_class = SubmissionSerializer
    """Teacher leaves feedback/rating. Does not block or gate resubmission —
    the leader can submit again anytime regardless of review state."""
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]
    serializer_class = TeacherReviewSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Submission.objects.select_related("quest_assignment__quest__class_obj")
        if user.role == "admin":
            return qs
        return qs.filter(quest_assignment__quest__class_obj__teacher=user)

    def perform_update(self, serializer):
        # reviewed_by set here — never from client data — same treatment as
        # reviewed_at. This is whoever is actually authenticated and hitting
        # this endpoint (a teacher grading their own class, or an admin
        # grading on someone's behalf), not an inferred owner.
        submission = serializer.save(reviewed_at=timezone.now(), reviewed_by=self.request.user)
        notify(
            recipient=submission.student,
            notification_type=Notification.NotificationType.SUBMISSION_FEEDBACK,
            title="Your submission was reviewed",
            message=f"Feedback is in for \"{submission.quest_assignment.quest.title}\".",
            related_type="submission",
            related_id=submission.id,
        )