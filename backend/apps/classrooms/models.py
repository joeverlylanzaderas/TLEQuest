# backend/apps/classrooms/models.py
from django.db import models
from django.conf import settings
import secrets
import string


INVITE_CODE_CHARS = string.ascii_uppercase + string.digits
for _ambiguous in "0O1IL":
    INVITE_CODE_CHARS = INVITE_CODE_CHARS.replace(_ambiguous, "")


def generate_invite_code(length=6):
    while True:
        code = "".join(secrets.choice(INVITE_CODE_CHARS) for _ in range(length))
        if not Class.objects.filter(invite_code=code).exists():
            return code


class Class(models.Model):
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="classes_taught",
        limit_choices_to={"role": "teacher"},
    )
    class_name  = models.CharField(max_length=100)
    subject     = models.CharField(max_length=100, blank=True)
    section     = models.CharField(max_length=50, blank=True)
    school_year = models.CharField(max_length=20, blank=True)  # e.g. "2025-2026"
    invite_code = models.CharField(max_length=10, unique=True, blank=True, editable=False)
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        
    def save(self, *args, **kwargs):
        if not self.invite_code:
            self.invite_code = generate_invite_code()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.class_name} ({self.section})"


class ClassEnrollment(models.Model):
    class_obj = models.ForeignKey(Class, on_delete=models.CASCADE, related_name="enrollments")
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="class_enrollments",
        limit_choices_to={"role": "student"},
    )
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # A student can join many classes, but only once each — prevents
        # duplicate rows from re-entering the same invite code twice
        constraints = [
            models.UniqueConstraint(fields=["class_obj", "student"], name="unique_class_enrollment")
        ]
        ordering = ["-enrolled_at"]

    def __str__(self):
        return f"{self.student.username} enrolled in {self.class_obj.class_name}"


class Group(models.Model):
    class_obj = models.ForeignKey(Class, on_delete=models.CASCADE, related_name="groups")
    leader = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="groups_led",
        limit_choices_to={"role": "student"},
    )
    group_number = models.PositiveIntegerField()
    group_name   = models.CharField(max_length=100, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["class_obj", "group_number"], name="unique_group_number_per_class")
        ]
        ordering = ["class_obj", "group_number"]

    def __str__(self):
        return self.group_name or f"Group {self.group_number} ({self.class_obj.class_name})"


class GroupMember(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="members")
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="group_memberships",
        limit_choices_to={"role": "student"},
    )
    member_role = models.CharField(max_length=30, blank=True)  # free text, e.g. "Recorder", "Presenter"
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["group", "student"], name="unique_group_membership")
        ]
        ordering = ["-joined_at"]

    def __str__(self):
        return f"{self.student.username} in {self.group}"