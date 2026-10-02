# backend/apps/quests/urls.py
from django.urls import path
from .views import (
    QuestListCreateView, QuestDetailView,
    QuestStepListCreateView, QuestStepDetailView,
    StepChecklistListCreateView, StepChecklistDetailView,
)

urlpatterns = [
    path("quests/", QuestListCreateView.as_view(), name="quest_list_create"),
    path("quests/<int:pk>/", QuestDetailView.as_view(), name="quest_detail"),
    path("quests/<int:quest_id>/steps/", QuestStepListCreateView.as_view(), name="step_list_create"),
    path("steps/<int:pk>/", QuestStepDetailView.as_view(), name="step_detail"),
    path("steps/<int:step_id>/checklist/", StepChecklistListCreateView.as_view(), name="checklist_list_create"),
    path("checklist/<int:pk>/", StepChecklistDetailView.as_view(), name="checklist_detail"),
]