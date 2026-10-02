# backend/apps/classrooms/views.py
from enum import member

from enum import member

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.accounts.permissions import IsAdmin
from apps.core.mixins import ReadAfterWriteMixin
from apps.assignments.services import sync_progress_for_new_group_member
from .models import Class, ClassEnrollment, Group, GroupMember
from apps.core.permissions import IsTeacherOrAdmin, IsStudent
from .serializers import (
    ClassSerializer, ClassCreateSerializer, JoinClassSerializer,
    ClassEnrollmentSerializer, GroupSerializer, GroupCreateUpdateSerializer,
    GroupMemberSerializer, GroupMemberCreateSerializer,
)


def _assert_owns_class(user, class_obj):
    """Shared ownership check: admin always passes; teacher only passes
    if it's their own class. Raises PermissionDenied otherwise."""
    if user.role == "admin":
        return
    if user.role == "teacher" and class_obj.teacher_id == user.id:
        return
    raise PermissionDenied("You do not have permission to modify this class.")


class ClassListCreateView(ReadAfterWriteMixin, generics.ListCreateAPIView):
    read_serializer_class = ClassSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), IsTeacherOrAdmin()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        return ClassCreateSerializer if self.request.method == "POST" else ClassSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Class.objects.select_related("teacher", "teacher__profile")
        if user.role == "admin":
            return qs
        if user.role == "teacher":
            return qs.filter(teacher=user)
        return qs.filter(enrollments__student=user).distinct()  # student sees only classes they've joined

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == "teacher":
            serializer.save(teacher=user)
            return
        # admin path — must explicitly specify which teacher owns the class
        teacher = serializer.validated_data.get("teacher")
        if not teacher or teacher.role != "teacher":
            raise ValidationError({"teacher": "A valid teacher must be specified when an admin creates a class."})
        serializer.save()

    def create(self, request, *args, **kwargs):
        # Validate/save with the write serializer as normal, but respond
        # with the full read serializer so invite_code (and everything
        # else ClassCreateSerializer doesn't expose) actually comes back.
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        read_serializer = ClassSerializer(serializer.instance)
        headers = self.get_success_headers(read_serializer.data)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class ClassDetailView(ReadAfterWriteMixin, generics.RetrieveUpdateDestroyAPIView):
    read_serializer_class = ClassSerializer
    permission_classes = [IsAuthenticated]
    queryset = Class.objects.select_related("teacher", "teacher__profile")
    serializer_class = ClassSerializer

    def get_object(self):
        obj = super().get_object()
        user = self.request.user
        has_access = (
            user.role == "admin"
            or (user.role == "teacher" and obj.teacher_id == user.id)
            or (user.role == "student" and ClassEnrollment.objects.filter(class_obj=obj, student=user).exists())
        )
        if not has_access:
            raise PermissionDenied("You do not have access to this class.")
        return obj

    def perform_update(self, serializer):
        _assert_owns_class(self.request.user, self.get_object())
        serializer.save()

    def perform_destroy(self, instance):
        _assert_owns_class(self.request.user, instance)
        instance.delete()


class JoinClassView(APIView):
    """Student self-enrolls via invite code."""
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request):
        serializer = JoinClassSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        enrollment = ClassEnrollment.objects.create(
            class_obj=serializer.validated_data["class_obj"],
            student=request.user,
        )
        return Response(ClassEnrollmentSerializer(enrollment).data, status=status.HTTP_201_CREATED)


class ClassEnrollmentListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ClassEnrollmentSerializer

    def get_queryset(self):
        class_obj = generics.get_object_or_404(Class, pk=self.kwargs["class_id"])
        user = self.request.user
        has_access = (
            user.role == "admin"
            or (user.role == "teacher" and class_obj.teacher_id == user.id)
            or (user.role == "student" and ClassEnrollment.objects.filter(class_obj=class_obj, student=user).exists())
        )
        if not has_access:
            raise PermissionDenied("You do not have access to this class roster.")
        return ClassEnrollment.objects.filter(class_obj=class_obj).select_related("student", "student__profile")


class RemoveEnrollmentView(generics.DestroyAPIView):
    """Handles BOTH self-leave and teacher/admin removal — same endpoint,
    permission depends on who's making the request."""
    permission_classes = [IsAuthenticated]
    queryset = ClassEnrollment.objects.select_related("class_obj", "student")

    def get_object(self):
        enrollment = super().get_object()
        user = self.request.user
        can_remove = (
            enrollment.student_id == user.id  # self-leave
            or user.role == "admin"
            or (user.role == "teacher" and enrollment.class_obj.teacher_id == user.id)
        )
        if not can_remove:
            raise PermissionDenied("You cannot remove this enrollment.")
        return enrollment


class GroupListCreateView(ReadAfterWriteMixin, generics.ListCreateAPIView):
    read_serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), IsTeacherOrAdmin()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        return GroupCreateUpdateSerializer if self.request.method == "POST" else GroupSerializer

    def get_queryset(self):
        class_obj = generics.get_object_or_404(Class, pk=self.kwargs["class_id"])
        user = self.request.user
        has_access = (
            user.role == "admin"
            or (user.role == "teacher" and class_obj.teacher_id == user.id)
            or (user.role == "student" and ClassEnrollment.objects.filter(class_obj=class_obj, student=user).exists())
        )
        if not has_access:
            raise PermissionDenied("You do not have access to this class.")
        return Group.objects.filter(class_obj=class_obj).select_related("leader", "leader__profile")

    def perform_create(self, serializer):
        class_obj = generics.get_object_or_404(Class, pk=self.kwargs["class_id"])
        _assert_owns_class(self.request.user, class_obj)
        serializer.save(class_obj=class_obj)


class GroupDetailView(ReadAfterWriteMixin, generics.RetrieveUpdateDestroyAPIView):
    read_serializer_class = GroupSerializer
    """PATCH here is also how leader rotation happens — just update `leader`."""
    permission_classes = [IsAuthenticated]
    queryset = Group.objects.select_related("class_obj", "leader")

    def get_serializer_class(self):
        return GroupCreateUpdateSerializer if self.request.method in ("PUT", "PATCH") else GroupSerializer

    def perform_update(self, serializer):
        _assert_owns_class(self.request.user, self.get_object().class_obj)
        serializer.save()

    def perform_destroy(self, instance):
        _assert_owns_class(self.request.user, instance.class_obj)
        instance.delete()


class GroupMemberListCreateView(ReadAfterWriteMixin, generics.ListCreateAPIView):
    read_serializer_class = GroupMemberSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), IsTeacherOrAdmin()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        return GroupMemberCreateSerializer if self.request.method == "POST" else GroupMemberSerializer

    def get_group(self):
        return generics.get_object_or_404(Group, pk=self.kwargs["group_id"])

    def get_queryset(self):
        return GroupMember.objects.filter(group=self.get_group()).select_related("student", "student__profile")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["group"] = self.get_group()
        return context

    def perform_create(self, serializer):
        group = self.get_group()
        _assert_owns_class(self.request.user, group.class_obj)
        member = serializer.save(group=group)
        sync_progress_for_new_group_member(group, member.student)   # NEW


class GroupMemberDetailView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]
    queryset = GroupMember.objects.select_related("group__class_obj")

    def perform_destroy(self, instance):
        _assert_owns_class(self.request.user, instance.group.class_obj)
        instance.delete()