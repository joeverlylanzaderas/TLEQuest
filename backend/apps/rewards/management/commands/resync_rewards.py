from django.core.management.base import BaseCommand

from apps.rewards.services import resync_progress_totals


class Command(BaseCommand):
    help = "Recalculate QuestProgress.points_earned / badge_earned from the StudentReward rows."

    def handle(self, *args, **options):
        changed = resync_progress_totals()
        self.stdout.write(self.style.SUCCESS(f"Resynced {changed} progress row(s)."))
