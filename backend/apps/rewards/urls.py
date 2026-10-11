# backend/apps/submissions/urls.py
from django.urls import path
from .views import (
    RewardListCreateView, RewardDetailView,
    QuestStepRewardListCreateView, StudentRewardListView, StudentRewardSummaryView,
)

urlpatterns = [
    path("rewards/", RewardListCreateView.as_view(), name="reward_list_create"),
    path("rewards/<int:pk>/", RewardDetailView.as_view(), name="reward_detail"),
    path("steps/<int:step_id>/rewards/", QuestStepRewardListCreateView.as_view(), name="step_reward_list_create"),
    path("student-rewards/", StudentRewardListView.as_view(), name="student_reward_list"),
    path("student-rewards/summary/", StudentRewardSummaryView.as_view(), name="student_reward_summary"),
]