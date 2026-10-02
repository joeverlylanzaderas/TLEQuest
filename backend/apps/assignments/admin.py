# backend/apps/assignments/admin.py
from django.contrib import admin
from .models import QuestAssignment, QuestProgress, StepCompletion, ChecklistItemCompletion


class StepCompletionInline(admin.TabularInline):
    model = StepCompletion
    extra = 0
    fields = ("quest_step", "completed_by", "completed_at")
    autocomplete_fields = ["quest_step", "completed_by"]
    show_change_link = True


@admin.register(QuestAssignment)
class QuestAssignmentAdmin(admin.ModelAdmin):
    list_display = ("quest", "group", "quest_mode", "leader_at_assignment", "due_date", "created_at")
    list_filter = ("quest_mode", "quest__class_obj", "due_date")
    search_fields = ("quest__title", "group__group_name", "leader_at_assignment__username")
    autocomplete_fields = ["quest", "group", "leader_at_assignment"]
    readonly_fields = ("created_at", "updated_at")

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            "quest", "group", "leader_at_assignment", "leader_at_assignment__profile"
        )


@admin.register(QuestProgress)
class QuestProgressAdmin(admin.ModelAdmin):
    list_display = ("student", "quest_assignment", "group", "current_step", "points_earned", "badge_earned", "completed_at")
    list_filter = ("badge_earned", "quest_assignment__quest", "group")
    search_fields = ("student__username", "quest_assignment__quest__title")
    autocomplete_fields = ["quest_assignment", "group", "student", "current_step"]
    readonly_fields = ("created_at", "updated_at")
    inlines = [StepCompletionInline]

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            "student", "student__profile", "quest_assignment__quest", "group", "current_step"
        )


class ChecklistItemCompletionInline(admin.TabularInline):
    model = ChecklistItemCompletion
    extra = 0
    fields = ("step_checklist", "is_checked", "checked_at")
    autocomplete_fields = ["step_checklist"]


@admin.register(StepCompletion)
class StepCompletionAdmin(admin.ModelAdmin):
    list_display = ("quest_progress", "quest_step", "completed_by", "completed_at")
    list_filter = ("quest_step__quest",)
    search_fields = ("quest_progress__student__username", "quest_step__instruction")
    autocomplete_fields = ["quest_progress", "quest_step", "completed_by"]
    readonly_fields = ("created_at", "updated_at")
    inlines = [ChecklistItemCompletionInline]

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            "quest_progress__student", "quest_step", "completed_by"
        )


@admin.register(ChecklistItemCompletion)
class ChecklistItemCompletionAdmin(admin.ModelAdmin):
    list_display = ("step_completion", "step_checklist", "is_checked", "checked_at")
    list_filter = ("is_checked",)
    search_fields = ("step_checklist__checklist_text", "step_completion__quest_progress__student__username")
    autocomplete_fields = ["step_completion", "step_checklist"]

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            "step_completion__quest_progress__student", "step_checklist"
        )