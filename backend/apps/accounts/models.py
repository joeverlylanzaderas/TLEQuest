# Django models for the accounts app
# backend/apps/accounts/models.py
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.contrib.auth.hashers import make_password, check_password

# Custom User Manager
class UserManager(BaseUserManager):
    def create_user(self, username, password=None, **extra_fields):
        if not username:
            raise ValueError("Username is required")
        user = self.model(username=username, **extra_fields)
        user.set_password(password) #hashed password
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "admin")
        return self.create_user(username, password, **extra_fields)


# User model
class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        STUDENT = "student", "Student"
        TEACHER = "teacher", "Teacher"
        ADMIN   = "admin", "Admin"

    username    = models.CharField(max_length=50, unique=True)
    role        = models.CharField(max_length=20, choices=Role.choices)
    is_active   = models.BooleanField(default=True)
    is_staff    = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = []  #only username + password needed to create a user

    def __str__(self):
        try:
            full_name = f"{self.profile.first_name} {self.profile.last_name}".strip()
        except UserProfile.DoesNotExist:
            full_name = ""
        return f"{self.username} — {full_name}" if full_name else self.username


# User Profile model
class UserProfile(models.Model):
    user                = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    profile_picture     = models.ImageField(upload_to='profile_pictures/', blank=True, null=True)
    first_name          = models.CharField(max_length=30, blank=True)
    middle_name         = models.CharField(max_length=30, blank=True)
    last_name           = models.CharField(max_length=30, blank=True)
    email               = models.EmailField(unique=True, null=True, blank=True)
    occupation          = models.CharField(max_length=20, blank=True)
    school              = models.CharField(max_length=50, blank=True)
    grade_level         = models.CharField(max_length=20, blank=True)
    section             = models.CharField(max_length=20, blank=True)
    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"
    
    
#Password Reset Security Model
class SecurityQuestion(models.Model):
    question_text = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.question_text


class UserSecurityAnswer(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="security_answers")
    question = models.ForeignKey(SecurityQuestion, on_delete=models.CASCADE, related_name="+")
    answer_hash = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "question"], name="unique_answer_per_question_per_user")
        ]

    def set_answer(self, raw_answer):
        # Normalize (trim + lowercase) before hashing, so "Manila" and
        # "manila" both work later — same relaxed matching a real student
        # needs, without weakening the actual hash itself.
        make_password_input = raw_answer.strip().lower()
        self.answer_hash = make_password(make_password_input)

    def check_answer(self, raw_answer):
        return check_password(raw_answer.strip().lower(), self.answer_hash)
