# backend/apps/submissions/models.py
from django.db import models
from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from apps.core.models import TimestampedModel
from apps.classrooms.models import Group
from apps.assignments.models import QuestAssignment


class Submission(TimestampedModel):
    quest_assignment = models.ForeignKey(QuestAssignment, on_delete=models.CASCADE, related_name="submissions")
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="submissions")
    # Whoever submitted it — the permanent record of who was leader at this
    # moment, since only the current leader can submit. No separate
    # snapshot field needed (see chat note).
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="submissions_made", limit_choices_to={"role": "student"},
    )

    image_url = models.URLField()  # Cloudinary URL, uploaded client-side before this record is created
    classifier_result = models.CharField(max_length=100)   # on-device TFLite output label
    confidence_score = models.FloatField()                  # on-device TFLite confidence
    generated_feedback = models.TextField(blank=True)        # auto-generated based on classifier_result

    # Teacher review — feedback text + optional star rating, no approve/reject
    # status per adviser's guidance. Leaving feedback is what releases the
    # quest's final points + badge to the whole group (see
    # apps/rewards/services.release_quest_rewards). No resubmission: the
    # group's table setup is gone by the time the teacher reviews it.
    teacher_feedback = models.TextField(blank=True)
    teacher_rating = models.PositiveSmallIntegerField(
        null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    # Who actually left the review — set server-side in TeacherReviewView,
    # never from client data (same as reviewed_at). Previously this had to
    # be inferred as "whoever owns the quest," which silently misattributed
    # reviews if an admin or a different teacher ever graded on someone
    # else's behalf. SET_NULL (not CASCADE) so deactivating a teacher
    # account doesn't erase historical review records.
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="submissions_reviewed", limit_choices_to={"role__in": ["teacher", "admin"]},
    )
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"{self.group} — {self.quest_assignment.quest.title} ({self.submitted_at:%Y-%m-%d %H:%M})"