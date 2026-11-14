from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.accounts.models import UserProfile
from apps.classrooms.models import Class
from apps.notifications.models import Notification

User = get_user_model()


class JoinClassNotifiesTeacherTests(APITestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(username="T2026-001", password="testpass123", role="teacher")
        self.student = User.objects.create_user(username="S2026-001", password="testpass123", role="student")
        UserProfile.objects.update_or_create(
            user=self.student, defaults={"first_name": "Juan", "last_name": "Dela Cruz"}
        )
        self.klass = Class.objects.create(
            teacher=self.teacher, class_name="TLE 8 Cookery", subject="Cookery",
            section="8-A", school_year="2026-2027",
        )

    def test_teacher_is_notified_when_a_student_joins(self):
        self.client.force_authenticate(self.student)
        res = self.client.post("/api/classrooms/classes/join/", {"invite_code": self.klass.invite_code})
        self.assertEqual(res.status_code, 201)

        note = Notification.objects.get(recipient=self.teacher)
        self.assertEqual(note.notification_type, Notification.NotificationType.STUDENT_ENROLLED)
        self.assertIn("Juan Dela Cruz", note.message)
        self.assertIn("TLE 8 Cookery", note.message)
        self.assertEqual(note.related_id, self.klass.id)

    def test_no_notification_when_join_fails(self):
        self.client.force_authenticate(self.student)
        res = self.client.post("/api/classrooms/classes/join/", {"invite_code": "WRONG"})
        self.assertEqual(res.status_code, 400)
        self.assertEqual(Notification.objects.count(), 0)
