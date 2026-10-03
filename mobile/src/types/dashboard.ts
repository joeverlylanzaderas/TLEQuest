// mobile/src/types/dashboard.ts
export interface ClassBreakdown {
  id: number;
  class_name: string;
  section: string;
  active_quests: number;
  total_groups: number;
  total_students: number;
}

export interface RecentActivityEvent {
  type: 'quest_started' | 'quest_finished' | 'submission_made';
  student_full_name: string;
  description: string;
  timestamp: string;
}

export interface TeacherDashboardSummary {
  student_count: number;
  class_count: number;
  quest_count: number;
  group_count: number;
  classes: ClassBreakdown[];
  recent_activity: RecentActivityEvent[];
}