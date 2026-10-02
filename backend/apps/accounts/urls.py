# backend/apps/accounts/urls.py

# apps/accounts/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ForgotPasswordResetView,
    LoginView,
    ChangePasswordView,
    MyProfileView,
    AdminUserListCreateView,
    AdminUserDetailView,
    AdminBulkUserUploadView,
    AdminResetPasswordView,
    SecurityQuestionListView,
    ForgotPasswordQuestionsView,
)

urlpatterns = [
    # Auth
    path("login/",  LoginView.as_view(), name="login"),
    path("login/refresh/", TokenRefreshView.as_view(), name="login_refresh"),
    path("change-password/", ChangePasswordView.as_view(), name="change_password"),
    
    # Security Questions
    path("security-questions/", SecurityQuestionListView.as_view(), name="security_question_list"),
    path("forgot-password/questions/", ForgotPasswordQuestionsView.as_view(), name="forgot_password_questions"),
    path("forgot-password/reset/", ForgotPasswordResetView.as_view(), name="forgot_password_reset"),

    # Self-service
    path("me/", MyProfileView.as_view(), name="my_profile"),

    # Admin CRUD
    path("admin/users/", AdminUserListCreateView.as_view(), name="admin_user_list_create"),
    path("admin/users/<int:pk>/", AdminUserDetailView.as_view(), name="admin_user_detail"),
    path("admin/users/bulk-upload/", AdminBulkUserUploadView.as_view(), name="admin_bulk_upload"),
    path("admin/users/<int:pk>/reset-password/", AdminResetPasswordView.as_view(), name="admin_reset_password"),
]