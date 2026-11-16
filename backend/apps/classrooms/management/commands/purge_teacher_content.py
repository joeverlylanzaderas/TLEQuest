# backend/apps/classrooms/management/commands/purge_teacher_content.py
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.accounts.models import AuditLog
from apps.assignments.models import QuestAssignment, QuestProgress
from apps.classrooms.models import Class, ClassEnrollment, Group
from apps.notifications.models import Notification
from apps.quests.models import Quest, QuestStep
from apps.rewards.models import StudentReward
from apps.submissions.models import Submission

User = get_user_model()


class Command(BaseCommand):
    help = (
        "Completely remove every CLASS and QUEST created by one teacher, with everything inside them "
        "(enrollments, groups, quest assignments, progress, submissions, earned rewards, notifications). "
        "The teacher's account and the students' accounts are kept. "
        "Without --execute it only shows what WOULD be deleted. Take a database backup first."
    )

    def add_arguments(self, parser):
        parser.add_argument("username", help="the teacher's username, e.g. T2026002")
        parser.add_argument("--execute", action="store_true", help="really delete (default: preview only)")
        parser.add_argument("--noinput", action="store_true", help="do not ask to type the username again")

    def handle(self, *args, **opts):
        username = opts["username"]
        try:
            teacher = User.objects.get(username=username)
        except User.DoesNotExist:
            raise CommandError(f'No user named "{username}".')
        if teacher.role != "teacher":
            raise CommandError(f'"{username}" is a {teacher.role}, not a teacher. Nothing was done.')

        classes = Class.objects.filter(teacher=teacher)
        # quests this teacher made, plus every quest assignment given to this teacher's classes
        quests = Quest.objects.filter(teacher=teacher)
        class_ids = list(classes.values_list("id", flat=True))
        quest_ids = list(quests.values_list("id", flat=True))
        assignments = QuestAssignment.objects.filter(quest_id__in=quest_ids) | QuestAssignment.objects.filter(
            group__class_obj_id__in=class_ids
        )
        assignment_ids = list(assignments.values_list("id", flat=True).distinct())
        submissions = Submission.objects.filter(quest_assignment_id__in=assignment_ids)
        submission_ids = list(submissions.values_list("id", flat=True))

        notes = (
            Notification.objects.filter(related_type="class", related_id__in=class_ids)
            | Notification.objects.filter(related_type="quest_assignment", related_id__in=assignment_ids)
            | Notification.objects.filter(related_type="submission", related_id__in=submission_ids)
        )

        counts = {
            "classes": len(class_ids),
            "class enrollments": ClassEnrollment.objects.filter(class_obj_id__in=class_ids).count(),
            "groups": Group.objects.filter(class_obj_id__in=class_ids).count(),
            "quests": len(quest_ids),
            "quest steps": QuestStep.objects.filter(quest_id__in=quest_ids).count(),
            "quest assignments": len(assignment_ids),
            "quest progress rows": QuestProgress.objects.filter(quest_assignment_id__in=assignment_ids).count(),
            "submissions": len(submission_ids),
            "earned rewards": StudentReward.objects.filter(quest_assignment_id__in=assignment_ids).count(),
            "notifications": notes.distinct().count(),
        }

        self.stdout.write(f"Teacher: {teacher.username} (id {teacher.id}). The account itself is NOT deleted.\n")
        for name, n in counts.items():
            self.stdout.write(f"  {name:<22} {n}")

        # Photos live on Cloudinary / media storage; deleting rows does not delete those files.
        photo_urls = list(submissions.values_list("image_url", flat=True))
        cover_urls = [u for u in quests.values_list("cover_image_url", flat=True) if u]
        if photo_urls or cover_urls:
            self.stdout.write("\nFiles that stay in Cloudinary after this (delete them there by hand if you want):")
            self.stdout.write(f"  {len(photo_urls)} submission photo(s), {len(cover_urls)} quest cover(s)")
            for u in photo_urls[:5] + cover_urls[:5]:
                self.stdout.write(f"    {u}")
            if len(photo_urls) > 5 or len(cover_urls) > 5:
                self.stdout.write("    ...")

        if not any(counts.values()):
            self.stdout.write(self.style.SUCCESS("\nNothing to delete for this teacher."))
            return

        if not opts["execute"]:
            self.stdout.write(self.style.WARNING(
                "\nPREVIEW ONLY: nothing was deleted. Check the numbers, take a backup, then run again with --execute."
            ))
            return

        if not opts["noinput"]:
            typed = input(f'\nThis cannot be undone. Type the username "{username}" to continue: ').strip()
            if typed != username:
                raise CommandError("The username did not match. Nothing was deleted.")

        with transaction.atomic():
            notes.delete()                 # first, while the ids they point to still exist
            quests.delete()                # steps, checklists, assignments -> progress, submissions, rewards
            Class.objects.filter(id__in=class_ids).delete()   # enrollments, groups, members
            AuditLog.objects.create(
                actor_username="manage.py purge_teacher_content",
                action="teacher.purge",
                target_id=teacher.id,
                target_label=teacher.username,
                details=counts,
            )
        self.stdout.write(self.style.SUCCESS(f"\nDeleted. {teacher.username} now has no classes or quests."))
