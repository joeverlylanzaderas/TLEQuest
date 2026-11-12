# backend/apps/accounts/audit.py
# One small helper to write audit rows. It must never break the real request.
import logging

from rest_framework.throttling import BaseThrottle

logger = logging.getLogger(__name__)


def client_ip(request):
    """Same proxy-aware logic DRF throttling uses (respects REST_FRAMEWORK['NUM_PROXIES'])."""
    try:
        return BaseThrottle().get_ident(request) or None
    except Exception:
        return None


def log_action(request, action, target=None, *, actor=None, actor_username=None, target_label=None, **details):
    """Record `action`. `target` is a User (optional); extra keyword arguments go into `details`."""
    from .models import AuditLog
    try:
        if actor is None:
            u = getattr(request, "user", None)
            actor = u if getattr(u, "is_authenticated", False) else None
        AuditLog.objects.create(
            actor=actor,
            actor_username=(actor_username or (actor.username if actor else ""))[:150],
            action=action,
            target_id=getattr(target, "pk", None),
            target_label=(target_label or (getattr(target, "username", "") if target else ""))[:150],
            details={k: v for k, v in details.items() if v is not None},
            ip_address=client_ip(request),
        )
    except Exception:  # pragma: no cover - logging must not take the request down
        logger.exception("Could not write audit log entry %s", action)
