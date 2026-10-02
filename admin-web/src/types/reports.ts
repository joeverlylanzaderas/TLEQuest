// admin-web/src/types/reports.ts

export interface CompletionRateEntry {
  quest_id: number;
  quest_title: string;
  class_name: string;
  section: string;
  total_assigned: number;
  total_completed: number;
  completion_rate: number; // percentage, e.g. 72.5
}

export interface LeaderboardEntry {
  student_id: number;
  username: string;
  full_name: string;
  total_points: number;
  unique_badges: number;
}

export interface ClassPerformanceEntry {
  class_id: number;
  class_name: string;
  section: string;
  total_students: number;
  completion_rate: number;
  avg_submission_rating: number | null; // null if no rated submissions yet
  total_points_earned: number;
}

export interface ActivityDayEntry {
  date: string; // ISO date, e.g. "2026-08-06"
  quests_started: number;
  submissions_made: number;
}

export interface TeacherEngagementEntry {
  teacher_id: number;
  username: string;
  full_name: string;
  quests_created: number;
  submissions_reviewed: number;
  students_taught: number;
}

export interface AdminReports {
  completion_rates: CompletionRateEntry[];
  leaderboard: LeaderboardEntry[];
  class_performance: ClassPerformanceEntry[];
  activity_over_time: ActivityDayEntry[];
  teacher_engagement: TeacherEngagementEntry[];
}