from django.utils import timezone
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.assignments.models import QuestAssignment, QuestProgress, StepCompletion
from apps.classrooms.models import Class, Group, GroupMember
from apps.notifications.models import Notification
from apps.quests.models import Quest, QuestStep
from apps.rewards.models import Reward, QuestStepReward, StudentReward
from .models import Submission
from apps.rewards.services import grant_step_points


class RewardReleaseTests(APITestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(username="t1", password="x", role="teacher")
        self.s1 = User.objects.create_user(username="s1", password="x", role="student")
        self.s2 = User.objects.create_user(username="s2", password="x", role="student")
        klass = Class.objects.create(teacher=self.teacher, class_name="TLE", section="A")
        self.group = Group.objects.create(class_obj=klass, leader=self.s1, group_number=1)
        for s in (self.s1, self.s2):
            GroupMember.objects.create(group=self.group, student=s)
        quest = Quest.objects.create(teacher=self.teacher, title="Table", table_setting_type="table_setting")
        st1 = QuestStep.objects.create(quest=quest, step_order=1, title="a", instruction="a")
        st2 = QuestStep.objects.create(quest=quest, step_order=2, title="b", instruction="b", is_final_step=True)
        pts = Reward.objects.create(reward_name="10 pts", reward_type="points", points_value=10)
        final_pts = Reward.objects.create(reward_name="20 pts", reward_type="points", points_value=20)
        badge = Reward.objects.create(reward_name="Badge", reward_type="badge", points_value=0)
        QuestStepReward.objects.create(quest_step=st1, reward=pts)
        QuestStepReward.objects.create(quest_step=st2, reward=final_pts)
        QuestStepReward.objects.create(quest_step=st2, reward=badge)
        self.st1 = st1
        self.assignment = QuestAssignment.objects.create(quest=quest, group=self.group, quest_mode="group", leader_at_assignment=self.s1)
        for s in (self.s1, self.s2):
            p = QuestProgress.objects.create(quest_assignment=self.assignment, group=self.group, student=s, current_step=st2, completed_at=timezone.now())
            for st in (st1, st2):
                StepCompletion.objects.create(quest_progress=p, quest_step=st, completed_by=s, completed_at=timezone.now())
        self.sub = Submission.objects.create(
            quest_assignment=self.assignment, group=self.group, student=self.s1,
            image_url="http://x/y.jpg", classifier_result="ACCEPTED", confidence_score=0.9,
        )
        self.client.force_authenticate(self.teacher)
        self.url = f"/api/submissions/submissions/{self.sub.id}/review/"

    def test_flow(self):
        # 1. Step 1 done -> step points right away (no badge, no final points)
        for s in (self.s1, self.s2):
            p = QuestProgress.objects.get(student=s)
            grant_step_points(p, self.st1)
            p.save()
            grant_step_points(p, self.st1)  # twice -> still once
            p.save()
            p.refresh_from_db()
            self.assertEqual(p.points_earned, 10)
            self.assertFalse(p.badge_earned)
        self.assertEqual(StudentReward.objects.count(), 2)

        # 2. Teacher feedback -> final points + badge to BOTH members
        r = self.client.patch(self.url, {"teacher_feedback": "good"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(StudentReward.objects.count(), 6)
        for s in (self.s1, self.s2):
            p = QuestProgress.objects.get(student=s)
            self.assertEqual(p.points_earned, 30)
            self.assertTrue(p.badge_earned)
        self.assertEqual(Notification.objects.filter(title="Rewards earned!").count(), 2)

        # 3. Editing the review does NOT double anything
        r = self.client.patch(self.url, {"teacher_feedback": "great", "teacher_rating": 5}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(StudentReward.objects.count(), 6)
        self.assertEqual(QuestProgress.objects.get(student=self.s1).points_earned, 30)
        self.assertEqual(Notification.objects.filter(title="Rewards earned!").count(), 2)

        # 4. No new submission after the review
        self.client.force_authenticate(self.s1)
        r = self.client.post("/api/submissions/submissions/", {
            "quest_assignment": self.assignment.id, "image_url": "https://res.cloudinary.com/x/image/upload/z.jpg",
            "classifier_result": "ACCEPTED", "confidence_score": 0.9, "generated_feedback": "x"}, format="json")
        self.assertEqual(r.status_code, 403, r.content)

        # 5. review_status on the progress detail
        r = self.client.get(f"/api/assignments/progress/{QuestProgress.objects.get(student=self.s1).id}/")
        self.assertEqual(r.json().get("review_status"), "reviewed", r.content)

    def test_group_progress_and_submit_block(self):
        # s2 hasn't finished -> leader can't submit, detail says who is pending
        QuestProgress.objects.filter(student=self.s2).update(completed_at=None)
        self.client.force_authenticate(self.s1)
        pid = QuestProgress.objects.get(student=self.s1).id
        gp = self.client.get(f"/api/assignments/progress/{pid}/").json()["group_progress"]
        self.assertEqual((gp["total"], gp["finished"], gp["pending_names"]), (2, 1, ["s2"]))
        r = self.client.post("/api/submissions/submissions/", {
            "quest_assignment": self.assignment.id, "image_url": "https://res.cloudinary.com/x/image/upload/z.jpg",
            "classifier_result": "ACCEPTED", "confidence_score": 0.9, "generated_feedback": "x"}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_progress_list_shows_review_and_awards(self):
        self.client.force_authenticate(self.teacher)
        self.client.patch(self.url, {"teacher_feedback": "Nice setup", "teacher_rating": 4}, format="json")
        self.client.force_authenticate(self.s2)
        rows = self.client.get("/api/assignments/progress/").json()
        row = rows[0]
        self.assertEqual(row["review_status"], "reviewed")
        self.assertEqual(row["teacher_feedback"], "Nice setup")
        self.assertEqual(row["teacher_rating"], 4)
        self.assertTrue(row["badge_earned"])

    def test_quest_cover_photo(self):
        quest = self.assignment.quest
        self.client.force_authenticate(self.teacher)
        r = self.client.patch(f"/api/quests/quests/{quest.id}/", {"cover_image_url": "https://evil.example/x.jpg"}, format="json")
        self.assertEqual(r.status_code, 400, r.content)
        ok = "https://res.cloudinary.com/ddyzfocil/image/upload/v1/tlequest/covers/a.jpg"
        r = self.client.patch(f"/api/quests/quests/{quest.id}/", {"cover_image_url": ok}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.client.force_authenticate(self.s1)
        rows = self.client.get("/api/assignments/progress/").json()
        self.assertEqual(rows[0]["quest_cover_image_url"], ok)
