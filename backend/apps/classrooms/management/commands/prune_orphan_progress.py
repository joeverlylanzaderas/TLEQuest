from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Exists, OuterRef

from apps.assignments.models import QuestProgress
from apps.classrooms.models import GroupMember
from apps.classrooms.services import purge_student_group_links


class Command(BaseCommand):
    help = (
        "Clean up students who were removed from a group before removal cut their links: "
        "deletes their quest progress, rewards and notifications for that group. "
        "Run with --dry-run first to see what would be removed."
    )

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="only show what would be deleted")

    def handle(self, *args, **opts):
        member = GroupMember.objects.filter(group_id=OuterRef("group_id"), student_id=OuterRef("student_id"))
        orphans = (
            QuestProgress.objects.annotate(is_member=Exists(member)).filter(is_member=False)
            .values_list("group_id", "student_id").distinct()
        )
        pairs = list(orphans)
        if not pairs:
            self.stdout.write(self.style.SUCCESS("Nothing to clean up."))
            return
        from apps.classrooms.models import Group
        total = {"progress": 0, "rewards": 0, "notifications": 0}
        with transaction.atomic():
            for group_id, student_id in pairs:
                group = Group.objects.get(pk=group_id)
                if opts["dry_run"]:
                    n = QuestProgress.objects.filter(group_id=group_id, student_id=student_id).count()
                    total["progress"] += n
                    self.stdout.write(f"would clean: student {student_id} from group {group_id} ({n} progress rows)")
                    continue
                counts = purge_student_group_links(group, student_id)
                for k, v in counts.items():
                    total[k] += v
            if opts["dry_run"]:
                transaction.set_rollback(True)
        verb = "Would delete" if opts["dry_run"] else "Deleted"
        self.stdout.write(self.style.SUCCESS(
            f"{verb} {total['progress']} progress rows"
            + ("" if opts["dry_run"] else f", {total['rewards']} rewards, {total['notifications']} notifications")
            + f" for {len(pairs)} removed student/group pair(s)."
        ))
