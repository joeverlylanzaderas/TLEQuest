# backend/apps/classrooms/serializers.py
from rest_framework import serializers
from apps.accounts.models import User
from .models import Class, ClassEnrollment, Group, GroupMember


class TeacherMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username"]


class StudentMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username"]


class StudentRosterSerializer(serializers.ModelSerializer):
    """Richer than StudentMiniSerializer — pulls from UserProfile too,
    used specifically for classmate roster display."""
    first_name = serializers.CharField(source="profile.first_name", read_only=True)
    last_name = serializers.CharField(source="profile.last_name", read_only=True)
    section = serializers.CharField(source="profile.section", read_only=True)
    profile_picture = serializers.ImageField(source="profile.profile_picture", read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "section", "profile_picture"]


class ClassSerializer(serializers.ModelSerializer):
    """Read serializer — full detail view of a class."""
    teacher = TeacherMiniSerializer(read_only=True)
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = Class
        fields = [
            "id", "teacher", "class_name", "subject", "section",
            "school_year", "invite_code", "is_active", "student_count",
            "created_at", "updated_at",
        ]
        read_only_fields = ["invite_code", "created_at", "updated_at"]

    def get_student_count(self, obj):
        return obj.enrollments.count()


class ClassCreateSerializer(serializers.ModelSerializer):
    """POST serializer. `teacher` is required only when an admin creates a
    class on someone else's behalf — a teacher creating their own class
    doesn't send this field at all; the view fills it in as request.user."""
    class Meta:
        model = Class
        fields = ["id", "teacher", "class_name", "subject", "section", "school_year"]
        extra_kwargs = {"teacher": {"required": False}}


class JoinClassSerializer(serializers.Serializer):
    """Student self-enroll via invite code."""
    invite_code = serializers.CharField(max_length=10)

    def validate_invite_code(self, value):
        try:
            class_obj = Class.objects.get(invite_code=value.upper(), is_active=True)
        except Class.DoesNotExist:
            raise serializers.ValidationError("Invalid or inactive invite code.")
        self.context["class_obj"] = class_obj
        return value

    def validate(self, attrs):
        student = self.context["request"].user
        class_obj = self.context["class_obj"]
        if ClassEnrollment.objects.filter(class_obj=class_obj, student=student).exists():
            raise serializers.ValidationError("You are already enrolled in this class.")
        attrs["class_obj"] = class_obj
        return attrs


class ClassEnrollmentSerializer(serializers.ModelSerializer):
    student = StudentRosterSerializer(read_only=True)  

    class Meta:
        model = ClassEnrollment
        fields = ["id", "student", "class_obj", "enrolled_at"]
        read_only_fields = fields


class GroupMemberSerializer(serializers.ModelSerializer):
    student = StudentRosterSerializer(read_only=True) 

    class Meta:
        model = GroupMember
        fields = ["id", "student", "member_role", "joined_at"]
        read_only_fields = ["joined_at"]


class GroupMemberCreateSerializer(serializers.ModelSerializer):
    """Used when a teacher adds a student to a group. `group` comes from
    the URL, not the request body — set in the view, not here."""
    class Meta:
        model = GroupMember
        fields = ["student", "member_role"]

    def validate_student(self, value):
        group = self.context["group"]
        if not ClassEnrollment.objects.filter(class_obj=group.class_obj, student=value).exists():
            raise serializers.ValidationError("Student is not enrolled in this class.")
        if GroupMember.objects.filter(group=group, student=value).exists():
            raise serializers.ValidationError("Student is already in this group.")
        return value


class GroupSerializer(serializers.ModelSerializer):
    leader = StudentRosterSerializer(read_only=True)
    members = GroupMemberSerializer(many=True, read_only=True)

    class Meta:
        model = Group
        fields = ["id", "class_obj", "group_number", "group_name", "leader", "members", "created_at"]
        read_only_fields = ["created_at"]


class GroupCreateUpdateSerializer(serializers.ModelSerializer):
    """Used for both creating a group and rotating its leader later."""
    class Meta:
        model = Group
        fields = ["id", "class_obj", "group_number", "group_name", "leader"]
        read_only_fields = ["class_obj"]

    def validate_leader(self, value):
        if value is None:
            return value
        class_id = self.initial_data.get("class_obj") or (self.instance.class_obj_id if self.instance else None)
        if class_id and not ClassEnrollment.objects.filter(class_obj_id=class_id, student=value).exists():
            raise serializers.ValidationError("Leader must be enrolled in this class.")
        return value