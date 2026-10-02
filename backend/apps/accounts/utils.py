# apps/accounts/utils.py
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
import secrets
import string

_SAFE_PASSWORD_CHARS = string.ascii_letters + string.digits
for _ambiguous in "0O1lI":
    _SAFE_PASSWORD_CHARS = _SAFE_PASSWORD_CHARS.replace(_ambiguous, "")


def generate_simple_password(length=None):
    if length is None:
        from apps.core.models import SystemSettings
        length = max(SystemSettings.get_solo().min_password_length, 8)  # never generate below 8, even if policy is lower
    return "".join(secrets.choice(_SAFE_PASSWORD_CHARS) for _ in range(length))


def blacklist_all_tokens_for_user(user):
    for token in user.outstandingtoken_set.filter(blacklistedtoken__isnull=True):
        try:
            RefreshToken(token.token).blacklist()
        except TokenError:
            continue


def is_last_active_admin(user):
    """True if `user` is an active admin AND no other active admin exists.
    Used to block actions that would leave the system with zero admins."""
    from .models import User  # local import avoids a circular import at module load time
    if user.role != "admin" or not user.is_active:
        return False
    other_active_admins = User.objects.filter(role="admin", is_active=True).exclude(pk=user.pk)
    return not other_active_admins.exists()


def custom_user_authentication_rule(user):
    return user is not None