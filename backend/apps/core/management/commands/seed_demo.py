# backend/apps/core/management/commands/seed_demo.py
"""Create demo data on a fresh local database (db.sqlite3 is not in git).

    python manage.py migrate
    python manage.py seed_demo

Safe to run again: it never duplicates anything. DEMO ONLY — never run this
against a real/production database (the passwords are well known).
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User, UserProfile
from apps.assignments.models import QuestAssignment, QuestProgress
from apps.classrooms.models import Class, ClassEnrollment, Group, GroupMember
from apps.quests.models import Quest, QuestStep, StepChecklist
from apps.rewards.models import QuestStepReward, Reward


# (title, description, table_setting_type, steps) — a step is
# (title, instruction, checklist items, points, badge name or None).
# The last step of each quest is the final step.
QUESTS = [
    ("Basic Table Setting", "Set a table for one person.", "table_setting", [
        ("Prepare the table", "Clean the table and lay the tablecloth.",
         ["Table is clean and dry", "Tablecloth is centered and wrinkle-free"], 10, None),
        ("Place the plates and cutlery", "Set the plate, fork, knife and spoon.",
         ["Plate is in the center", "Fork on the left", "Knife and spoon on the right"], 10, None),
        ("Place the glass and napkin", "Add the glass and fold the napkin.",
         ["Glass is above the knife", "Napkin is neatly folded"], 20, "Table Setting Pro"),
    ]),
    ("Napkin Folding Basics", "Fold napkins into three classic shapes.", "napkin_folding", [
        ("Prepare the napkin", "Iron or smooth out a square napkin.",
         ["Napkin is clean", "Napkin is flat and wrinkle-free"], 10, None),
        ("Make the base fold", "Fold the napkin into a triangle, then a smaller one.",
         ["Corners are matched", "Creases are sharp"], 10, None),
        ("Finish the fold", "Shape the napkin into a fan or pyramid and place it on the plate.",
         ["Shape stands on its own", "Napkin is placed on the plate"], 20, "Napkin Artist"),
    ]),
    ("Formal Dinner Table Setting", "Set a table for a three-course formal dinner.", "table_setting", [
        ("Lay the foundation", "Table cloth, placemat and charger plate.",
         ["Tablecloth is even on all sides", "Charger plate is centered"], 10, None),
        ("Set the cutlery", "Place the cutlery in the order of the courses (outside to inside).",
         ["Forks are on the left, outside to inside", "Knives and spoons are on the right",
          "Dessert spoon is above the plate"], 15, None),
        ("Set the glasses and bread plate", "Water glass, wine glass and bread plate.",
         ["Glasses are above the knife", "Bread plate is on the left"], 15, None),
        ("Final touches", "Add the napkin and a name card or centerpiece.",
         ["Napkin is folded and placed", "Centerpiece does not block the view"], 25, "Formal Dining Star"),
    ]),
]


class Command(BaseCommand):
    help = "Create demo admin/teacher/student accounts, a class, a group and quests (local dev only)."

    def add_arguments(self, parser):
        parser.add_argument("--password", default="Demo12345!", help="Password for all demo accounts.")

    @transaction.atomic
    def handle(self, *args, **opts):
        pw = opts["password"]

        def user(username, role, first, last, **extra):
            u, created = User.objects.get_or_create(username=username, defaults={"role": role, **extra})
            if created:
                u.set_password(pw)
                u.save()
            UserProfile.objects.get_or_create(
                user=u, defaults={"first_name": first, "last_name": last, "email": f"{username}@demo.local"}
            )
            return u

        admin = user("demo_admin", "admin", "Demo", "Admin", is_staff=True, is_superuser=True)
        teacher = user("demo_teacher", "teacher", "Tess", "Teacher")
        students = [user(f"demo_student{i}", "student", f"Student{i}", "Demo") for i in (1, 2, 3)]

        klass, _ = Class.objects.get_or_create(
            teacher=teacher, class_name="TLE 9 - Demo", defaults={"subject": "TLE", "section": "A", "school_year": "2026-2027"}
        )
        for s in students:
            ClassEnrollment.objects.get_or_create(class_obj=klass, student=s)

        group, _ = Group.objects.get_or_create(
            class_obj=klass, group_number=1, defaults={"leader": students[0], "group_name": "Group 1"}
        )
        for s in students:
            GroupMember.objects.get_or_create(group=group, student=s)

        for q_title, q_desc, q_type, steps in QUESTS:
            quest, created = Quest.objects.get_or_create(
                teacher=teacher, title=q_title,
                defaults={"description": q_desc, "table_setting_type": q_type, "is_published": True},
            )
            quest.classes.add(klass)
            if created:
                for order, (title, instruction, items, points, badge) in enumerate(steps, start=1):
                    step = QuestStep.objects.create(
                        quest=quest, step_order=order, title=title, instruction=instruction,
                        is_final_step=(order == len(steps)),
                    )
                    for idx, text in enumerate(items):
                        StepChecklist.objects.create(quest_step=step, checklist_text=text, order_index=idx)
                    QuestStepReward.objects.create(
                        quest_step=step,
                        reward=Reward.objects.create(reward_name=f"{points} points", reward_type="points", points_value=points),
                    )
                    if badge:
                        QuestStepReward.objects.create(
                            quest_step=step,
                            reward=Reward.objects.create(reward_name=badge, reward_type="badge", points_value=0),
                        )

            assignment, _ = QuestAssignment.objects.get_or_create(
                quest=quest, group=group,
                defaults={"quest_mode": "group", "leader_at_assignment": group.leader},
            )
            first_step = quest.steps.order_by("step_order").first()
            for s in students:
                QuestProgress.objects.get_or_create(
                    quest_assignment=assignment, student=s,
                    defaults={"group": group, "current_step": first_step, "started_at": timezone.now()},
                )

        self.stdout.write(self.style.SUCCESS("Demo data ready."))
        self.stdout.write(f"  Password for all: {pw}")
        self.stdout.write(f"  Admin: {admin.username} | Teacher: {teacher.username}")
        self.stdout.write("  Students: " + ", ".join(s.username for s in students) + f"  (leader: {group.leader.username})")
