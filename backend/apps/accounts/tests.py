from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts.models import AuditLog, User, UserProfile


class SecurityFeaturesTests(TestCase):
    def setUp(self):
        cache.clear()
        self.admin = User.objects.create_user("boss", password="Passw0rd!x", role="admin")
        UserProfile.objects.create(user=self.admin)
        self.student = User.objects.create_user("stud1", password="Passw0rd!x", role="student")
        self.api = APIClient()

    def login(self, username, password):
        return self.api.post("/api/accounts/login/", {"username": username, "password": password}, format="json")

    def auth(self):
        r = self.login("boss", "Passw0rd!x")
        self.assertEqual(r.status_code, 200)
        self.api.credentials(HTTP_AUTHORIZATION="Bearer " + r.data["access"])
        return r

    def test_login_throttle_per_username(self):
        codes = [self.login("stud1", "wrong").status_code for _ in range(7)]
        self.assertEqual(codes[:5], [401] * 5)
        self.assertEqual(codes[5], 429)
        # another account from the same IP is not blocked
        self.assertEqual(self.login("boss", "Passw0rd!x").status_code, 200)

    def test_admin_login_and_failure_are_audited_students_are_not(self):
        self.login("boss", "bad")
        self.login("stud1", "bad")
        self.login("stud1", "Passw0rd!x")
        self.login("boss", "Passw0rd!x")
        actions = list(AuditLog.objects.values_list("action", flat=True))
        self.assertEqual(sorted(actions), ["auth.login", "auth.login_failed"])

    def test_user_crud_is_audited(self):
        self.auth()
        r = self.api.post("/api/accounts/admin/users/", {
            "username": "new1", "password": "Passw0rd!x", "role": "student",
            "first_name": "Ana", "last_name": "Cruz", "email": "ana@example.com"}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        uid = r.data["id"]
        self.assertEqual(UserProfile.objects.get(user_id=uid).first_name, "Ana")
        self.api.patch(f"/api/accounts/admin/users/{uid}/", {"role": "teacher"}, format="json")
        self.api.patch(f"/api/accounts/admin/users/{uid}/", {"is_active": False}, format="json")
        self.api.post(f"/api/accounts/admin/users/{uid}/reset-password/")
        self.api.delete(f"/api/accounts/admin/users/{uid}/")
        acts = list(AuditLog.objects.filter(target_label="new1").order_by("id").values_list("action", flat=True))
        self.assertEqual(acts, ["user.create", "user.update", "user.deactivate", "user.password_reset", "user.deactivate"])
        first = AuditLog.objects.get(action="user.update")
        self.assertEqual(first.details["role_to"], "teacher")
        self.assertEqual(first.actor_username, "boss")

    def test_audit_list_admin_only_and_filters(self):
        self.auth()
        r = self.api.get("/api/accounts/admin/audit-logs/?action=auth.")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["count"], 1)
        self.api.credentials()
        r = self.login("stud1", "Passw0rd!x")
        self.api.credentials(HTTP_AUTHORIZATION="Bearer " + r.data["access"])
        self.assertEqual(self.api.get("/api/accounts/admin/audit-logs/").status_code, 403)

    def test_logout_blacklists_refresh(self):
        r = self.auth()
        out = self.api.post("/api/accounts/logout/", {"refresh": r.data["refresh"], "reason": "idle"}, format="json")
        self.assertEqual(out.status_code, 200)
        again = self.api.post("/api/accounts/login/refresh/", {"refresh": r.data["refresh"]}, format="json")
        self.assertEqual(again.status_code, 401)
        self.assertEqual(AuditLog.objects.get(action="auth.logout").details, {"reason": "idle"})
        # garbage token still answers 200 (nothing to leak)
        self.assertEqual(self.api.post("/api/accounts/logout/", {"refresh": "x"}, format="json").status_code, 200)

    def test_forgot_password_throttled(self):
        for _ in range(30):
            self.api.get("/api/accounts/forgot-password/questions/?username=stud1")
        self.assertEqual(self.api.get("/api/accounts/forgot-password/questions/?username=stud1").status_code, 429)
