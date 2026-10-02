# backend/apps/quests/views.py
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from apps.core.permissions import IsTeacherOrAdmin
from apps.classrooms.models import ClassEnrollment
from apps.core.mixins import ReadAfterWriteMixin

from .models import Quest, QuestStep, StepChecklist
from .serializers import (
    QuestSerializer, QuestCreateUpdateSerializer,
    QuestStepSerializer, QuestStepCreateUpdateSerializer,
    StepChecklistSerializer, StepChecklistCreateUpdateSerializer,
)


def _assert_owns_quest(user, quest):
    """Admin always passes; teacher only passes if they own the quest's class."""
    if user.role == "admin":
        return
    if user.role == "teacher" and quest.class_obj.teacher_id == user.id:
        return
    raise PermissionDenied("You do not have permission to modify this quest.")


def _visible_quests_for(user):
    """Shared visibility rule, reused by the quest list and both nested views below."""
    qs = Quest.objects.select_related("class_obj", "teacher", "teacher__profile")
    if user.role == "admin":
        return qs
    if user.role == "teacher":
        return qs.filter(class_obj__teacher=user)
    enrolled_class_ids = ClassEnrollment.objects.filter(student=user).values_list("class_obj_id", flat=True)
    return qs.filter(class_obj_id__in=enrolled_class_ids, is_published=True)


class QuestListCreateView(ReadAfterWriteMixin, generics.ListCreateAPIView):
    read_serializer_class = QuestSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), IsTeacherOrAdmin()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        return QuestCreateUpdateSerializer if self.request.method == "POST" else QuestSerializer

    def get_queryset(self):
        return _visible_quests_for(self.request.user).prefetch_related("steps__checklist_items")

    def perform_create(self, serializer):
        user = self.request.user
        class_obj = serializer.validated_data["class_obj"]
        if user.role == "teacher" and class_obj.teacher_id != user.id:
            raise PermissionDenied("You can only create quests for your own classes.")
        # teacher field always mirrors the class's actual teacher — never the
        # admin themself, so ownership stays consistent regardless of who created it
        serializer.save(teacher=class_obj.teacher)


class QuestDetailView(ReadAfterWriteMixin, generics.RetrieveUpdateDestroyAPIView):
    read_serializer_class = QuestSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return QuestCreateUpdateSerializer if self.request.method in ("PUT", "PATCH") else QuestSerializer

    def get_queryset(self):
        return _visible_quests_for(self.request.user).prefetch_related("steps__checklist_items")

    def perform_update(self, serializer):
        _assert_owns_quest(self.request.user, self.get_object())
        serializer.save()

    def perform_destroy(self, instance):
        _assert_owns_quest(self.request.user, instance)
        instance.delete()


class QuestStepListCreateView(ReadAfterWriteMixin, generics.ListCreateAPIView):
    read_serializer_class = QuestStepSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), IsTeacherOrAdmin()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        return QuestStepCreateUpdateSerializer if self.request.method == "POST" else QuestStepSerializer

    def get_quest(self):
        quest = generics.get_object_or_404(
            _visible_quests_for(self.request.user), pk=self.kwargs["quest_id"]
        )
        return quest

    def get_queryset(self):
        return QuestStep.objects.filter(quest=self.get_quest()).prefetch_related("checklist_items")

    def perform_create(self, serializer):
        quest = self.get_quest()
        _assert_owns_quest(self.request.user, quest)
        serializer.save(quest=quest)


class QuestStepDetailView(ReadAfterWriteMixin, generics.RetrieveUpdateDestroyAPIView):
    read_serializer_class = QuestStepSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return QuestStepCreateUpdateSerializer if self.request.method in ("PUT", "PATCH") else QuestStepSerializer

    def get_queryset(self):
        visible_quest_ids = _visible_quests_for(self.request.user).values_list("id", flat=True)
        return QuestStep.objects.filter(quest_id__in=visible_quest_ids).select_related("quest", "quest__class_obj")

    def perform_update(self, serializer):
        _assert_owns_quest(self.request.user, self.get_object().quest)
        serializer.save()

    def perform_destroy(self, instance):
        _assert_owns_quest(self.request.user, instance.quest)
        instance.delete()


class StepChecklistListCreateView(ReadAfterWriteMixin, generics.ListCreateAPIView):
    read_serializer_class = StepChecklistSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), IsTeacherOrAdmin()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        return StepChecklistCreateUpdateSerializer if self.request.method == "POST" else StepChecklistSerializer

    def get_step(self):
        return generics.get_object_or_404(
            QuestStep.objects.select_related("quest", "quest__class_obj"), pk=self.kwargs["step_id"]
        )

    def get_queryset(self):
        return StepChecklist.objects.filter(quest_step=self.get_step())

    def perform_create(self, serializer):
        step = self.get_step()
        _assert_owns_quest(self.request.user, step.quest)
        serializer.save(quest_step=step)


class StepChecklistDetailView(ReadAfterWriteMixin, generics.RetrieveUpdateDestroyAPIView):
    read_serializer_class = StepChecklistSerializer
    permission_classes = [IsAuthenticated]
    serializer_class = StepChecklistCreateUpdateSerializer

    def get_queryset(self):
        visible_quest_ids = _visible_quests_for(self.request.user).values_list("id", flat=True)
        return StepChecklist.objects.filter(
            quest_step__quest_id__in=visible_quest_ids
        ).select_related("quest_step", "quest_step__quest", "quest_step__quest__class_obj")

    def perform_update(self, serializer):
        _assert_owns_quest(self.request.user, self.get_object().quest_step.quest)
        serializer.save()

    def perform_destroy(self, instance):
        _assert_owns_quest(self.request.user, instance.quest_step.quest)
        instance.delete()