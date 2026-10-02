# backend/apps/classrooms/urls.py
from django.urls import path
from .views import (
    ClassListCreateView, ClassDetailView, JoinClassView,
    ClassEnrollmentListView, RemoveEnrollmentView,
    GroupListCreateView, GroupDetailView,
    GroupMemberListCreateView, GroupMemberDetailView,
)

urlpatterns = [
    path("classes/", ClassListCreateView.as_view(), name="class_list_create"),
    path("classes/<int:pk>/", ClassDetailView.as_view(), name="class_detail"),
    
    path("classes/join/", JoinClassView.as_view(), name="join_class"),
    path("classes/<int:class_id>/enrollments/", ClassEnrollmentListView.as_view(), name="class_enrollments"),
    
    path("enrollments/<int:pk>/", RemoveEnrollmentView.as_view(), name="remove_enrollment"),
    path("classes/<int:class_id>/groups/", GroupListCreateView.as_view(), name="group_list_create"),
    
    path("groups/<int:pk>/", GroupDetailView.as_view(), name="group_detail"),
    path("groups/<int:group_id>/members/", GroupMemberListCreateView.as_view(), name="group_member_list_create"),
    path("groups/members/<int:pk>/", GroupMemberDetailView.as_view(), name="group_member_detail"),
]