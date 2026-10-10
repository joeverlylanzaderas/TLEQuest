# backend/apps/quests/admin.py
from django.contrib import admin
from .models import Quest, QuestStep, StepChecklist


class StepChecklistInline(admin.TabularInline):
    model = StepChecklist
    extra = 1
    fields = ("checklist_text", "order_index")


class QuestStepInline(admin.TabularInline):
    model = QuestStep
    extra = 1
    fields = ("step_order", "title", "instruction", "is_final_step", "is_required")
    show_change_link = True


@admin.register(Quest)
class QuestAdmin(admin.ModelAdmin):
    list_display = ("title", "teacher", "table_setting_type", "is_published", "total_steps_display", "created_at")
    list_filter = ("is_published", "table_setting_type", "classes")
    search_fields = ("title", "classes__class_name", "teacher__username")
    autocomplete_fields = ["classes", "teacher"]
    readonly_fields = ("created_at", "updated_at")
    inlines = [QuestStepInline]

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("teacher", "teacher__profile").prefetch_related("classes")

    def total_steps_display(self, obj):
        return obj.total_steps
    total_steps_display.short_description = "Steps"


@admin.register(QuestStep)
class QuestStepAdmin(admin.ModelAdmin):
    list_display = ("quest", "step_order", "title", "is_final_step", "is_required")
    list_filter = ("quest", "is_final_step")
    search_fields = ("quest__title", "instruction")
    autocomplete_fields = ["quest"]
    readonly_fields = ("created_at", "updated_at")
    inlines = [StepChecklistInline]

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("quest")


@admin.register(StepChecklist)
class StepChecklistAdmin(admin.ModelAdmin):
    list_display = ("quest_step", "checklist_text", "order_index")
    list_filter = ("quest_step__quest",)
    search_fields = ("checklist_text", "quest_step__quest__title")
    autocomplete_fields = ["quest_step"]

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("quest_step", "quest_step__quest")