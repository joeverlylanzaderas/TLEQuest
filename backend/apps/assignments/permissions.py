# backend/apps/assignments/permissions.py
from rest_framework.permissions import BasePermission

class IsOwnProgress(BasePermission):
    """Object-level check — a student can only touch/view their own QuestProgress."""
    def has_object_permission(self, request, view, obj):
        return obj.student_id == request.user.id