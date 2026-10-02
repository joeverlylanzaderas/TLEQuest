# backend/apps/assignments/urls.py
from django.urls import path
from .views import AssignQuestView, QuestProgressListView, QuestProgressDetailView, ChecklistItemToggleView

urlpatterns = [
    path("assign/", AssignQuestView.as_view(), name="assign_quest"),
    path("progress/", QuestProgressListView.as_view(), name="progress_list"),
    path("progress/<int:pk>/", QuestProgressDetailView.as_view(), name="progress_detail"),
    path(
        "progress/<int:progress_id>/steps/<int:step_id>/checklist/<int:checklist_id>/",
        ChecklistItemToggleView.as_view(),
        name="checklist_toggle",
    ),
]