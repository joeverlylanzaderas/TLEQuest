# backend/apps/rewards/admin.py
from django.contrib import admin
from .models import Reward, QuestStepReward, StudentReward


@admin.register(Reward)
class RewardAdmin(admin.ModelAdmin):
    list_display = ("reward_name", "reward_type", "points_value")
    list_filter = ("reward_type",)
    search_fields = ("reward_name",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(QuestStepReward)
class QuestStepRewardAdmin(admin.ModelAdmin):
    list_display = ("quest_step", "reward", "effective_points_display", "reward_condition")
    list_filter = ("reward__reward_type", "quest_step__quest")
    search_fields = ("quest_step__title", "reward__reward_name")
    autocomplete_fields = ["quest_step", "reward"]
    readonly_fields = ("created_at", "updated_at")

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("quest_step", "quest_step__quest", "reward")

    def effective_points_display(self, obj):
        return obj.effective_points
    effective_points_display.short_description = "Points (effective)"


@admin.register(StudentReward)
class StudentRewardAdmin(admin.ModelAdmin):
    list_display = ("student", "reward", "quest_assignment", "earned_at")
    list_filter = ("reward__reward_type", "quest_assignment__quest")
    search_fields = ("student__username", "reward__reward_name")
    autocomplete_fields = ["student", "reward", "quest_assignment", "quest_step_reward"]
    readonly_fields = ("earned_at", "created_at", "updated_at")

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            "student", "student__profile", "reward", "quest_assignment__quest"
        )

    def has_add_permission(self, request):
        # StudentReward is meant to be auto-granted only (via the checklist
        # toggle hook), not manually created — see note below.
        return False