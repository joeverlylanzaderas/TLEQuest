//mobile/src/types/assignments.ts
export interface QuestProgress {
  id: number;
  quest_assignment: number;
  quest_title: string;
  quest_mode: string;
  table_setting_type: string;
  group: number;
  student: number;
  student_username: string;
  current_step: number | null;
  total_steps: number;
  percent_complete: number;
  points_earned: number;
  badge_earned: boolean;
  started_at: string | null;
  completed_at: string | null;
  step_completions: unknown[];
}