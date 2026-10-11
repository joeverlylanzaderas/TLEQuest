from datetime import date as date_cls, datetime, time as time_cls, timedelta
from zoneinfo import ZoneInfo

from django.db.models import Avg, Count, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from rest_framework import generics
from rest_framework.exceptions import PermissionDenied, ValidationError
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


class DailyActivityView(APIView):
    """
    Calendar-driven activity for the dashboard.

    ?month=YYYY-MM   -> {"days": {"2026-10-11": {"started": 2, ..., "total": 6}, ...}}
                        (used to colour the calendar cells)
    ?date=YYYY-MM-DD -> counts, a 24-bucket hourly breakdown, per-quest totals and the
                        full event list for that single day.
    ?tz=Asia/Manila  -> the viewer's timezone. Days are cut at the viewer's midnight, not
                        the server's (the server runs on UTC), so a 7am submission in Manila
                        lands on the right day.
    ?class_id=3      -> optional, limit everything to one class.

    Five kinds of event: started, finished, submitted, reviewed (teacher left feedback) and
    rewarded (points or a badge granted). Same scope rules as TeacherDashboardSummaryView:
    admins see everything, teachers only their own classes.
    """
    permission_classes = [IsAuthenticated]

    # event type -> key used in the counts / hourly buckets
    KEYS = {
        "quest_started": "started",
        "quest_finished": "finished",
        "submission_made": "submitted",
        "feedback_given": "reviewed",
        "reward_earned": "rewarded",
    }

    def get(self, request):
        user = request.user
        if user.role not in ("teacher", "admin"):
            raise PermissionDenied("Only teachers/admins can view this dashboard.")

        tz = self._parse_tz(request.query_params.get("tz"))
        classes = Class.objects.all() if user.role == "admin" else Class.objects.filter(teacher=user)
        class_ids = list(classes.values_list("id", flat=True))

        raw_class = request.query_params.get("class_id")
        if raw_class:
            try:
                wanted = int(raw_class)
            except ValueError:
                raise ValidationError({"class_id": "Must be a number."})
            # a teacher asking for someone else's class simply gets nothing
            class_ids = [wanted] if wanted in class_ids else []

        month = request.query_params.get("month")
        day = request.query_params.get("date")
        if day:
            return Response(self._day_detail(class_ids, self._parse_date(day), tz))
        if month:
            return Response(self._month_summary(class_ids, month, tz))
        raise ValidationError("Provide either ?month=YYYY-MM or ?date=YYYY-MM-DD.")

    # ---- parsing -----------------------------------------------------------
    @staticmethod
    def _parse_tz(raw):
        try:
            return ZoneInfo(raw) if raw else timezone.get_current_timezone()
        except Exception:
            return timezone.get_current_timezone()

    @staticmethod
    def _parse_date(raw):
        try:
            return date_cls.fromisoformat(raw)
        except (TypeError, ValueError):
            raise ValidationError({"date": "Use the format YYYY-MM-DD."})

    # ---- querysets ---------------------------------------------------------
    @staticmethod
    def _sources(class_ids):
        """(type, queryset, timestamp field) for every kind of event."""
        base = {"quest_assignment__quest__classes__id__in": class_ids}
        return [
            ("quest_started", QuestProgress.objects.filter(started_at__isnull=False, **base), "started_at"),
            ("quest_finished", QuestProgress.objects.filter(completed_at__isnull=False, **base), "completed_at"),
            ("submission_made", Submission.objects.filter(**base), "submitted_at"),
            ("feedback_given", Submission.objects.filter(reviewed_at__isnull=False, **base), "reviewed_at"),
            ("reward_earned", StudentReward.objects.filter(**base), "earned_at"),
        ]

    @staticmethod
    def _bounds(first_day, last_day_exclusive, tz):
        start = datetime.combine(first_day, time_cls.min, tzinfo=tz)
        end = datetime.combine(last_day_exclusive, time_cls.min, tzinfo=tz)
        return start, end

    @classmethod
    def _empty_counts(cls):
        return {**{k: 0 for k in cls.KEYS.values()}, "points": 0, "total": 0}

    # ---- month -------------------------------------------------------------
    def _month_summary(self, class_ids, month, tz):
        try:
            year, mon = (int(x) for x in month.split("-"))
            first = date_cls(year, mon, 1)
        except (ValueError, TypeError):
            raise ValidationError({"month": "Use the format YYYY-MM."})
        nxt = date_cls(year + (mon == 12), 1 if mon == 12 else mon + 1, 1)
        start, end = self._bounds(first, nxt, tz)

        days = {}
        for etype, qs, field in self._sources(class_ids):
            stamps = qs.filter(**{f"{field}__gte": start, f"{field}__lt": end}).distinct().values_list("id", field)
            for _id, stamp in stamps:
                d = stamp.astimezone(tz).date().isoformat()
                row = days.setdefault(d, self._empty_counts())
                row[self.KEYS[etype]] += 1
                row["total"] += 1
        return {"month": month, "days": days}

    # ---- single day --------------------------------------------------------
    def _day_detail(self, class_ids, day, tz):
        start, end = self._bounds(day, day + timedelta(days=1), tz)
        counts = self._empty_counts()
        hourly = [{"hour": h, **{k: 0 for k in self.KEYS.values()}} for h in range(24)]
        per_quest = {}
        events = []

        for etype, qs, field in self._sources(class_ids):
            key = self.KEYS[etype]
            rows = (
                qs.filter(**{f"{field}__gte": start, f"{field}__lt": end})
                .distinct()
                .select_related("student", "student__profile", "quest_assignment__quest")
                .order_by(field)
            )
            if etype == "reward_earned":
                rows = rows.select_related("reward")
            for r in rows:
                stamp = getattr(r, field)
                local = stamp.astimezone(tz)
                quest_title = r.quest_assignment.quest.title
                prof = getattr(r.student, "profile", None)
                name = (f"{prof.first_name} {prof.last_name}".strip() if prof else "") or r.student.username

                counts[key] += 1
                counts["total"] += 1
                hourly[local.hour][key] += 1
                q = per_quest.setdefault(
                    quest_title, {"quest_title": quest_title, "events": 0, **{k: 0 for k in self.KEYS.values()}}
                )
                q[key] += 1
                q["events"] += 1

                if etype == "quest_started":
                    text = f'Started "{quest_title}"'
                elif etype == "quest_finished":
                    text = f'Finished all "{quest_title}" steps'
                elif etype == "submission_made":
                    text = f'Submitted "{quest_title}" group output'
                elif etype == "feedback_given":
                    stars = f" ({r.teacher_rating}/5)" if r.teacher_rating else ""
                    text = f'Teacher feedback on "{quest_title}"{stars}'
                else:
                    counts["points"] += r.points_awarded
                    text = (
                        f'+{r.points_awarded} pts · "{quest_title}"' if r.points_awarded
                        else f'Badge "{r.reward.reward_name}" · "{quest_title}"'
                    )
                events.append({"type": etype, "student_full_name": name, "description": text, "timestamp": stamp})

        events.sort(key=lambda e: e["timestamp"], reverse=True)
        return {
            "date": day.isoformat(),
            "counts": counts,
            "hourly": hourly,
            "per_quest": sorted(per_quest.values(), key=lambda q: -q["events"]),
            "events": events,
        }


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
                total_points=Sum("points_awarded"),
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
                quest_assignment__group__class_obj=c
            ).aggregate(total=Sum("points_awarded"))["total"]

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