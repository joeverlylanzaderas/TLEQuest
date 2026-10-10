# backend/apps/assignments/urls.py
from django.urls import path
from .views import (
    AssignQuestView, QuestAssignmentListView, QuestAssignmentUpdateView,
    QuestProgressListView, QuestProgressDetailView, ChecklistItemToggleView,
)

urlpatterns = [
    path("assign/", AssignQuestView.as_view(), name="assign_quest"),
    path("assignments/", QuestAssignmentListView.as_view(), name="assignment_list"),
    path("assignments/<int:pk>/", QuestAssignmentUpdateView.as_view(), name="assignment_update"),
    path("progress/", QuestProgressListView.as_view(), name="progress_list"),
    path("progress/<int:pk>/", QuestProgressDetailView.as_view(), name="progress_detail"),
    path(
        "progress/<int:progress_id>/steps/<int:step_id>/checklist/<int:checklist_id>/",
        ChecklistItemToggleView.as_view(),
        name="checklist_toggle",
    ),
]