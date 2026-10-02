# apps/accounts/backends.py
from django.contrib.auth.backends import ModelBackend

class AllowInactiveAuthBackend(ModelBackend):
    """Lets authenticate() return inactive users too — deactivation is
    enforced explicitly in CustomTokenObtainPairSerializer instead,
    so we can return a specific, actionable error message."""
    def user_can_authenticate(self, user):
        return True