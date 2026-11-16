"""Seed the TLEQuest demonstration dataset.

    python manage.py seed_demo            # build (safe to re-run)
    python manage.py seed_demo --reset    # replace the demo dataset first

The seed creates the teacher, 15 enrolled students, one Grade 8 Cookery class,
three five-member groups, five published table-setting quests, and varied
per-student progress for the presentation.
"""
from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User, UserProfile
from apps.assignments.models import (
    ChecklistItemCompletion,
    QuestAssignment,
    QuestProgress,
    StepCompletion,
)
from apps.classrooms.models import Class, ClassEnrollment, Group, GroupMember
from apps.notifications.models import Notification
from apps.notifications.utils import notify
from apps.quests.models import Quest, QuestStep, StepChecklist
from apps.rewards.models import QuestStepReward, Reward, StudentReward


TEACHER_USERNAME = "T2026002"
TEACHER_PASSWORD = "teacher3"
STUDENT_PASSWORD = "testpass123"
CLASS_NAME = "GRADE 8 - Cookery"
CLASS_SUBJECT = "TLE"
CLASS_SECTION = "Veritas"
CLASS_SCHOOL_YEAR = "2026-2027"
DEMO_TAG = "demo-seed"

STUDENTS = [
    ("S2026-031", "Aira", "Bautista"),
    ("S2026-032", "Bianca", "Cruz"),
    ("S2026-033", "Caleb", "Dela Cruz"),
    ("S2026-034", "Daniel", "Garcia"),
    ("S2026-035", "Ella", "Hernandez"),
    ("S2026-036", "Faith", "Lopez"),
    ("S2026-037", "Gabriel", "Mendoza"),
    ("S2026-038", "Hannah", "Navarro"),
    ("S2026-039", "Ivan", "Ocampo"),
    ("S2026-040", "Jasmine", "Reyes"),
    ("S2026-041", "Karl", "Santos"),
    ("S2026-042", "Lara", "Torres"),
    ("S2026-043", "Miguel", "Valdez"),
    ("S2026-044", "Nina", "Villanueva"),
    ("S2026-045", "Owen", "Yap"),
]

GROUPS = (
    ("8Veritas_Group 1", 0, "leader"),
    ("8Veritas_Group 2", 5, "leader"),
    ("8Veritas_Group 3", 10, "leader"),
)

QUESTS = (
    (
        "Basic Table Setting",
        "Arrange the essential items for one diner.",
        [
            ("Prepare the table", "Clean the table and lay the tablecloth.",
             ["Table is clean and dry", "Tablecloth is centered and wrinkle-free"], 10),
            ("Place the plate and cutlery", "Set the plate, fork, knife, and spoon.",
             ["Plate is centered", "Fork is on the left", "Knife and spoon are on the right"], 15),
            ("Add the glass and napkin", "Place the glass and fold the napkin.",
             ["Glass is above the knife", "Napkin is neatly folded"], 20),
        ],
    ),
    (
        "Formal Dinner Table Setting",
        "Prepare a complete setting for a three-course formal dinner.",
        [
            ("Lay the foundation", "Place the tablecloth, placemat, and charger plate.",
             ["Tablecloth is even", "Charger plate is centered"], 10),
            ("Set the cutlery", "Arrange cutlery in course order.",
             ["Forks are on the left", "Knives and spoons are on the right"], 15),
            ("Set the glasses", "Place the water and beverage glasses.",
             ["Glasses are above the knife", "Glasses are aligned"], 20),
        ],
    ),
    (
        "Casual Lunch Table Setting",
        "Create a clean and practical lunch setting.",
        [
            ("Set the placemats", "Lay two placemats facing each other.",
             ["Placemats are aligned", "Placemats are clean"], 10),
            ("Add plates and cutlery", "Place a plate and the needed utensils for each seat.",
             ["A plate is on each mat", "Utensils are placed correctly"], 15),
            ("Finish the setting", "Add the napkin and drinking glass.",
             ["Napkins are folded", "Glasses are placed safely"], 20),
        ],
    ),
    (
        "Breakfast Table Setting",
        "Arrange a simple breakfast table for one guest.",
        [
            ("Prepare the place", "Lay the placemat and center the plate.",
             ["Placemat is straight", "Plate is centered"], 10),
            ("Place breakfast utensils", "Add the fork, spoon, and cup.",
             ["Fork is on the left", "Spoon and cup are correctly placed"], 15),
            ("Add the finishing touches", "Place the napkin and breakfast item.",
             ["Napkin is neat", "Food area is clean"], 20),
        ],
    ),
    (
        "Buffet Table Setting",
        "Plan a safe and organized buffet table.",
        [
            ("Plan the layout", "Arrange the plates, utensils, and serving areas.",
             ["Flow is easy to follow", "Plates are accessible"], 10),
            ("Arrange the service items", "Place serving utensils and tableware.",
             ["Serving utensils are available", "Tableware is grouped"], 15),
            ("Complete the buffet", "Add labels, napkins, and a centerpiece.",
             ["Labels are visible", "Centerpiece does not block the food"], 20),
        ],
    ),
)


class Command(BaseCommand):
    help = "Seed the Grade 8 Cookery demonstration dataset."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Replace the existing demo dataset first.")

    def _get_or_create_user(self, username, role, password, first_name="", last_name=""):
        user, _ = User.objects.get_or_create(
            username=username,
            defaults={"role": role},
        )
        if user.role != role:
            raise CommandError(f"Account '{username}' already exists with role '{user.role}'.")
        user.is_active = True
        user.set_password(password)
        user.save(update_fields=["password", "is_active", "updated_at"])
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.first_name = first_name
        profile.last_name = last_name
        profile.school = "TLEQuest Demo School"
        profile.grade_level = "Grade 8"
        profile.section = CLASS_SECTION
        profile.save()
        return user

    def _reset(self):
        teacher_usernames = ["T-00045", TEACHER_USERNAME]
        class_names = [CLASS_NAME, "TLE 9 - Demo Class"]
        teachers = User.objects.filter(username__in=teacher_usernames, role="teacher")
        classes = Class.objects.filter(teacher__in=teachers, class_name__in=class_names)
        Quest.objects.filter(teacher__in=teachers, title__in=[q[0] for q in QUESTS]).delete()
        classes.delete()
        Reward.objects.filter(description=DEMO_TAG).delete()

    def _build_quest(self, teacher, klass, order, spec):
        title, description, steps = spec
        quest, _ = Quest.objects.update_or_create(
            teacher=teacher,
            title=title,
            defaults={
                "description": description,
                "table_setting_type": "table_setting",
                "is_published": True,
                "order_index": order,
            },
        )
        quest.classes.add(klass)
        demo_rewards = list(
            Reward.objects.filter(
                description=DEMO_TAG,
                quest_step_links__quest_step__quest=quest,
            ).distinct()
        )
        for step in quest.steps.all():
            step.delete()
        for reward in demo_rewards:
            reward.delete()
        for number, (step_title, instruction, checklist, points) in enumerate(steps, start=1):
            quest_step = QuestStep.objects.create(
                quest=quest,
                step_order=number,
                title=step_title,
                instruction=instruction,
                is_final_step=number == len(steps),
            )
            for item_order, text in enumerate(checklist):
                StepChecklist.objects.create(
                    quest_step=quest_step,
                    checklist_text=text,
                    order_index=item_order,
                )
            reward = Reward.objects.create(
                reward_name=f"{points} points",
                reward_type="points",
                points_value=points,
                description=DEMO_TAG,
            )
            QuestStepReward.objects.create(
                quest_step=quest_step,
                reward=reward,
                reward_condition="Complete all checklist items",
            )
        return quest

    def _assign(self, quest, group):
        assignment, _ = QuestAssignment.objects.get_or_create(
            quest=quest,
            group=group,
            defaults={
                "quest_mode": "group",
                "leader_at_assignment": group.leader,
                "due_date": timezone.now() + timedelta(days=14),
            },
        )
        return assignment

    def _progress(self, assignment, student):
        first_step = assignment.quest.steps.order_by("step_order").first()
        progress, created = QuestProgress.objects.get_or_create(
            quest_assignment=assignment,
            student=student,
            defaults={
                "group": assignment.group,
                "current_step": first_step,
                "started_at": timezone.now() - timedelta(days=3),
            },
        )
        if created:
            notify(
                recipient=student,
                notification_type=Notification.NotificationType.QUEST_ASSIGNED,
                title="New quest assigned",
                message=f'"{assignment.quest.title}" has been assigned to your group.',
                related_type="quest_assignment",
                related_id=assignment.id,
            )
        return progress

    def _complete_progress(self, progress):
        steps = list(progress.quest_assignment.quest.steps.order_by("step_order"))
        completed_at = timezone.now() - timedelta(days=1)
        for step in steps:
            completion, _ = StepCompletion.objects.get_or_create(
                quest_progress=progress,
                quest_step=step,
                defaults={"completed_by": progress.student, "completed_at": completed_at},
            )
            completion.completed_at = completed_at
            completion.save(update_fields=["completed_at"])
            for item in step.checklist_items.all():
                ChecklistItemCompletion.objects.update_or_create(
                    step_completion=completion,
                    step_checklist=item,
                    defaults={"is_checked": True, "checked_at": completed_at},
                )
            for step_reward in QuestStepReward.objects.filter(quest_step=step).select_related("reward"):
                earned, created = StudentReward.objects.get_or_create(
                    student=progress.student,
                    quest_step_reward=step_reward,
                    defaults={
                        "reward": step_reward.reward,
                        "quest_assignment": progress.quest_assignment,
                        "points_awarded": step_reward.effective_points,
                    },
                )
                if created:
                    earned.earned_at = completed_at
                    earned.save(update_fields=["earned_at"])
        progress.current_step = steps[-1]
        progress.completed_at = completed_at
        progress.points_earned = sum(
            step_reward.effective_points
            for step in steps
            for step_reward in QuestStepReward.objects.filter(quest_step=step)
        )
        progress.save(update_fields=["current_step", "completed_at", "points_earned", "updated_at"])

    def _set_partial_progress(self, progress, steps_to_complete):
        steps = list(progress.quest_assignment.quest.steps.order_by("step_order"))
        for step in steps[:steps_to_complete]:
            completion, _ = StepCompletion.objects.get_or_create(
                quest_progress=progress,
                quest_step=step,
                defaults={"completed_by": progress.student},
            )
            for item in step.checklist_items.all():
                ChecklistItemCompletion.objects.update_or_create(
                    step_completion=completion,
                    step_checklist=item,
                    defaults={"is_checked": True, "checked_at": timezone.now()},
                )
            completion.completed_at = timezone.now()
            completion.save(update_fields=["completed_at"])
        progress.current_step = steps[min(steps_to_complete, len(steps) - 1)]
        progress.save(update_fields=["current_step", "updated_at"])

    @transaction.atomic
    def handle(self, *args, **options):
        if options["reset"]:
            self._reset()
            self.stdout.write("Old demo data removed.")

        teacher = self._get_or_create_user(
            TEACHER_USERNAME,
            "teacher",
            TEACHER_PASSWORD,
            "TLEQuest",
            "Teacher",
        )
        students = [
            self._get_or_create_user(username, "student", STUDENT_PASSWORD, first_name, last_name)
            for username, first_name, last_name in STUDENTS
        ]

        klass, _ = Class.objects.update_or_create(
            teacher=teacher,
            class_name=CLASS_NAME,
            defaults={
                "subject": CLASS_SUBJECT,
                "section": CLASS_SECTION,
                "school_year": CLASS_SCHOOL_YEAR,
                "is_active": True,
            },
        )
        for student in students:
            ClassEnrollment.objects.get_or_create(class_obj=klass, student=student)

        groups = []
        for group_name, start, _ in GROUPS:
            leader = students[start]
            group, _ = Group.objects.update_or_create(
                class_obj=klass,
                group_number=len(groups) + 1,
                defaults={"group_name": group_name, "leader": leader},
            )
            for student in students[start:start + 5]:
                GroupMember.objects.update_or_create(
                    group=group,
                    student=student,
                    defaults={"member_role": "Leader" if student == leader else "Member"},
                )
            groups.append(group)

        quests = [
            self._build_quest(teacher, klass, order, spec)
            for order, spec in enumerate(QUESTS, start=1)
        ]

        for quest_index, quest in enumerate(quests):
            for group_index, group in enumerate(groups):
                assignment = self._assign(quest, group)
                group_students = students[group_index * 5:(group_index + 1) * 5]
                if group_index == 0:
                    incomplete = set()
                elif group_index == 1:
                    incomplete = {
                        group_students[(quest_index + 1) % 5],
                        group_students[(quest_index + 3) % 5],
                    }
                else:
                    incomplete = {group_students[(quest_index + 2) % 5]}

                for student in group_students:
                    progress = self._progress(assignment, student)
                    if student not in incomplete:
                        self._complete_progress(progress)
                    else:
                        self._set_partial_progress(progress, quest_index % 2)

        self.stdout.write(self.style.SUCCESS("Demo data ready."))
        self.stdout.write(f"  Teacher: {TEACHER_USERNAME} / {TEACHER_PASSWORD}")
        self.stdout.write(f"  Class: {CLASS_NAME} | Subject: {CLASS_SUBJECT} | Section: {CLASS_SECTION}")
        self.stdout.write(f"  Invite code: {klass.invite_code}")
        self.stdout.write("  Groups: 8Veritas_Group 1, 8Veritas_Group 2, 8Veritas_Group 3")
        self.stdout.write(f"  Student password: {STUDENT_PASSWORD}")
