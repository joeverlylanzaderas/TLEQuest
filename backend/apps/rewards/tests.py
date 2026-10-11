from django.utils import timezone
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.assignments.models import QuestAssignment, QuestProgress, StepCompletion
from apps.classrooms.models import Class, Group, GroupMember
from apps.quests.models import Quest, QuestStep
from .models import Reward, QuestStepReward, StudentReward
from .services import grant_step_points, release_quest_rewards, resync_progress_totals


class RewardAccumulationTests(APITestCase):
    """Points and badges from every quest add up, and every screen reads the same totals."""

    def make_quest(self, title, step_pts, final_pts, badge_reward, override=None):
        quest = Quest.objects.create(teacher=self.teacher, title=title, table_setting_type="table_setting")
        st1 = QuestStep.objects.create(quest=quest, step_order=1, title="a", instruction="a")
        st2 = QuestStep.objects.create(quest=quest, step_order=2, title="b", instruction="b", is_final_step=True)
        p1 = Reward.objects.create(reward_name=f"{title} s1", reward_type="points", points_value=step_pts)
        p2 = Reward.objects.create(reward_name=f"{title} final", reward_type="points", points_value=final_pts)
        QuestStepReward.objects.create(quest_step=st1, reward=p1, points_override=override)
        QuestStepReward.objects.create(quest_step=st2, reward=p2)
        QuestStepReward.objects.create(quest_step=st2, reward=badge_reward)
        assignment = QuestAssignment.objects.create(
            quest=quest, group=self.group, quest_mode="group", leader_at_assignment=self.s1)
        for s in (self.s1, self.s2):
            p = QuestProgress.objects.create(
                quest_assignment=assignment, group=self.group, student=s, current_step=st2,
                completed_at=timezone.now())
            for st in (st1, st2):
                StepCompletion.objects.create(quest_progress=p, quest_step=st, completed_by=s, completed_at=timezone.now())
        return assignment, st1

    def setUp(self):
        self.teacher = User.objects.create_user(username="t1", password="x", role="teacher")
        self.s1 = User.objects.create_user(username="s1", password="x", role="student")
        self.s2 = User.objects.create_user(username="s2", password="x", role="student")
        klass = Class.objects.create(teacher=self.teacher, class_name="TLE", section="A")
        self.group = Group.objects.create(class_obj=klass, leader=self.s1, group_number=1)
        for s in (self.s1, self.s2):
            GroupMember.objects.create(group=self.group, student=s)

    def finish(self, assignment, step1):
        for s in (self.s1, self.s2):
            p = QuestProgress.objects.get(student=s, quest_assignment=assignment)
            grant_step_points(p, step1)
            p.save()
        release_quest_rewards(assignment)

    def summary(self, student):
        self.client.force_authenticate(student)
        r = self.client.get("/api/rewards/student-rewards/summary/")
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()

    def test_two_quests_accumulate_and_override_counts(self):
        # The SAME badge template is earned in both quests: it must count twice.
        shared_badge = Reward.objects.create(reward_name="Table Master", reward_type="badge", points_value=0)
        a1, st_a = self.make_quest("Quest A", step_pts=10, final_pts=20, badge_reward=shared_badge)
        a2, st_b = self.make_quest("Quest B", step_pts=5, final_pts=15, badge_reward=shared_badge, override=8)

        # Quest A: step points arrive right away, final points + badge only after the review
        p = QuestProgress.objects.get(student=self.s1, quest_assignment=a1)
        grant_step_points(p, st_a)
        p.save()
        s = self.summary(self.s1)
        self.assertEqual((s["total_points"], s["total_badges"]), (10, 0))

        release_quest_rewards(a1)
        s = self.summary(self.s1)
        self.assertEqual((s["total_points"], s["total_badges"]), (30, 1))

        # Quest B is finished later: its points are ADDED (the override of 8 is respected)
        self.finish(a2, st_b)
        s = self.summary(self.s1)
        self.assertEqual(s["total_points"], 30 + 8 + 15)
        self.assertEqual(s["total_badges"], 2)
        self.assertEqual(sorted(q["points"] for q in s["per_quest"]), [23, 30])

        # The cached per-quest numbers agree with the source of truth for BOTH members
        for student in (self.s1, self.s2):
            cached = sum(QuestProgress.objects.filter(student=student).values_list("points_earned", flat=True))
            self.assertEqual(cached, self.summary(student)["total_points"])
        self.assertEqual(resync_progress_totals(), 0)

        # Running the release again changes nothing
        release_quest_rewards(a1)
        release_quest_rewards(a2)
        self.assertEqual(self.summary(self.s1)["total_points"], 53)
        self.assertEqual(StudentReward.objects.filter(student=self.s1).count(), 6)

    def test_resync_repairs_drift(self):
        badge = Reward.objects.create(reward_name="B", reward_type="badge", points_value=0)
        a1, st = self.make_quest("Quest A", 10, 20, badge)
        self.finish(a1, st)
        QuestProgress.objects.filter(student=self.s1).update(points_earned=999, badge_earned=False)
        self.assertEqual(resync_progress_totals(), 1)
        p = QuestProgress.objects.get(student=self.s1)
        self.assertEqual((p.points_earned, p.badge_earned), (30, True))
