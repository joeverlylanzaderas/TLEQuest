from datetime import timedelta

from django.db.models import Avg, Count, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from rest_framework import generics
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin
from apps.assignments.models import QuestAssignment, QuestProgress
from apps.classrooms.models import Class, ClassEnrollment, Group
from apps.quests.models import Quest
from apps.rewards.models import StudentReward
from apps.submissions.models import Submission

from .models import SystemSettings
from .serializers import SystemSettingsSerializer


class SystemSettingsView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAdmin]
    serializer_class = SystemSettingsSerializer

    def get_object(self):
        return SystemSettings.get_solo()


class TeacherDashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role not in ("teacher", "admin"):
            raise PermissionDenied("Only teachers/admins can view this dashboard.")

        classes = Class.objects.all() if user.role == "admin" else Class.objects.filter(teacher=user)
        class_ids = list(classes.values_list("id", flat=True))

        quest_qs = Quest.objects.filter(classes__id__in=class_ids).distinct()
        group_qs = Group.objects.filter(class_obj_id__in=class_ids)

        class_breakdown = [
            {
                "id": c.id,
                "class_name": c.class_name,
                "section": c.section,
                "active_quests": quest_qs.filter(classes=c, is_published=True).count(),
                "total_groups": group_qs.filter(class_obj=c).count(),
                "total_students": c.enrollments.count(),
            }
            for c in classes
        ]

        events = []

        started = QuestProgress.objects.filter(
            quest_assignment__quest__classes__id__in=class_ids, started_at__isnull=False
        ).distinct().select_related("student", "student__profile", "quest_assignment__quest").order_by("-started_at")[:10]
        for p in started:
            name = f"{p.student.profile.first_name} {p.student.profile.last_name}".strip() or p.student.username
            events.append({
                "type": "quest_started",
                "student_full_name": name,
                "description": f'Started "{p.quest_assignment.quest.title}"',
                "timestamp": p.started_at,
            })

        finished = QuestProgress.objects.filter(
            quest_assignment__quest__classes__id__in=class_ids, completed_at__isnull=False
        ).distinct().select_related("student", "student__profile", "quest_assignment__quest").order_by("-completed_at")[:10]
        for p in finished:
            name = f"{p.student.profile.first_name} {p.student.profile.last_name}".strip() or p.student.username
            events.append({
                "type": "quest_finished",
                "student_full_name": name,
                "description": f'Finished all "{p.quest_assignment.quest.title}" steps',
                "timestamp": p.completed_at,
            })

        submitted = Submission.objects.filter(
            quest_assignment__quest__classes__id__in=class_ids
        ).distinct().select_related("student", "student__profile", "quest_assignment__quest").order_by("-submitted_at")[:10]
        for s in submitted:
            name = f"{s.student.profile.first_name} {s.student.profile.last_name}".strip() or s.student.username
            events.append({
                "type": "submission_made",
                "student_full_name": name,
                "description": f'Submitted "{s.quest_assignment.quest.title}" group output',
                "timestamp": s.submitted_at,
            })

        events.sort(key=lambda e: e["timestamp"], reverse=True)

        return Response({
            "student_count": sum(c.enrollments.count() for c in classes),
            "class_count": len(class_ids),
            "quest_count": quest_qs.count(),
            "group_count": group_qs.count(),
            "classes": class_breakdown,
            "recent_activity": events[:10],
        })


class AdminReportsView(APIView):
    """
    Admin-only aggregate reports. Returns all 5 sections in one payload
    (mirrors TeacherDashboardSummaryView's pattern of one big Response
    rather than 5 separate endpoints) — simpler for the frontend to load
    in one call, and the underlying queries are cheap at school-project scale.

    Sections:
      - completion_rates: per-quest QuestProgress completion %
      - leaderboard: top students by points earned + unique badges earned
      - class_performance: per-class completion %, avg submission rating, total points
      - activity_over_time: daily quest-starts + submissions for the last N days
      - teacher_engagement: quests created + submissions reviewed, per teacher

    Query params:
      ?activity_days=14   (default 14) — window size for activity_over_time
      ?leaderboard_limit=20  (default 20) — how many students to return
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        activity_days = self._parse_int(request.query_params.get("activity_days"), default=14)
        leaderboard_limit = self._parse_int(request.query_params.get("leaderboard_limit"), default=20)

        return Response({
            "completion_rates": self._completion_rates(),
            "leaderboard": self._leaderboard(leaderboard_limit),
            "class_performance": self._class_performance(),
            "activity_over_time": self._activity_over_time(activity_days),
            "teacher_engagement": self._teacher_engagement(),
        })

    @staticmethod
    def _parse_int(raw, default):
        try:
            return int(raw)
        except (TypeError, ValueError):
            return default

        # ---- Section 1: Quest/assignment completion rates ----
    def _completion_rates(self):
        quests = Quest.objects.filter(is_published=True).prefetch_related("classes")
        results = []
        for q in quests:
            progress_qs = QuestProgress.objects.filter(quest_assignment__quest=q)
            total = progress_qs.count()
            completed = progress_qs.filter(completed_at__isnull=False).count()
            class_list = list(q.classes.all())
            results.append({
                "quest_id": q.id,
                "quest_title": q.title,
                "class_name": ", ".join(c.class_name for c in class_list),
                "section": ", ".join(c.section for c in class_list if c.section),
                "total_assigned": total,
                "total_completed": completed,
                "completion_rate": round((completed / total) * 100, 1) if total else 0.0,
            })
        results.sort(key=lambda r: r["completion_rate"], reverse=True)
        return results

    # ---- Section 2: Points & badges leaderboard ----
    def _leaderboard(self, limit):
        rows = (
            StudentReward.objects
            .values(
                "student_id",
                "student__username",
                "student__profile__first_name",
                "student__profile__last_name",
            )
            .annotate(
                total_points=Sum("reward__points_value", filter=Q(reward__reward_type="points")),
                unique_badges=Count("reward", filter=Q(reward__reward_type="badge"), distinct=True),
            )
            .order_by("-total_points")[:limit]
        )

        leaderboard = []
        for r in rows:
            full_name = f"{r['student__profile__first_name']} {r['student__profile__last_name']}".strip()
            leaderboard.append({
                "student_id": r["student_id"],
                "username": r["student__username"],
                "full_name": full_name or r["student__username"],
                "total_points": r["total_points"] or 0,
                "unique_badges": r["unique_badges"] or 0,
            })
        return leaderboard

    # ---- Section 3: Class/section performance comparison ----
    def _class_performance(self):
        results = []
        for c in Class.objects.filter(is_active=True):
            progress_qs = QuestProgress.objects.filter(group__class_obj=c)
            total = progress_qs.count()
            completed = progress_qs.filter(completed_at__isnull=False).count()

            rating_avg = Submission.objects.filter(
                group__class_obj=c, teacher_rating__isnull=False
            ).aggregate(avg=Avg("teacher_rating"))["avg"]

            points_total = StudentReward.objects.filter(
                 quest_assignment__group__class_obj=c, reward__reward_type="points"
            ).aggregate(total=Sum("reward__points_value"))["total"]

            results.append({
                "class_id": c.id,
                "class_name": c.class_name,
                "section": c.section,
                "total_students": c.enrollments.count(),
                "completion_rate": round((completed / total) * 100, 1) if total else 0.0,
                "avg_submission_rating": round(rating_avg, 2) if rating_avg is not None else None,
                "total_points_earned": points_total or 0,
            })
        results.sort(key=lambda r: r["completion_rate"], reverse=True)
        return results

    # ---- Section 4: Student activity over time ----
    def _activity_over_time(self, days):
        since = timezone.now() - timedelta(days=days)

        starts_by_day = dict(
            QuestProgress.objects.filter(started_at__gte=since)
            .annotate(day=TruncDate("started_at"))
            .values("day")
            .annotate(count=Count("id"))
            .values_list("day", "count")
        )
        submissions_by_day = dict(
            Submission.objects.filter(submitted_at__gte=since)
            .annotate(day=TruncDate("submitted_at"))
            .values("day")
            .annotate(count=Count("id"))
            .values_list("day", "count")
        )

        today = timezone.now().date()
        series = []
        for offset in range(days - 1, -1, -1):
            day = today - timedelta(days=offset)
            series.append({
                "date": day.isoformat(),
                "quests_started": starts_by_day.get(day, 0),
                "submissions_made": submissions_by_day.get(day, 0),
            })
        return series

    # ---- Section 5: Teacher engagement ----
    def _teacher_engagement(self):
        from apps.accounts.models import User

        teachers = User.objects.filter(role="teacher", is_active=True).select_related("profile")
        results = []
        for t in teachers:
            quests_created = Quest.objects.filter(teacher=t).count()
            submissions_reviewed = Submission.objects.filter(
                reviewed_by=t, reviewed_at__isnull=False
            ).count()
            students_taught = ClassEnrollment.objects.filter(
                class_obj__teacher=t
            ).values("student_id").distinct().count()

            full_name = f"{t.profile.first_name} {t.profile.last_name}".strip()
            results.append({
                "teacher_id": t.id,
                "username": t.username,
                "full_name": full_name or t.username,
                "quests_created": quests_created,
                "submissions_reviewed": submissions_reviewed,
                "students_taught": students_taught,
            })
        results.sort(key=lambda r: r["quests_created"], reverse=True)
        return results