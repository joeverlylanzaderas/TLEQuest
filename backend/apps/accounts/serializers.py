# backend/apps/accounts/serializers.py
from django.contrib.auth.models import update_last_login
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from .models import User, UserProfile, SecurityQuestion, UserSecurityAnswer


# Security question serializers — defined first, since ChangePasswordSerializer
# and ForgotPasswordResetSerializer both reference SecurityAnswerInputSerializer
class SecurityQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SecurityQuestion
        fields = ["id", "question_text"]

class SecurityAnswerInputSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    answer = serializers.CharField()


# Shared password-length check — reads the admin-configurable minimum from
# SystemSettings instead of a hardcoded number, so System Settings' security
# policy actually takes effect everywhere a password gets set.
def validate_password_length(value):
    from apps.core.models import SystemSettings
    min_length = SystemSettings.get_solo().min_password_length
    if len(value) < min_length:
        raise serializers.ValidationError(f"Password must be at least {min_length} characters.")
    return value


# Custom serializer for obtaining JWT tokens with additional user information
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["user_id"] = user.id
        return token

    def validate(self, attrs):
        data = super().validate(attrs)

        if not self.user.is_active:
            raise AuthenticationFailed(
                "This account has been deactivated. Contact your administrator.",
                code="account_inactive",
            )

        update_last_login(None, self.user)
        data["user_id"] = self.user.id
        data["username"] = self.user.username
        data["role"] = self.user.role
        return data


# Serializer for Changing Password
class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)   # min_length removed — now dynamic
    security_answers = SecurityAnswerInputSerializer(many=True, required=False)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value

    def validate_new_password(self, value):
        return validate_password_length(value)

    def validate(self, attrs):
        user = self.context['request'].user
        if user.security_answers.count() < 3:
            answers = attrs.get('security_answers')
            if not answers or len(answers) != 3:
                raise serializers.ValidationError({
                    "security_answers": "Set up exactly 3 security questions the first time you change your password."
                })
            question_ids = [a['question_id'] for a in answers]
            if len(set(question_ids)) != 3:
                raise serializers.ValidationError({"security_answers": "Choose 3 different questions."})
            valid_count = SecurityQuestion.objects.filter(id__in=question_ids).count()
            if valid_count != 3:
                raise serializers.ValidationError({"security_answers": "One or more selected questions are invalid."})
        return attrs


# Serializer for Password Reset via Security Questions
class ForgotPasswordResetSerializer(serializers.Serializer):
    username = serializers.CharField()
    answers = SecurityAnswerInputSerializer(many=True)
    new_password = serializers.CharField()   # min_length removed — now dynamic

    def validate_new_password(self, value):
        return validate_password_length(value)

    def validate(self, attrs):
        try:
            user = User.objects.get(username=attrs['username'])
        except User.DoesNotExist:
            raise serializers.ValidationError({"username": "No account found."})

        stored = {a.question_id: a for a in user.security_answers.all()}
        if len(stored) < 3:
            raise serializers.ValidationError(
                "Security questions aren't set up for this account. Please contact your teacher or admin."
            )

        submitted = attrs['answers']
        if len(submitted) != 3:
            raise serializers.ValidationError("All 3 answers are required.")

        for item in submitted:
            answer_row = stored.get(item['question_id'])
            if not answer_row or not answer_row.check_answer(item['answer']):
                raise serializers.ValidationError("One or more answers are incorrect.")

        attrs['user'] = user
        return attrs


# Serializer for User Profile
class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = '__all__'
        read_only_fields = ["user", "created_at", "updated_at"]


# Serializer for User
class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'role', 'is_active', 'is_staff', 'date_joined', 'profile']
        read_only_fields = ["id", "role", "date_joined", "is_staff"]


# Serializer for updating user profile
class SelfProfileUpdateSerializer(serializers.ModelSerializer):
    """What a logged-in user can edit about themselves — never role, username, or is_active."""
    class Meta:
        model = UserProfile
        fields = [
            "profile_picture", "first_name", "middle_name", "last_name",
            "email", "occupation", "school", "grade_level", "section",
        ]

    def validate_email(self, value):
        return value or None


# Serializer for Admin User Creation and Update
class AdminUserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)   # min_length removed — now dynamic

    class Meta:
        model = User
        fields = ["id", "username", "password", "role"]

    def validate_password(self, value):
        return validate_password_length(value)

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        UserProfile.objects.create(user=user)  # empty profile, filled in later
        return user


# Serializer for Admin User Update
class AdminUserUpdateSerializer(serializers.ModelSerializer):
    """Admin can touch role/is_active — self-service serializer above deliberately can't."""
    class Meta:
        model = User
        fields = ["username", "role", "is_active"]

    def validate(self, attrs):
        from .utils import is_last_active_admin
        instance = self.instance

        would_lose_admin_role = "role" in attrs and attrs["role"] != "admin"
        would_deactivate = "is_active" in attrs and attrs["is_active"] is False

        if instance and is_last_active_admin(instance) and (would_lose_admin_role or would_deactivate):
            raise serializers.ValidationError(
                "This is the only active admin account. Promote another user to admin before removing this one."
            )
        return attrs


# Serializer for Bulk User Upload
class BulkUserRowSerializer(serializers.Serializer):
    username        = serializers.CharField(max_length=150)  # the student ID
    role            = serializers.ChoiceField(choices=User.Role.choices)
    first_name      = serializers.CharField(max_length=30)
    last_name       = serializers.CharField(max_length=30)
    middle_name     = serializers.CharField(max_length=30, required=False, allow_blank=True)
    email           = serializers.EmailField(required=False, allow_blank=True)
    school          = serializers.CharField(max_length=50, required=False, allow_blank=True)
    grade_level     = serializers.CharField(max_length=20, required=False, allow_blank=True)
    section         = serializers.CharField(max_length=20, required=False, allow_blank=True)
    occupation      = serializers.CharField(max_length=20, required=False, allow_blank=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username (student ID) already exists.")
        return value

    def validate_email(self, value):
        if value and UserProfile.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already in use by another account.")
        return value