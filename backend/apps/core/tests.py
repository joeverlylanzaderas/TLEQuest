from datetime import datetime, timezone as dt_tz

from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.assignments.models import QuestProgress
from apps.classrooms.models import Class, ClassEnrollment, Group, GroupMember
from apps.rewards.models import Reward, StudentReward
from apps.submissions.models import Submission


class DailyActivityTests(APITestCase):
    """The dashboard calendar: per-day counts for a month, and a single-day breakdown that
    is cut at the viewer's midnight (the server runs on UTC)."""

    def setUp(self):
        self.admin = User.objects.create_user(username="a", password="x", role="admin")
        self.teacher = User.objects.create_user(username="t", password="x", role="teacher")
        self.other_teacher = User.objects.create_user(username="t2", password="x", role="teacher")
        self.student = User.objects.create_user(username="s", password="x", role="student")
        self.klass = Class.objects.create(teacher=self.teacher, class_name="C", section="A")
        ClassEnrollment.objects.create(class_obj=self.klass, student=self.student)
        group = Group.objects.create(class_obj=self.klass, leader=self.student, group_number=1)
        GroupMember.objects.create(group=group, student=self.student)

        # a published quest, assigned to the class
        self.client.force_authenticate(self.teacher)
        r = self.client.post("/api/quests/quests/", {
            "classes": [self.klass.id], "title": "Table", "description": "", "table_setting_type": "table_setting",
            "order_index": 0, "is_published": False, "cover_image_url": ""}, format="json")
        qid = r.json()["id"]
        self.client.post(f"/api/quests/quests/{qid}/steps/", {
            "step_order": 1, "title": "a", "instruction": "a", "is_final_step": True, "is_required": True}, format="json")
        self.client.patch(f"/api/quests/quests/{qid}/", {"is_published": True}, format="json")
        self.client.post("/api/assignments/assign/", {"quest": qid, "quest_mode": "group"}, format="json")

        # started 2026-10-11 20:00 UTC == 2026-10-12 04:00 in Manila
        self.progress = QuestProgress.objects.get(student=self.student)
        QuestProgress.objects.filter(pk=self.progress.pk).update(
            started_at=datetime(2026, 10, 11, 20, 0, tzinfo=dt_tz.utc), completed_at=None)

    def get(self, user, **params):
        self.client.force_authenticate(user)
        return self.client.get("/api/dashboard/daily-activity/", params)

    def test_day_is_cut_at_the_viewers_midnight(self):
        r = self.get(self.admin, date="2026-10-12", tz="Asia/Manila")
        self.assertEqual(r.status_code, 200, r.content)
        body = r.json()
        self.assertEqual(body["counts"]["started"], 1)
        self.assertEqual(body["counts"]["total"], 1)
        self.assertEqual(body["hourly"][4]["started"], 1)
        self.assertEqual(body["events"][0]["type"], "quest_started")
        self.assertEqual(body["per_quest"][0]["quest_title"], "Table")

        # the same instant is still Oct 11 for a UTC viewer
        self.assertEqual(self.get(self.admin, date="2026-10-11", tz="Asia/Manila").json()["counts"]["total"], 0)
        utc = self.get(self.admin, date="2026-10-11", tz="UTC").json()
        self.assertEqual(utc["counts"]["started"], 1)
        self.assertEqual(utc["hourly"][20]["started"], 1)

    def test_month_summary_marks_the_right_day(self):
        days = self.get(self.admin, month="2026-10", tz="Asia/Manila").json()["days"]
        self.assertEqual(list(days), ["2026-10-12"])
        self.assertEqual(days["2026-10-12"]["total"], 1)

    def test_teachers_only_see_their_own_classes(self):
        self.assertEqual(self.get(self.teacher, date="2026-10-11", tz="UTC").json()["counts"]["total"], 1)
        self.assertEqual(self.get(self.other_teacher, date="2026-10-11", tz="UTC").json()["counts"]["total"], 0)

    def test_students_are_refused_and_bad_input_is_a_400(self):
        self.assertEqual(self.get(self.student, date="2026-10-11").status_code, 403)
        self.assertEqual(self.get(self.admin, date="nope").status_code, 400)
        self.assertEqual(self.get(self.admin, month="2026-13").status_code, 400)
        self.assertEqual(self.get(self.admin).status_code, 400)
        # unknown timezone falls back instead of crashing
        self.assertEqual(self.get(self.admin, date="2026-10-11", tz="Not/AZone").status_code, 200)

    def test_feedback_and_rewards_show_up_and_class_filter_works(self):
        when = datetime(2026, 10, 11, 21, 0, tzinfo=dt_tz.utc)
        group = Group.objects.get(class_obj=self.klass)
        sub = Submission.objects.create(
            quest_assignment=self.progress.quest_assignment, group=group, student=self.student,
            image_url="http://x/y.jpg", classifier_result="ACCEPTED", confidence_score=0.9,
            teacher_feedback="nice", teacher_rating=4, reviewed_by=self.teacher)
        Submission.objects.filter(pk=sub.pk).update(submitted_at=when, reviewed_at=when)
        reward = Reward.objects.create(reward_name="Pts", reward_type="points", points_value=10)
        badge = Reward.objects.create(reward_name="Star Setter", reward_type="badge")
        for rw, pts in ((reward, 10), (badge, 0)):
            sr = StudentReward.objects.create(
                student=self.student, reward=rw, quest_assignment=self.progress.quest_assignment, points_awarded=pts)
            StudentReward.objects.filter(pk=sr.pk).update(earned_at=when)

        body = self.get(self.admin, date="2026-10-11", tz="UTC").json()
        c = body["counts"]
        self.assertEqual((c["started"], c["submitted"], c["reviewed"], c["rewarded"], c["points"]), (1, 1, 1, 2, 10))
        self.assertEqual(c["total"], 5)
        texts = [e["description"] for e in body["events"]]
        self.assertTrue(any("(4/5)" in t for t in texts))
        self.assertTrue(any(t.startswith("+10 pts") for t in texts))
        self.assertTrue(any('Badge "Star Setter"' in t for t in texts))
        self.assertEqual(body["hourly"][21]["rewarded"], 2)

        # filtering by the class keeps it; another class (or a teacher's foreign class) empties it
        own = self.get(self.admin, date="2026-10-11", tz="UTC", class_id=self.klass.id).json()
        self.assertEqual(own["counts"]["total"], 5)
        other = Class.objects.create(teacher=self.other_teacher, class_name="D", section="B")
        self.assertEqual(self.get(self.admin, date="2026-10-11", tz="UTC", class_id=other.id).json()["counts"]["total"], 0)
        self.assertEqual(self.get(self.teacher, date="2026-10-11", tz="UTC", class_id=other.id).json()["counts"]["total"], 0)
        self.assertEqual(self.get(self.admin, date="2026-10-11", class_id="abc").status_code, 400)
