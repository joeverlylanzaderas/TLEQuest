# backend/apps/core/serializers.py
from rest_framework import serializers
from .models import SystemSettings

class SystemSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSettings
        fields = [
            "school_name", "school_year", "theme",
            "min_password_length", "bulk_upload_enabled",
            "self_service_password_reset_enabled", "updated_at",
        ]
        read_only_fields = ["updated_at"]


class PublicThemeSerializer(serializers.ModelSerializer):
    """What the mobile app may read before logging in: only look-and-feel."""
    class Meta:
        model = SystemSettings
        fields = ["theme", "school_name"]
        read_only_fields = fields