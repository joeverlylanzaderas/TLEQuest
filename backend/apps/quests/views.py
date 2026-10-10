# backend/apps/quests/views.py
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.core.permissions import IsTeacherOrAdmin
from apps.core.mixins import ReadAfterWriteMixin
from apps.classrooms.models import ClassEnrollment
from .models import Quest, QuestStep, StepChecklist
from .serializers import (
    QuestSerializer, QuestCreateUpdateSerializer,
    QuestStepSerializer, QuestStepCreateUpdateSerializer,
    StepChecklistSerializer, StepChecklistCreateUpdateSerializer,
)


def _assert_owns_quest(user, quest):
    if user.role == "admin":
        return
    if user.role == "teacher" and quest.teacher_id == user.id:
        return
    raise PermissionDenied("You do not have permission to modify this quest.")


def _visible_quests_for(user):
    qs = Quest.objects.select_related("teacher", "teacher__profile").prefetch_related("classes")
    if user.role == "admin":
        return qs.distinct()
    if user.role == "teacher":
        return qs.filter(teacher=user).distinct()
    enrolled_class_ids = ClassEnrollment.objects.filter(student=user).values_list("class_obj_id", flat=True)
    return qs.filter(classes__id__in=enrolled_class_ids, is_published=True).distinct()


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
        classes = serializer.validated_data.get("classes", [])
        if not classes:
            raise ValidationError({"classes": "Select at least one class."})

        teacher_ids = {c.teacher_id for c in classes}
        if len(teacher_ids) > 1:
            raise ValidationError({"classes": "All selected classes must belong to the same teacher."})
        class_teacher_id = teacher_ids.pop()

        if user.role == "teacher":
            if class_teacher_id != user.id:
                raise PermissionDenied("You can only create quests for your own classes.")
            serializer.save(teacher=user)
        else:
            serializer.save(teacher=classes[0].teacher)


class QuestDetailView(ReadAfterWriteMixin, generics.RetrieveUpdateDestroyAPIView):
    read_serializer_class = QuestSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return QuestCreateUpdateSerializer if self.request.method in ("PUT", "PATCH") else QuestSerializer

    def get_queryset(self):
        return _visible_quests_for(self.request.user).prefetch_related("steps__checklist_items")

    def perform_update(self, serializer):
        quest = self.get_object()
        _assert_owns_quest(self.request.user, quest)
        new_classes = serializer.validated_data.get("classes")
        if new_classes and self.request.user.role == "teacher":
            for c in new_classes:
                if c.teacher_id != self.request.user.id:
                    raise PermissionDenied("You can only assign quests to your own classes.")
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
        return generics.get_object_or_404(_visible_quests_for(self.request.user), pk=self.kwargs["quest_id"])

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
        return QuestStep.objects.filter(quest_id__in=visible_quest_ids).select_related("quest")

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
        return generics.get_object_or_404(QuestStep.objects.select_related("quest"), pk=self.kwargs["step_id"])

    def get_queryset(self):
        return StepChecklist.objects.filter(quest_step=self.get_step())

    def perform_create(self, serializer):
        step = self.get_step()
        _assert_owns_quest(self.request.user, step.quest)
        serializer.save(quest_step=step)


class StepChecklistDetailView(ReadAfterWriteMixin, generics.RetrieveUpdateDestroyAPIView):
    read_serializer_class = StepChecklistSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        visible_quest_ids = _visible_quests_for(self.request.user).values_list("id", flat=True)
        return StepChecklist.objects.filter(
            quest_step__quest_id__in=visible_quest_ids
        ).select_related("quest_step", "quest_step__quest")

    def perform_update(self, serializer):
        _assert_owns_quest(self.request.user, self.get_object().quest_step.quest)
        serializer.save()

    def perform_destroy(self, instance):
        _assert_owns_quest(self.request.user, instance.quest_step.quest)
        instance.delete()