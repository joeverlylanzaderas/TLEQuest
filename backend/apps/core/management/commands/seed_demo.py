# backend/apps/core/management/commands/seed_demo.py
"""Seed a demo class, groups, quests and *different progress* for the 4 demo
accounts that the admin created by uploading demo/demo_roster.csv.

    python manage.py seed_demo            # build (safe to re-run)
    python manage.py seed_demo --reset    # wipe the demo data, then rebuild

DEMO ONLY: never run this against a real database.
"""
from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.assignments.models import (
    ChecklistItemCompletion, QuestAssignment, QuestProgress, StepCompletion,
)
from apps.classrooms.models import Class, ClassEnrollment, Group, GroupMember
from apps.notifications.models import Notification
from apps.notifications.utils import notify
from apps.quests.models import Quest, QuestStep, StepChecklist
from apps.rewards.models import QuestStepReward, Reward, StudentReward
from apps.submissions.models import Submission

TEACHER = "T-00045"                                   # Rosa Almendras
CARLO, LIZA, MIGUEL = "2024-00201", "2024-00202", "2024-00203"
DEMO_TAG = "demo-seed"                                # marks Reward rows so --reset can remove them
CLASS_NAME = "TLE 9 - Demo Class"
PHOTO = "https://res.cloudinary.com/demo/image/upload/sample.jpg"  # placeholder photo

# (title, description, type, published, steps)
# step = (title, instruction, checklist items, points, badge or None); last step is final.
QUESTS = [
    ("Basic Table Setting", "Set a table for one person.", "table_setting", True, [
        ("Prepare the table", "Clean the table and lay the tablecloth.",
         ["Table is clean and dry", "Tablecloth is centered and wrinkle-free"], 10, None),
        ("Place the plates and cutlery", "Set the plate, fork, knife and spoon.",
         ["Plate is in the center", "Fork on the left", "Knife and spoon on the right"], 10, None),
        ("Place the glass and napkin", "Add the glass and fold the napkin.",
         ["Glass is above the knife", "Napkin is neatly folded"], 20, "Table Setting Pro"),
    ]),
    ("Napkin Folding Basics", "Fold napkins into three classic shapes.", "napkin_folding", True, [
        ("Prepare the napkin", "Smooth out a square napkin.",
         ["Napkin is clean", "Napkin is flat and wrinkle-free"], 10, None),
        ("Make the base fold", "Fold into a triangle, then a smaller one.",
         ["Corners are matched", "Creases are sharp"], 10, None),
        ("Finish the fold", "Shape it into a fan or pyramid and place it on the plate.",
         ["Shape stands on its own", "Napkin is placed on the plate"], 20, "Napkin Artist"),
    ]),
    ("Formal Dinner Table Setting", "Set a table for a three-course formal dinner.", "table_setting", True, [
        ("Lay the foundation", "Tablecloth, placemat and charger plate.",
         ["Tablecloth is even on all sides", "Charger plate is centered"], 10, None),
        ("Set the cutlery", "Place cutlery in the order of the courses (outside to inside).",
         ["Forks on the left, outside to inside", "Knives and spoons on the right",
          "Dessert spoon above the plate"], 15, None),
        ("Set the glasses and bread plate", "Water glass, wine glass and bread plate.",
         ["Glasses are above the knife", "Bread plate is on the left"], 15, None),
        ("Final touches", "Add the napkin and a centerpiece.",
         ["Napkin is folded and placed", "Centerpiece does not block the view"], 25, "Formal Dining Star"),
    ]),
    ("Casual Lunch Table Setting", "A relaxed lunch setting for two.", "table_setting", True, [
        ("Set the place mats", "Lay two place mats facing each other.",
         ["Mats are aligned", "Mats are clean"], 10, None),
        ("Add plates and cutlery", "Plate, fork and spoon for each seat.",
         ["Plate on each mat", "Fork and spoon placed correctly"], 15, "Lunch Host"),
    ]),
    ("Buffet Table Setting (draft)", "Not yet published - teacher is still editing.", "table_setting", False, [
        ("Plan the layout", "Decide where dishes and plates go.",
         ["Layout drawn"], 10, "Buffet Planner"),
    ]),
]


class Command(BaseCommand):
    help = "Seed a demo class, groups, quests and varied progress for the 4 demo accounts."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Delete the demo class/quests first.")

    # ------------------------------------------------------------------ helpers
    def _get_user(self, username, role):
        try:
            return User.objects.get(username=username, role=role)
        except User.DoesNotExist:
            raise CommandError(
                f"Account '{username}' ({role}) not found. In the admin web, go to "
                f"User Management > Bulk Import and upload demo/demo_roster.csv first."
            )

    def _build_quest(self, teacher, klass, order, spec):
        title, desc, qtype, published, steps = spec
        quest, created = Quest.objects.get_or_create(
            teacher=teacher, title=title,
            defaults={"description": desc, "table_setting_type": qtype,
                      "is_published": published, "order_index": order},
        )
        quest.classes.add(klass)
        if created:
            for n, (st, ins, items, pts, badge) in enumerate(steps, start=1):
                step = QuestStep.objects.create(
                    quest=quest, step_order=n, title=st, instruction=ins,
                    is_final_step=(n == len(steps)),
                )
                for i, text in enumerate(items):
                    StepChecklist.objects.create(quest_step=step, checklist_text=text, order_index=i)
                QuestStepReward.objects.create(quest_step=step, reward=Reward.objects.create(
                    reward_name=f"{pts} points", reward_type="points", points_value=pts, description=DEMO_TAG))
                if badge:
                    QuestStepReward.objects.create(quest_step=step, reward=Reward.objects.create(
                        reward_name=badge, reward_type="badge", points_value=0, description=DEMO_TAG))
        return quest

    def _assign(self, quest, group, due_in_days=None):
        a, _ = QuestAssignment.objects.get_or_create(
            quest=quest, group=group,
            defaults={"quest_mode": "group", "leader_at_assignment": group.leader,
                      "due_date": timezone.now() + timedelta(days=due_in_days) if due_in_days else None},
        )
        return a

    def _progress(self, assignment, student, days_ago):
        first = assignment.quest.steps.order_by("step_order").first()
        p, created = QuestProgress.objects.get_or_create(
            quest_assignment=assignment, student=student,
            defaults={"group": assignment.group, "current_step": first,
                      "started_at": timezone.now() - timedelta(days=days_ago)},
        )
        if created:
            notify(recipient=student, notification_type=Notification.NotificationType.QUEST_ASSIGNED,
                   title="New quest assigned",
                   message=f'"{assignment.quest.title}" has been assigned to your group.',
                   related_type="quest_assignment", related_id=assignment.id)
        return p

    def _advance(self, progress, full_steps, partial_items=0, days_ago=1):
        """Mirror ChecklistItemToggleView: tick every item of `full_steps` steps
        (awarding points/badges), then tick `partial_items` items of the next step."""
        steps = list(progress.quest_assignment.quest.steps.order_by("step_order"))
        when = timezone.now() - timedelta(days=days_ago)
        for step in steps[:full_steps]:
            sc, _ = StepCompletion.objects.get_or_create(
                quest_progress=progress, quest_step=step, defaults={"completed_by": progress.student})
            for item in step.checklist_items.all():
                ChecklistItemCompletion.objects.update_or_create(
                    step_completion=sc, step_checklist=item,
                    defaults={"is_checked": True, "checked_at": when})
            sc.completed_at = when
            sc.save()
            for sr in QuestStepReward.objects.filter(quest_step=step).select_related("reward"):
                sreward, made = StudentReward.objects.get_or_create(
                    student=progress.student, quest_step_reward=sr,
                    defaults={"reward": sr.reward, "quest_assignment": progress.quest_assignment})
                if made:
                    StudentReward.objects.filter(pk=sreward.pk).update(earned_at=when)
                    progress.points_earned += sr.effective_points
                    if sr.reward.reward_type == Reward.RewardType.BADGE:
                        progress.badge_earned = True
            if step.is_final_step:
                progress.completed_at = when
            else:
                nxt = [s for s in steps if s.step_order > step.step_order]
                progress.current_step = nxt[0] if nxt else step
        if partial_items and full_steps < len(steps):
            step = steps[full_steps]
            sc, _ = StepCompletion.objects.get_or_create(
                quest_progress=progress, quest_step=step, defaults={"completed_by": progress.student})
            for item in list(step.checklist_items.all())[:partial_items]:
                ChecklistItemCompletion.objects.update_or_create(
                    step_completion=sc, step_checklist=item,
                    defaults={"is_checked": True, "checked_at": when})
            progress.current_step = step
        progress.save()

    def _submit(self, assignment, leader, label, conf, feedback, review=None):
        sub, made = Submission.objects.get_or_create(
            quest_assignment=assignment, group=assignment.group, student=leader,
            defaults={"image_url": PHOTO, "classifier_result": label,
                      "confidence_score": conf, "generated_feedback": feedback})
        if made:
            notify(recipient=assignment.quest.teacher,
                   notification_type=Notification.NotificationType.NEW_SUBMISSION,
                   title="New submission",
                   message=f'{assignment.group} submitted "{assignment.quest.title}" ({label}).',
                   related_type="submission", related_id=sub.id)
            if review:
                text, rating = review
                sub.teacher_feedback, sub.teacher_rating = text, rating
                sub.reviewed_by, sub.reviewed_at = assignment.quest.teacher, timezone.now()
                sub.save()
                notify(recipient=leader,
                       notification_type=Notification.NotificationType.SUBMISSION_FEEDBACK,
                       title="Your submission was reviewed", message=text,
                       related_type="submission", related_id=sub.id)
        return sub

    # ------------------------------------------------------------------- main
    @transaction.atomic
    def handle(self, *args, **opts):
        teacher = self._get_user(TEACHER, "teacher")
        carlo, liza, miguel = (self._get_user(u, "student") for u in (CARLO, LIZA, MIGUEL))

        if opts["reset"]:
            Quest.objects.filter(teacher=teacher, title__in=[q[0] for q in QUESTS]).delete()
            Class.objects.filter(teacher=teacher, class_name=CLASS_NAME).delete()
            Reward.objects.filter(description=DEMO_TAG).delete()
            self.stdout.write("Old demo data removed.")

        klass, _ = Class.objects.get_or_create(
            teacher=teacher, class_name=CLASS_NAME,
            defaults={"subject": "TLE", "section": "Sampaguita", "school_year": "2026-2027"})
        for s in (carlo, liza, miguel):
            ClassEnrollment.objects.get_or_create(class_obj=klass, student=s)

        g1, _ = Group.objects.get_or_create(class_obj=klass, group_number=1,
                                            defaults={"leader": carlo, "group_name": "Group 1 - Table Pros"})
        g2, _ = Group.objects.get_or_create(class_obj=klass, group_number=2,
                                            defaults={"leader": miguel, "group_name": "Group 2 - Folders"})
        for g, members in ((g1, (carlo, liza)), (g2, (miguel,))):
            for m in members:
                GroupMember.objects.get_or_create(group=g, student=m)

        q = {spec[0]: self._build_quest(teacher, klass, i, spec) for i, spec in enumerate(QUESTS)}
        basic, napkin = q["Basic Table Setting"], q["Napkin Folding Basics"]
        formal, lunch = q["Formal Dinner Table Setting"], q["Casual Lunch Table Setting"]

        # ---- Quest 1: Basic Table Setting -> both groups, FINISHED + submitted
        a = self._assign(basic, g1, due_in_days=7)
        for stu, d in ((carlo, 6), (liza, 6)):
            self._advance(self._progress(a, stu, 7), full_steps=3, days_ago=d)
        self._submit(a, carlo, "ACCEPTED", 0.91, "Great job! Your table setting looks complete.",
                     review=("Well done! Neat and complete. The napkin placement was very good.", 5))
        a = self._assign(basic, g2, due_in_days=7)
        self._advance(self._progress(a, miguel, 6), full_steps=3, days_ago=4)
        self._submit(a, miguel, "FOR REVIEW", 0.62,
                     "The model is not sure about this photo. Your teacher will review it.")  # waiting for teacher

        # ---- Quest 2: Napkin Folding -> mixed progress, leader gate visible
        a = self._assign(napkin, g1, due_in_days=5)
        self._advance(self._progress(a, carlo, 4), full_steps=1, partial_items=1, days_ago=2)   # step 2, 1 of 2 items
        self._advance(self._progress(a, liza, 4), full_steps=3, days_ago=1)                     # finished; leader hasn't
        a = self._assign(napkin, g2, due_in_days=5)
        self._progress(a, miguel, 4)                                                            # not started

        # ---- Quest 3: Formal Dinner -> early / mid progress
        a = self._assign(formal, g1, due_in_days=10)
        self._advance(self._progress(a, carlo, 3), full_steps=2, partial_items=1, days_ago=1)   # step 3 in progress
        self._advance(self._progress(a, liza, 3), full_steps=1, days_ago=1)
        a = self._assign(formal, g2, due_in_days=10)
        self._advance(self._progress(a, miguel, 3), full_steps=1, partial_items=1, days_ago=1)

        # ---- Quest 4: Casual Lunch -> Group 1 only, brand new (nothing done); due soon
        a = self._assign(lunch, g1, due_in_days=2)
        for stu in (carlo, liza):
            self._progress(a, stu, 0)

        self.stdout.write(self.style.SUCCESS("Demo data ready."))
        self.stdout.write(f"  Teacher {TEACHER} | class '{klass.class_name}' invite code: {klass.invite_code}")
        self.stdout.write("  Group 1: Carlo (leader), Liza | Group 2: Miguel (leader)")
        self.stdout.write("  Password for all demo accounts is whatever was in the uploaded CSV (Demopass123!).")

