# backend/apps/core/serializers.py
from rest_framework import serializers
from .models import SystemSettings

class SystemSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSettings
        fields = [
            "school_name", "school_year", "primary_color",
            "min_password_length", "bulk_upload_enabled",
            "self_service_password_reset_enabled", "updated_at",
        ]
        read_only_fields = ["updated_at"]