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