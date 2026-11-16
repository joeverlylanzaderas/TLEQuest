# backend/apps/classrooms/management/commands/purge_teacher_content.py
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.accounts.models import AuditLog
from apps.assignments.models import QuestAssignment, QuestProgress
from apps.classrooms.models import Class, ClassEnrollment, Group
from apps.notifications.models import Notification
from apps.quests.models import Quest, QuestStep
from apps.rewards.models import Reward, StudentReward
from apps.submissions.models import Submission

User = get_user_model()


class Command(BaseCommand):
    help = (
        "Remove classes and/or quests of ONE teacher, with everything inside them "
        "(enrollments, groups, quest assignments, progress, submissions, earned rewards, notifications). "
        "Accounts are kept. Without --execute it only previews. Take a database backup first.\n\n"
        "  python manage.py purge_teacher_content T2026002 --class-name \"Grade 7 TLE\" --quest-title \"Basic Table Setting\"\n"
        "  python manage.py purge_teacher_content T2026002 --class-name \"Grade 7 TLE\"\n"
        "  python manage.py purge_teacher_content T2026002 --all        (every class and quest of that teacher)"
    )

    def add_arguments(self, parser):
        parser.add_argument("username", help="the teacher's username, e.g. T2026002")
        parser.add_argument("--class-name", help="delete this class (exact name, upper/lower case ignored)")
        parser.add_argument("--quest-title", help="delete this quest (exact title, upper/lower case ignored)")
        parser.add_argument("--all", action="store_true", help="delete ALL classes and quests of this teacher")
        parser.add_argument("--execute", action="store_true", help="really delete (default: preview only)")
        parser.add_argument("--noinput", action="store_true", help="do not ask to type the username again")

    def handle(self, *args, **opts):
        username = opts["username"]
        class_name, quest_title, everything = opts["class_name"], opts["quest_title"], opts["all"]
        if not (class_name or quest_title or everything):
            raise CommandError("Say what to delete: --class-name, --quest-title, or --all.")

        try:
            teacher = User.objects.get(username=username)
        except User.DoesNotExist:
            raise CommandError(f'No user named "{username}".')
        if teacher.role != "teacher":
            raise CommandError(f'"{username}" is a {teacher.role}, not a teacher. Nothing was done.')

        # Only this teacher's own classes and quests can ever match.
        own_classes = Class.objects.filter(teacher=teacher)
        own_quests = Quest.objects.filter(teacher=teacher)
        classes = own_classes if everything else (own_classes.filter(class_name__iexact=class_name) if class_name else own_classes.none())
        quests = own_quests if everything else (own_quests.filter(title__iexact=quest_title) if quest_title else own_quests.none())

        # A name that matches nothing is almost always a typo: show what exists and stop.
        if class_name and not everything and not classes.exists():
            names = ", ".join(f'"{n}"' for n in own_classes.values_list("class_name", flat=True)) or "(none)"
            raise CommandError(f'{username} has no class named "{class_name}". Their classes: {names}')
        if quest_title and not everything and not quests.exists():
            titles = ", ".join(f'"{t}"' for t in own_quests.values_list("title", flat=True)) or "(none)"
            raise CommandError(f'{username} has no quest titled "{quest_title}". Their quests: {titles}')

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

        self.stdout.write(f"Teacher: {teacher.username} (id {teacher.id}). The account itself is NOT deleted.\n")
        for c in classes:
            self.stdout.write(f"  class  #{c.id}  {c.class_name}  (section: {c.section or '-'}, year: {c.school_year or '-'})")
        for q in quests:
            self.stdout.write(f"  quest  #{q.id}  {q.title}")
        self.stdout.write("")

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
        for name, n in counts.items():
            self.stdout.write(f"  {name:<22} {n}")

        # What this does NOT touch
        unlinked = Reward.objects.filter(quest_step_links__quest_step__quest_id__in=quest_ids).distinct().count()
        if unlinked:
            self.stdout.write(f"\n  {unlinked} reward definition(s) (points/badges) used by these quests are kept, not deleted.")
        photo_urls = list(submissions.values_list("image_url", flat=True))
        cover_urls = [u for u in quests.values_list("cover_image_url", flat=True) if u]
        if photo_urls or cover_urls:
            self.stdout.write(
                f"  {len(photo_urls)} submission photo(s) and {len(cover_urls)} quest cover(s) stay on Cloudinary "
                "(delete them there by hand if you want)."
            )

        if not any(counts.values()):
            self.stdout.write(self.style.SUCCESS("\nNothing to delete."))
            return

        if not opts["execute"]:
            self.stdout.write(self.style.WARNING(
                "\nPREVIEW ONLY: nothing was deleted. Check the list above, take a backup, then run again with --execute."
            ))
            return

        if not opts["noinput"]:
            typed = input(f'\nThis cannot be undone. Type the username "{username}" to continue: ').strip()
            if typed != username:
                raise CommandError("The username did not match. Nothing was deleted.")

        with transaction.atomic():
            notes.delete()                                      # first, while the ids they point to still exist
            if quest_ids:
                Quest.objects.filter(id__in=quest_ids).delete()  # steps, checklists, assignments -> progress, submissions, rewards
            if class_ids:
                Class.objects.filter(id__in=class_ids).delete()  # enrollments, groups, members
            AuditLog.objects.create(
                actor_username="manage.py purge_teacher_content",
                action="teacher.purge",
                target_id=teacher.id,
                target_label=teacher.username,
                details={**counts, "class_name": class_name or "", "quest_title": quest_title or "", "all": bool(everything)},
            )
        self.stdout.write(self.style.SUCCESS("\nDeleted."))