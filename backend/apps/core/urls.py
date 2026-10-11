# backend/apps/core/urls.py
from django.urls import path
from .views import SystemSettingsView, TeacherDashboardSummaryView, AdminReportsView, DailyActivityView

urlpatterns = [
    path("teacher-dashboard/", TeacherDashboardSummaryView.as_view(), name="teacher_dashboard_summary"),
    path("daily-activity/", DailyActivityView.as_view(), name="daily_activity"),
    path("admin-reports/", AdminReportsView.as_view(), name="admin_reports"),
    path("system-settings/", SystemSettingsView.as_view(), name="system_settings"),
]