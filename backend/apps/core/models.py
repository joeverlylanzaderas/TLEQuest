# backend/apps/core/models.py
from django.db import models


class TimestampedModel(models.Model):
    """Abstract base — inherit this instead of hand-declaring
    created_at/updated_at on every new model."""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SystemSettings(models.Model):
    """Singleton — exactly one row ever exists. Use SystemSettings.get_solo()
    to fetch it, never .objects.create() directly."""
    school_name = models.CharField(max_length=150, blank=True)
    school_year = models.CharField(max_length=20, blank=True)  # e.g. "2026-2027"
    primary_color = models.CharField(max_length=7, default="#ea580c")  # hex, for branding

    min_password_length = models.PositiveIntegerField(default=8)

    bulk_upload_enabled = models.BooleanField(default=True)
    self_service_password_reset_enabled = models.BooleanField(default=True)

    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        self.pk = 1  # enforce singleton — always overwrites the same row
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return "System Settings"