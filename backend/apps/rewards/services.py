# backend/apps/rewards/services.py
from django.db import transaction

from apps.assignments.models import QuestProgress, StepCompletion
from .models import QuestStepReward, StudentReward, Reward


def is_held_reward(step_reward):
    """Held = released only after the teacher's review of the final output:
    everything on the final step (the final points) and every badge.
    All other rewards are plain step points, given as soon as the step's
    checklist is complete."""
    return (
        step_reward.quest_step.is_final_step
        or step_reward.reward.reward_type == Reward.RewardType.BADGE
    )


def grant_step_points(progress, quest_step):
    """Give the student the immediate points of a step they just completed
    (no badge, no final-step reward). Idempotent."""
    step_rewards = (
        QuestStepReward.objects.filter(quest_step=quest_step).select_related("reward", "quest_step")
    )
    for step_reward in step_rewards:
        if is_held_reward(step_reward):
            continue
        _, created = StudentReward.objects.get_or_create(
            student=progress.student,
            quest_step_reward=step_reward,
            defaults={
                "reward": step_reward.reward,
                "quest_assignment": progress.quest_assignment,
                "points_awarded": step_reward.awarded_points,
            },
        )
        if created:
            progress.points_earned += step_reward.awarded_points


@transaction.atomic
def release_quest_rewards(quest_assignment):
    """After the teacher's review: release the held rewards (final points +
    badge) to EVERY member of the group.

    Safe to call more than once: StudentReward is unique per
    (student, quest_step_reward) and points are only added when a row is
    really created, so nothing is ever awarded twice.

    Returns {student_id: {"points": int, "badges": int}} for what was newly
    released in THIS call.
    """
    step_rewards = [
        sr for sr in
        QuestStepReward.objects
        .filter(quest_step__quest=quest_assignment.quest)
        .select_related("reward", "quest_step")
        if is_held_reward(sr)
    ]
    released = {}
    if not step_rewards:
        return released

    progresses = (
        QuestProgress.objects.select_for_update()
        .filter(quest_assignment=quest_assignment)
        .select_related("student")
    )
    for progress in progresses:
        done_step_ids = set(
            StepCompletion.objects
            .filter(quest_progress=progress, completed_at__isnull=False)
            .values_list("quest_step_id", flat=True)
        )
        points = 0
        badges = 0
        for step_reward in step_rewards:
            if step_reward.quest_step_id not in done_step_ids:
                continue
            _, created = StudentReward.objects.get_or_create(
                student=progress.student,
                quest_step_reward=step_reward,
                defaults={
                    "reward": step_reward.reward,
                    "quest_assignment": quest_assignment,
                    "points_awarded": step_reward.awarded_points,
                },
            )
            if created:
                points += step_reward.awarded_points
                if step_reward.reward.reward_type == Reward.RewardType.BADGE:
                    badges += 1

        if points or badges:
            progress.points_earned += points
            if badges:
                progress.badge_earned = True
            progress.save()
            released[progress.student_id] = {"points": points, "badges": badges}

    return released


def reward_totals(student_rewards):
    """Totals for any StudentReward queryset: {"points": int, "badges": int}."""
    from django.db.models import Sum, Count, Q
    agg = student_rewards.aggregate(
        points=Sum("points_awarded"),
        badges=Count("id", filter=Q(reward__reward_type=Reward.RewardType.BADGE)),
    )
    return {"points": agg["points"] or 0, "badges": agg["badges"] or 0}


def resync_progress_totals(student=None):
    """Repair the cached QuestProgress.points_earned / badge_earned from the
    StudentReward rows (the source of truth). Returns how many rows changed."""
    from django.db.models import Sum, Count, Q
    progresses = QuestProgress.objects.all()
    if student is not None:
        progresses = progresses.filter(student=student)
    changed = 0
    for progress in progresses:
        agg = StudentReward.objects.filter(
            student_id=progress.student_id, quest_assignment_id=progress.quest_assignment_id
        ).aggregate(
            points=Sum("points_awarded"),
            badges=Count("id", filter=Q(reward__reward_type=Reward.RewardType.BADGE)),
        )
        points, has_badge = agg["points"] or 0, (agg["badges"] or 0) > 0
        if progress.points_earned != points or progress.badge_earned != has_badge:
            progress.points_earned, progress.badge_earned = points, has_badge
            progress.save(update_fields=["points_earned", "badge_earned"])
            changed += 1
    return changed
