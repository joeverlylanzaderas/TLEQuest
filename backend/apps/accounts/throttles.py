# backend/apps/accounts/throttles.py
# Rate limits for the endpoints that can be brute-forced (login, forgot-password).
# Rates live in settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] (and can be changed from .env).
#
# Two layers on purpose:
#  - *_user : per IP + username  (stops guessing ONE account's password; a whole class on the
#             same school wifi is not affected because each student has a different username)
#  - *_ip   : per IP only, a much higher cap (stops one machine trying many accounts)
import hashlib

from rest_framework.throttling import SimpleRateThrottle


def _username(request):
    try:
        value = request.data.get("username") or request.query_params.get("username") or ""
    except Exception:
        value = ""
    return str(value).strip().lower()[:150]


class _IPThrottle(SimpleRateThrottle):
    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class _UserIPThrottle(SimpleRateThrottle):
    def get_cache_key(self, request, view):
        raw = f"{self.get_ident(request)}|{_username(request)}"
        return self.cache_format % {"scope": self.scope, "ident": hashlib.sha256(raw.encode()).hexdigest()}


class LoginUserThrottle(_UserIPThrottle):
    scope = "login_user"


class LoginIPThrottle(_IPThrottle):
    scope = "login_ip"


class PasswordResetUserThrottle(_UserIPThrottle):
    scope = "reset_user"


class PasswordResetIPThrottle(_IPThrottle):
    scope = "reset_ip"
