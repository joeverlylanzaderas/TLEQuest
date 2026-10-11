from django.utils import timezone
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.assignments.models import QuestAssignment, QuestProgress, StepCompletion
from apps.classrooms.models import Class, Group, GroupMember
from apps.rewards.models import QuestStepReward, Reward, StudentReward
from apps.rewards.services import grant_step_points
from .models import Quest, QuestStep


class EditQuestStepsTests(APITestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(username="t", password="x", role="teacher")
        self.student = User.objects.create_user(username="s", password="x", role="student")
        self.klass = Class.objects.create(teacher=self.teacher, class_name="C", section="A")
        self.client.force_authenticate(self.teacher)
        r = self.client.post("/api/quests/quests/", {
            "classes": [self.klass.id], "title": "Q", "description": "", "table_setting_type": "table_setting",
            "order_index": 0, "is_published": True, "cover_image_url": ""}, format="json")
        self.qid = r.json()["id"]

    def add_step(self, title, **extra):
        r = self.client.post(f"/api/quests/quests/{self.qid}/steps/", {
            "step_order": QuestStep.objects.filter(quest_id=self.qid).count() + 1,
            "title": title, "instruction": title, "is_final_step": False, "is_required": True, **extra}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        return r.json()

    def steps(self):
        return list(QuestStep.objects.filter(quest_id=self.qid).order_by("step_order"))

    def test_points_and_badge_are_set_shown_changed_and_removed(self):
        step = self.add_step("Plate", points=10, badge_name="Pro")
        self.assertEqual((step["points"], step["badge_name"]), (10, "Pro"))
        shown = self.client.get(f"/api/quests/quests/{self.qid}/").json()["steps"][0]
        self.assertEqual((shown["points"], shown["badge_name"]), (10, "Pro"))

        r = self.client.patch(f"/api/quests/steps/{step['id']}/", {"points": 25, "badge_name": "Master"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual((r.json()["points"], r.json()["badge_name"]), (25, "Master"))
        self.assertEqual(QuestStepReward.objects.filter(quest_step_id=step["id"]).count(), 2)  # edited, not duplicated

        # leaving the fields out changes nothing
        r = self.client.patch(f"/api/quests/steps/{step['id']}/", {"title": "Plate!"}, format="json")
        self.assertEqual((r.json()["points"], r.json()["badge_name"]), (25, "Master"))

        r = self.client.patch(f"/api/quests/steps/{step['id']}/", {"points": 0, "badge_name": ""}, format="json")
        self.assertEqual((r.json()["points"], r.json()["badge_name"]), (0, ""))
        self.assertEqual(QuestStepReward.objects.filter(quest_step_id=step["id"]).count(), 0)

    def test_shared_badge_is_not_renamed_for_other_steps(self):
        shared = Reward.objects.create(reward_name="Shared", reward_type="badge", points_value=0)
        a = self.add_step("A")
        other = Quest.objects.create(teacher=self.teacher, title="Other", table_setting_type="table_setting")
        other_step = QuestStep.objects.create(quest=other, step_order=1, title="x", instruction="x", is_final_step=True)
        QuestStepReward.objects.create(quest_step_id=a["id"], reward=shared)
        QuestStepReward.objects.create(quest_step=other_step, reward=shared)
        self.client.patch(f"/api/quests/steps/{a['id']}/", {"badge_name": "Renamed"}, format="json")
        shared.refresh_from_db()
        self.assertEqual(shared.reward_name, "Shared")
        self.assertEqual(self.client.get(f"/api/quests/steps/{a['id']}/").json()["badge_name"], "Renamed")

    def test_last_step_is_always_the_only_final_step(self):
        a, b = self.add_step("A"), self.add_step("B")
        self.assertEqual([s.is_final_step for s in self.steps()], [False, True])
        self.add_step("C")
        self.assertEqual([s.is_final_step for s in self.steps()], [False, False, True])
        # delete the middle step: numbering closes the gap and a new step does not collide
        self.client.delete(f"/api/quests/steps/{b['id']}/")
        self.assertEqual([s.step_order for s in self.steps()], [1, 2])
        self.add_step("D")
        self.assertEqual([(s.step_order, s.is_final_step) for s in self.steps()], [(1, False), (2, False), (3, True)])
        # delete the final one: the previous step becomes final
        self.client.delete(f"/api/quests/steps/{self.steps()[-1].id}/")
        self.assertEqual([s.is_final_step for s in self.steps()], [False, True])

    def test_adding_a_step_reopens_students_who_already_finished(self):
        a = self.add_step("A", points=5)
        b = self.add_step("B", points=20)   # the old final step: its 20 points are held for the review
        group = Group.objects.create(class_obj=self.klass, leader=self.student, group_number=1)
        GroupMember.objects.create(group=group, student=self.student)
        assignment = QuestAssignment.objects.create(quest_id=self.qid, group=group, quest_mode="group", leader_at_assignment=self.student)
        steps = self.steps()
        progress = QuestProgress.objects.create(
            quest_assignment=assignment, group=group, student=self.student, current_step=steps[1], completed_at=timezone.now())
        for st in steps:
            StepCompletion.objects.create(quest_progress=progress, quest_step=st, completed_by=self.student, completed_at=timezone.now())
        grant_step_points(progress, steps[0]); progress.save()
        self.assertEqual(progress.points_earned, 5)

        c = self.add_step("C")
        progress.refresh_from_db()
        self.assertIsNone(progress.completed_at)                 # one more step to do
        self.assertEqual(progress.current_step_id, c["id"])
        self.assertEqual(progress.points_earned, 25)             # B is no longer final: its 20 points arrived
        self.assertEqual(StudentReward.objects.filter(student=self.student).count(), 2)


    def test_checklist_item_can_be_edited_and_deleted(self):
        step = self.add_step("A")
        r = self.client.post(f"/api/quests/steps/{step['id']}/checklist/", {"checklist_text": "one", "order_index": 1}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        item_id = r.json()["id"]
        r = self.client.patch(f"/api/quests/checklist/{item_id}/", {"checklist_text": "uno", "order_index": 2}, format="json")
        self.assertEqual(r.status_code, 200, r.content)   # used to be a 500
        self.assertEqual((r.json()["checklist_text"], r.json()["order_index"]), ("uno", 2))
        self.assertEqual(self.client.delete(f"/api/quests/checklist/{item_id}/").status_code, 204)
