# backend/apps/quests/services.py
"""Keeps a quest's steps consistent when a teacher adds, edits or deletes one:
   - step_order is always 1..n with no gaps,
   - the LAST step (and only it) is the final step,
   - students who are already part-way through are kept correct,
   - a step's points / badge can be set with two plain fields (points, badge_name)."""
from django.db import transaction

from .models import QuestStep

_OFFSET = 100000  # temporary shift so renumbering never hits the (quest, step_order) unique constraint


@transaction.atomic
def apply_step_rewards(step, points=None, badge_name=None):
    """Create / update / remove the points reward and the badge of one step.
    `None` means "leave it as it is"; points=0 or badge_name="" removes it.
    Already-earned rewards are never touched (StudentReward keeps what was awarded)."""
    from apps.rewards.models import Reward, QuestStepReward

    if points is not None:
        links = list(QuestStepReward.objects.filter(quest_step=step, reward__reward_type="points").order_by("id"))
        if points > 0:
            if links:
                links[0].points_override = points
                links[0].save(update_fields=["points_override", "updated_at"])
                for extra in links[1:]:
                    extra.delete()
            else:
                reward = Reward.objects.create(
                    reward_name=f"{step.title} points"[:80], reward_type="points",
                    points_value=points, description=f'Points for completing "{step.title}"',
                )
                QuestStepReward.objects.create(
                    quest_step=step, reward=reward, reward_condition="Complete all checklist items")
        else:
            for link in links:
                link.delete()

    if badge_name is not None:
        badge_name = badge_name.strip()
        links = list(QuestStepReward.objects.filter(quest_step=step, reward__reward_type="badge").order_by("id"))
        if badge_name:
            if links:
                link = links[0]
                shared = link.reward.quest_step_links.exclude(pk=link.pk).exists()
                if shared:  # never rename a badge that other steps/quests also use
                    link.reward = Reward.objects.create(
                        reward_name=badge_name[:80], reward_type="badge", points_value=0,
                        description=f'Badge for completing "{step.title}"')
                    link.save(update_fields=["reward", "updated_at"])
                elif link.reward.reward_name != badge_name[:80]:
                    link.reward.reward_name = badge_name[:80]
                    link.reward.save(update_fields=["reward_name", "updated_at"])
                for extra in links[1:]:
                    extra.delete()
            else:
                reward = Reward.objects.create(
                    reward_name=badge_name[:80], reward_type="badge", points_value=0,
                    description=f'Badge for completing "{step.title}"')
                QuestStepReward.objects.create(
                    quest_step=step, reward=reward, reward_condition="Complete all checklist items")
        else:
            for link in links:
                link.delete()


@transaction.atomic
def refresh_quest_steps(quest):
    """Call after any step is created, changed or deleted."""
    from django.utils import timezone
    from apps.assignments.models import QuestProgress, StepCompletion
    from apps.rewards.services import grant_step_points
    from apps.submissions.models import Submission

    steps = list(quest.steps.order_by("step_order", "id"))

    # 1. step_order = 1..n
    wrong = [(i, s) for i, s in enumerate(steps, 1) if s.step_order != i]
    for i, s in wrong:
        QuestStep.objects.filter(pk=s.pk).update(step_order=s.step_order + _OFFSET)
    for i, s in wrong:
        QuestStep.objects.filter(pk=s.pk).update(step_order=i)

    # 2. only the last step is final
    last = steps[-1] if steps else None
    previously_final = [s.pk for s in steps if s.is_final_step]
    QuestStep.objects.filter(quest=quest).update(is_final_step=False)
    if last:
        QuestStep.objects.filter(pk=last.pk).update(is_final_step=True)
    if last is None:
        return

    lost_final = [pk for pk in previously_final if pk != last.pk]
    gained_final = last.pk not in previously_final

    # 3a. A step that is no longer final now gives its points right away: students who
    #     already completed it were skipped back then (its points were held), so catch up.
    for step_id in lost_final:
        step = QuestStep.objects.get(pk=step_id)
        done = StepCompletion.objects.filter(quest_step=step, completed_at__isnull=False).select_related("quest_progress")
        for completion in done:
            progress = completion.quest_progress
            grant_step_points(progress, step)
            progress.save()

    if not (gained_final or lost_final):
        return

    progresses = QuestProgress.objects.filter(quest_assignment__quest=quest).select_related("quest_assignment")
    last_done_ids = set(
        StepCompletion.objects.filter(quest_step=last, completed_at__isnull=False)
        .values_list("quest_progress_id", flat=True)
    )
    for progress in progresses:
        finished_last = progress.pk in last_done_ids
        if progress.completed_at and not finished_last:
            # Finished before the new last step existed -> they still have one step to do,
            # unless their output was already submitted (then leave it alone).
            if not Submission.objects.filter(quest_assignment=progress.quest_assignment).exists():
                progress.completed_at = None
                progress.current_step = last
                progress.save()
        elif not progress.completed_at and finished_last:
            progress.completed_at = timezone.now()
            progress.save()
