# backend/apps/notifications/admin.py
from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("recipient", "notification_type", "title", "is_read", "created_at")
    list_filter = ("notification_type", "is_read", "created_at")
    search_fields = ("recipient__username", "title", "message")
    autocomplete_fields = ["recipient"]
    readonly_fields = ("created_at", "updated_at", "read_at")

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("recipient", "recipient__profile")

    def has_add_permission(self, request):
        # Same reasoning as StudentReward — notifications are only meant to
        # be created by the three trigger hooks (assign, submit, review),
        # never manually through admin.
        return False