from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.classrooms.models import Class, ClassEnrollment, Group, GroupMember
from .models import QuestAssignment, QuestProgress


class CreateAndAssignFlowTests(APITestCase):
    """A quest the teacher creates + publishes shows up for the students right away,
    and a start date can hold it back until that day."""

    def setUp(self):
        self.teacher = User.objects.create_user(username="t", password="x", role="teacher")
        self.student = User.objects.create_user(username="s", password="x", role="student")
        klass = Class.objects.create(teacher=self.teacher, class_name="C", section="A")
        ClassEnrollment.objects.create(class_obj=klass, student=self.student)
        group = Group.objects.create(class_obj=klass, leader=self.student, group_number=1)
        GroupMember.objects.create(group=group, student=self.student)
        self.klass = klass

    def create_published_quest(self):
        self.client.force_authenticate(self.teacher)
        r = self.client.post("/api/quests/quests/", {
            "classes": [self.klass.id], "title": "Q", "description": "", "table_setting_type": "table_setting",
            "order_index": 0, "is_published": False, "cover_image_url": ""}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        qid = r.json()["id"]
        r = self.client.post(f"/api/quests/quests/{qid}/steps/", {
            "step_order": 1, "title": "a", "instruction": "a", "is_final_step": True, "is_required": True}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(self.client.patch(f"/api/quests/quests/{qid}/", {"is_published": True}, format="json").status_code, 200)
        return qid

    def student_progress(self):
        self.client.force_authenticate(self.student)
        r = self.client.get("/api/assignments/progress/")
        self.assertEqual(r.status_code, 200)
        return r.json()

    def test_visible_to_student_right_after_create(self):
        qid = self.create_published_quest()
        due = (timezone.now() + timedelta(days=5)).isoformat()
        r = self.client.post("/api/assignments/assign/", {"quest": qid, "quest_mode": "group", "due_date": due}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(len(self.student_progress()), 1)

    def test_start_date_in_future_hides_quest_until_then(self):
        qid = self.create_published_quest()
        start = timezone.now() + timedelta(days=2)
        r = self.client.post("/api/assignments/assign/", {
            "quest": qid, "quest_mode": "group", "start_date": start.isoformat(),
            "due_date": (start + timedelta(days=3)).isoformat()}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertIsNotNone(r.json()[0]["start_date"])
        self.assertEqual(self.student_progress(), [])
        progress = QuestProgress.objects.get(student=self.student)
        self.assertEqual(self.client.get(f"/api/assignments/progress/{progress.id}/").status_code, 403)

        # the start day arrives -> visible
        QuestAssignment.objects.update(start_date=timezone.now() - timedelta(minutes=1))
        self.assertEqual(len(self.student_progress()), 1)

    def test_due_before_start_is_rejected_and_dates_patchable(self):
        qid = self.create_published_quest()
        start = timezone.now() + timedelta(days=4)
        r = self.client.post("/api/assignments/assign/", {
            "quest": qid, "quest_mode": "group", "start_date": start.isoformat(),
            "due_date": (start - timedelta(days=1)).isoformat()}, format="json")
        self.assertEqual(r.status_code, 400)

        r = self.client.post("/api/assignments/assign/", {"quest": qid, "quest_mode": "group"}, format="json")
        aid = r.json()[0]["id"]
        r = self.client.patch(f"/api/assignments/assignments/{aid}/", {
            "start_date": start.isoformat(), "due_date": (start + timedelta(days=2)).isoformat()}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        # patching only the due date keeps the start date and still validates against it
        r = self.client.patch(f"/api/assignments/assignments/{aid}/", {"due_date": (start - timedelta(days=1)).isoformat()}, format="json")
        self.assertEqual(r.status_code, 400)
        r = self.client.patch(f"/api/assignments/assignments/{aid}/", {"start_date": None}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertIsNone(r.json()["start_date"])
