import csv
import io
from django.db import IntegrityError, transaction
from django.http import HttpResponse

from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView, PermissionDenied
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.accounts.models import User, UserProfile
from apps.accounts.permissions import IsAdmin
from apps.core.mixins import ReadAfterWriteMixin

from .models import SecurityQuestion, UserSecurityAnswer
from .serializers import (
    AdminUserCreateSerializer,
    AdminUserUpdateSerializer,
    BulkUserRowSerializer,
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    ForgotPasswordResetSerializer,
    SecurityQuestionSerializer,
    SelfProfileUpdateSerializer,
    UserSerializer,
)
from .utils import blacklist_all_tokens_for_user, generate_simple_password


# ADMIN CRUD
class AdminUserListCreateView(ReadAfterWriteMixin, generics.ListCreateAPIView):
    read_serializer_class = UserSerializer
    permission_classes = [IsAdmin]
    queryset = User.objects.all().select_related("profile")

    def get_serializer_class(self):
        return AdminUserCreateSerializer if self.request.method == "POST" else UserSerializer


class AdminUserDetailView(ReadAfterWriteMixin, generics.RetrieveUpdateDestroyAPIView):
    read_serializer_class = UserSerializer
    permission_classes = [IsAdmin]
    queryset = User.objects.all().select_related("profile")

    def get_serializer_class(self):
        return AdminUserUpdateSerializer if self.request.method in ("PUT", "PATCH") else UserSerializer

    def perform_destroy(self, instance):
        from .utils import is_last_active_admin
        if is_last_active_admin(instance):
            raise PermissionDenied(
                "This is the only active admin account. Promote another user to admin before deactivating this one."
            )
        instance.is_active = False  # soft-delete instead of hard delete
        instance.save()
        blacklist_all_tokens_for_user(instance)


class AdminBulkUserUploadView(APIView):
    """Admin-only CSV bulk account creation. Accounts only — no class enrollment."""
    permission_classes = [IsAdmin]

    def post(self, request):
        from apps.core.models import SystemSettings
        if not SystemSettings.get_solo().bulk_upload_enabled:
            return Response(
                {"detail": "Bulk upload is currently disabled by system settings."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Retrieve the file from the request
        csv_file = request.FILES.get("file") or request.FILES.get("csv_file")
        if not csv_file:
            return Response(
                {"detail": "No CSV file was provided. Please attach a 'file' in multipart/form-data."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            decoded = csv_file.read().decode("utf-8-sig")  # -sig strips a BOM if Excel added one
        except UnicodeDecodeError:
            return Response(
                {"detail": "Could not decode file. Please upload a UTF-8 encoded CSV."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reader = csv.DictReader(io.StringIO(decoded))
        created, errors = [], []

        for row_number, raw_row in enumerate(reader, start=2):  # row 1 is the header
            row = {k.strip(): (v.strip() if v else "") for k, v in raw_row.items() if k}

            serializer = BulkUserRowSerializer(data=row)
            if not serializer.is_valid():
                errors.append({
                    "row": row_number,
                    "username": row.get("username", ""),
                    "errors": serializer.errors,
                })
                continue

            data = serializer.validated_data
            password = generate_simple_password()

            try:
                # All-or-nothing per row: never leave a User without a UserProfile.
                with transaction.atomic():
                    user = User(username=data["username"], role=data["role"])
                    user.set_password(password)
                    user.save()

                    UserProfile.objects.create(
                        user=user,
                        first_name=data["first_name"],
                        last_name=data["last_name"],
                        middle_name=data.get("middle_name", ""),
                        email=data.get("email") or None,  # avoid "" colliding on the unique constraint
                        school=data.get("school", ""),
                        grade_level=data.get("grade_level", ""),
                        section=data.get("section", ""),
                        occupation=data.get("occupation", ""),
                    )
            except IntegrityError:
                errors.append({
                    "row": row_number,
                    "username": data["username"],
                    "errors": {"detail": ["Username or email already exists."]},
                })
                continue

            created.append({
                "username": user.username,
                "password": password,
                "role": user.role,
                "name": f'{data["first_name"]} {data["last_name"]}'.strip(),
            })

        if request.query_params.get("download") == "csv" and created:
            return self._as_csv_download(created)

        resp = Response(
            {
                "created_count": len(created),
                "error_count": len(errors),
                "created": created,
                "errors": errors,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_400_BAD_REQUEST,
        )
        resp["Cache-Control"] = "no-store"  # response contains plaintext passwords
        return resp

    @staticmethod
    def _safe_cell(value):
        """Stop Excel from running a value like '=cmd...' as a formula."""
        s = str(value)
        return "'" + s if s[:1] in ("=", "+", "-", "@", "\t", "\r") else s

    def _as_csv_download(self, created):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="new_accounts.csv"'
        response["Cache-Control"] = "no-store"
        writer = csv.writer(response)
        writer.writerow(["name", "username", "password", "role"])
        for row in created:
            writer.writerow([
                self._safe_cell(row["name"]),
                self._safe_cell(row["username"]),
                row["password"],
                row["role"],
            ])
        return response


# AUTHENTICATION & PASSWORD
class LoginView(TokenObtainPairView):
    """Login view that uses the custom token serializer."""
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.save()
        blacklist_all_tokens_for_user(user)

        # Only fires the first time, since validate() only requires
        # security_answers when fewer than 3 already exist.
        answers = serializer.validated_data.get("security_answers")
        if answers and user.security_answers.count() < 3:
            for item in answers:
                answer_obj = UserSecurityAnswer(user=user, question_id=item["question_id"])
                answer_obj.set_answer(item["answer"])
                answer_obj.save()

        return Response({"detail": "Password updated successfully."}, status=status.HTTP_200_OK)


class AdminResetPasswordView(APIView):
    """Admin resets a user's forgotten password. Generates a new one
    (same short/simple style as bulk upload) and immediately invalidates
    any sessions that were using the old password."""
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        user = generics.get_object_or_404(User, pk=pk)
        new_password = generate_simple_password()
        user.set_password(new_password)
        user.save()
        blacklist_all_tokens_for_user(user)

        resp = Response({
            "username": user.username,
            "new_password": new_password,
            "detail": "Password reset. Give this password to the user — it won't be shown again.",
        })
        resp["Cache-Control"] = "no-store"  # response contains a plaintext password
        return resp


class SecurityQuestionListView(generics.ListAPIView):
    """Full preset list — used by the change-password screen's question picker."""
    permission_classes = [IsAuthenticated]
    queryset = SecurityQuestion.objects.all()
    serializer_class = SecurityQuestionSerializer


class ForgotPasswordQuestionsView(APIView):
    """Step 1 of forgot-password: given a username, return THAT user's
    specific 3 questions (not the full preset list)."""
    permission_classes = [AllowAny]

    def get(self, request):
        from apps.core.models import SystemSettings
        if not SystemSettings.get_solo().self_service_password_reset_enabled:
            return Response(
                {"detail": "Self-service password reset is currently disabled. Please contact your administrator."},
                status=status.HTTP_403_FORBIDDEN,
            )

        username = request.query_params.get("username")
        if not username:
            return Response({"detail": "username is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"detail": "No account found."}, status=status.HTTP_404_NOT_FOUND)

        answers = user.security_answers.select_related("question").all()
        if answers.count() < 3:
            return Response(
                {"detail": "Security questions aren't set up for this account. Please contact your teacher or admin."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        questions = [{"question_id": a.question.id, "question_text": a.question.question_text} for a in answers]
        return Response({"questions": questions})


class ForgotPasswordResetView(APIView):
    """Step 2: submit the 3 answers + new password."""
    permission_classes = [AllowAny]

    def post(self, request):
        from apps.core.models import SystemSettings
        if not SystemSettings.get_solo().self_service_password_reset_enabled:
            return Response(
                {"detail": "Self-service password reset is currently disabled. Please contact your administrator."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ForgotPasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        user.set_password(serializer.validated_data["new_password"])
        user.save()
        blacklist_all_tokens_for_user(user)
        return Response({"detail": "Password reset successful. You can now log in with your new password."})


# PROFILE VIEW
class MyProfileView(generics.RetrieveUpdateAPIView):
    """
    Deliberately NOT using ReadAfterWriteMixin here, unlike the admin views
    above. That mixin's update() re-serializes serializer.instance after
    save() using read_serializer_class — which works everywhere else in
    this file because the written object and the read object are the same
    model. Here they're not: get_object() returns UserProfile for writes
    (PATCH/PUT, since SelfProfileUpdateSerializer only touches profile
    fields) but User for reads (GET, via UserSerializer). Reusing the
    mixin would hand a UserProfile into UserSerializer post-save and crash
    on `username` (UserProfile has no such field — it lives on the related
    User). So update() is overridden here to read back from request.user
    (the actual User) instead of serializer.instance (the UserProfile).
    """
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return SelfProfileUpdateSerializer if self.request.method in ("PUT", "PATCH") else UserSerializer

    def get_object(self):
        return self.request.user.profile if self.request.method in ("PUT", "PATCH") else self.request.user

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        profile = self.get_object()  # UserProfile — correct target for the write

        write_serializer = self.get_serializer(profile, data=request.data, partial=partial)
        write_serializer.is_valid(raise_exception=True)
        write_serializer.save()

        # Read back through request.user (User), not write_serializer.instance
        # (UserProfile) — UserSerializer expects User fields (username, role,
        # etc.) with `profile` nested inside, not a bare UserProfile.
        read_serializer = UserSerializer(request.user, context=self.get_serializer_context())
        return Response(read_serializer.data)