// mobile/src/types/assignments.ts
export interface QuestProgress {
  id: number;
  quest_assignment: number;
  quest_title: string;
  quest_mode: string;
  quest_cover_image_url: string;
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
  review_status: 'none' | 'waiting' | 'reviewed';
  teacher_feedback: string;
  teacher_rating: number | null;
  reviewed_at: string | null;
}

export interface QuestAssignment {
  id: number;
  quest: number;
  quest_title: string;
  group: number;
  group_name: string;
  quest_mode: string;
  leader_at_assignment: string | null;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
}

export type StepStatus = 'completed' | 'available' | 'locked';

export interface ProgressChecklistItem {
  id: number;
  checklist_text: string;
  order_index: number;
  is_checked: boolean;
}

export interface ProgressStep {
  id: number;
  step_order: number;
  title: string;
  instruction: string;
  is_final_step: boolean;
  status: StepStatus;
  checklist_items: ProgressChecklistItem[];
}

export interface QuestProgressDetail extends QuestProgress {
  quest_id: number;
  quest_description: string;
  due_date: string | null;
  group_name: string | null;
  is_group_leader: boolean;
  steps: ProgressStep[];
  group_progress: { total: number; finished: number; pending_names: string[] };
}