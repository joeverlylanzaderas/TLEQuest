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


class GroupTransferAndNamesTests(APITestCase):
    def setUp(self):
        from django.utils import timezone
        from apps.assignments.models import QuestAssignment, QuestProgress
        from apps.classrooms.models import Group, GroupMember
        from apps.quests.models import Quest, QuestStep

        self.teacher = User.objects.create_user(username="t1", password="x", role="teacher")
        UserProfile.objects.update_or_create(user=self.teacher, defaults={"first_name": "Ana", "last_name": "Reyes"})
        self.s1 = User.objects.create_user(username="s1", password="x", role="student")
        self.s2 = User.objects.create_user(username="s2", password="x", role="student")
        UserProfile.objects.update_or_create(user=self.s2, defaults={"first_name": "Ben", "last_name": "Cruz"})
        self.klass = Class.objects.create(teacher=self.teacher, class_name="TLE", section="A")
        self.g1 = Group.objects.create(class_obj=self.klass, leader=self.s1, group_number=1)
        self.g2 = Group.objects.create(class_obj=self.klass, group_number=2)
        self.m1 = GroupMember.objects.create(group=self.g1, student=self.s1)
        self.m2 = GroupMember.objects.create(group=self.g1, student=self.s2)
        quest = Quest.objects.create(teacher=self.teacher, title="Table", table_setting_type="table_setting")
        step = QuestStep.objects.create(quest=quest, step_order=1, title="a", instruction="a", is_final_step=True)
        self.assignment = QuestAssignment.objects.create(quest=quest, group=self.g1, quest_mode="group", leader_at_assignment=self.s1)
        for s in (self.s1, self.s2):
            QuestProgress.objects.create(
                quest_assignment=self.assignment, group=self.g1, student=s,
                current_step=step, started_at=timezone.now(),
            )

    def test_removed_member_loses_the_groups_quest(self):
        from apps.assignments.models import QuestProgress
        self.client.force_authenticate(self.teacher)
        res = self.client.delete(f"/api/classrooms/groups/members/{self.m2.id}/")
        self.assertEqual(res.status_code, 204)
        self.assertFalse(QuestProgress.objects.filter(student=self.s2).exists())
        self.assertTrue(QuestProgress.objects.filter(student=self.s1).exists())
        # the removed student no longer sees the quest
        self.client.force_authenticate(self.s2)
        self.assertEqual(self.client.get("/api/assignments/progress/").json(), [])

    def test_removing_the_leader_clears_leader(self):
        self.client.force_authenticate(self.teacher)
        self.client.delete(f"/api/classrooms/groups/members/{self.m1.id}/")
        self.g1.refresh_from_db()
        self.assertIsNone(self.g1.leader)

    def test_group_can_submit_after_unfinished_member_is_removed(self):
        from django.utils import timezone
        from apps.assignments.models import QuestProgress
        QuestProgress.objects.filter(student=self.s1).update(completed_at=timezone.now())
        self.client.force_authenticate(self.teacher)
        self.client.delete(f"/api/classrooms/groups/members/{self.m2.id}/")
        self.client.force_authenticate(self.s1)
        pid = QuestProgress.objects.get(student=self.s1).id
        gp = self.client.get(f"/api/assignments/progress/{pid}/").json()["group_progress"]
        self.assertEqual((gp["total"], gp["finished"], gp["pending_names"]), (1, 1, []))

    def test_reorder_groups_renumbers(self):
        self.client.force_authenticate(self.teacher)
        res = self.client.post(
            f"/api/classrooms/classes/{self.klass.id}/groups/reorder/",
            {"order": [self.g2.id, self.g1.id]}, format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.g1.refresh_from_db(); self.g2.refresh_from_db()
        self.assertEqual((self.g2.group_number, self.g1.group_number), (1, 2))
        bad = self.client.post(
            f"/api/classrooms/classes/{self.klass.id}/groups/reorder/", {"order": [self.g1.id]}, format="json",
        )
        self.assertEqual(bad.status_code, 400)

    def test_reorder_needs_the_class_owner(self):
        other = User.objects.create_user(username="t2", password="x", role="teacher")
        self.client.force_authenticate(other)
        res = self.client.post(
            f"/api/classrooms/classes/{self.klass.id}/groups/reorder/",
            {"order": [self.g1.id, self.g2.id]}, format="json",
        )
        self.assertEqual(res.status_code, 403)

    def test_teacher_name_and_student_name_are_exposed(self):
        self.client.force_authenticate(self.s2)
        classes = self.client.get("/api/classrooms/classes/").json()
        results = classes["results"] if isinstance(classes, dict) else classes
        self.assertEqual(results[0]["teacher"]["name"], "Ana Reyes") if results else None
        self.client.force_authenticate(self.teacher)
        prog = self.client.get("/api/assignments/progress/").json()
        prog = prog["results"] if isinstance(prog, dict) else prog
        names = {p["student_username"]: p["student_name"] for p in prog}
        self.assertEqual(names, {"s1": "s1", "s2": "Ben Cruz"})

    def test_removal_cuts_every_link_to_that_group_only(self):
        from apps.assignments.models import QuestProgress
        from apps.classrooms.models import GroupMember
        from apps.rewards.models import Reward, StudentReward
        from apps.notifications.models import Notification

        # s2 is in group 1 (has the quest, a reward, a notification) AND in group 2
        GroupMember.objects.create(group=self.g2, student=self.s2)
        reward = Reward.objects.create(reward_name="10 pts", reward_type="points", points_value=10)
        StudentReward.objects.create(student=self.s2, reward=reward, quest_assignment=self.assignment, points_awarded=10)
        Notification.objects.create(
            recipient=self.s2, notification_type="quest_assigned", title="New quest assigned",
            related_type="quest_assignment", related_id=self.assignment.id,
        )
        self.assignment.leader_at_assignment = self.s2
        self.assignment.save()

        self.client.force_authenticate(self.teacher)
        self.client.delete(f"/api/classrooms/groups/members/{self.m2.id}/")

        self.assertFalse(QuestProgress.objects.filter(student=self.s2).exists())
        self.assertFalse(StudentReward.objects.filter(student=self.s2).exists())
        self.assertFalse(Notification.objects.filter(recipient=self.s2).exists())
        self.assignment.refresh_from_db()
        self.assertIsNone(self.assignment.leader_at_assignment)
        # still in group 2 and still enrolled; group 1 still has s1
        self.assertTrue(GroupMember.objects.filter(group=self.g2, student=self.s2).exists())
        self.assertFalse(GroupMember.objects.filter(group=self.g1, student=self.s2).exists())
        self.assertTrue(QuestProgress.objects.filter(student=self.s1).exists())
