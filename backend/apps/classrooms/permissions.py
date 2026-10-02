# backend/apps/classrooms/permissions.py
from rest_framework.permissions import BasePermission

class IsTeacherOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.role in ("teacher", "admin")
        )


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.role == "student"
        )