# backend/apps/core/urls.py
from django.urls import path
from .views import SystemSettingsView, TeacherDashboardSummaryView, AdminReportsView

urlpatterns = [
    path("teacher-dashboard/", TeacherDashboardSummaryView.as_view(), name="teacher_dashboard_summary"),
    path("admin-reports/", AdminReportsView.as_view(), name="admin_reports"),
    path("system-settings/", SystemSettingsView.as_view(), name="system_settings"),
]