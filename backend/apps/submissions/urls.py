# backend/apps/submissions/urls.py
from django.urls import path
from .views import SubmissionListCreateView, SubmissionDetailView, TeacherReviewView

urlpatterns = [
    path("submissions/", SubmissionListCreateView.as_view(), name="submission_list_create"),
    path("submissions/<int:pk>/", SubmissionDetailView.as_view(), name="submission_detail"),
    path("submissions/<int:pk>/review/", TeacherReviewView.as_view(), name="submission_review"),
]