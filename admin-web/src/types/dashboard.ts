// admin-web/src/types/dashboard.ts

export interface ClassBreakdownEntry {
  id: number;
  class_name: string;
  section: string;
  active_quests: number;
  total_groups: number;
  total_students: number;
}

export type ActivityEventType = 'quest_started' | 'quest_finished' | 'submission_made';

export interface RecentActivityEvent {
  type: ActivityEventType;
  student_full_name: string;
  description: string;
  timestamp: string; // ISO datetime
}

export interface DashboardSummary {
  student_count: number;
  class_count: number;
  quest_count: number;
  group_count: number;
  classes: ClassBreakdownEntry[];
  recent_activity: RecentActivityEvent[];
}

// ---- Calendar / daily activity ----
export type DayEventType = ActivityEventType | 'feedback_given' | 'reward_earned';

export interface DayEvent {
  type: DayEventType;
  student_full_name: string;
  description: string;
  timestamp: string;
}

export interface DayCounts {
  started: number;
  finished: number;
  submitted: number;
  reviewed: number; // teacher feedback given
  rewarded: number; // points / badges granted
  points: number;   // total points granted that day
  total: number;    // number of events of all kinds
}

export interface MonthActivity {
  month: string; // YYYY-MM
  days: Record<string, DayCounts>; // keyed by YYYY-MM-DD, only days with activity
}

export interface HourBucket {
  hour: number; // 0-23
  started: number;
  finished: number;
  submitted: number;
  reviewed: number;
  rewarded: number;
}

export interface DayQuestBreakdown {
  quest_title: string;
  events: number;
  started: number;
  finished: number;
  submitted: number;
  reviewed: number;
  rewarded: number;
}

export interface DayActivity {
  date: string; // YYYY-MM-DD
  counts: DayCounts;
  hourly: HourBucket[];
  per_quest: DayQuestBreakdown[];
  events: DayEvent[];
}
