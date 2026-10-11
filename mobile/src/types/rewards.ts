// mobile/src/types/rewards.ts

export type RewardType = 'points' | 'badge';

// Matches RewardSerializer
export interface RewardDetail {
  id: number;
  reward_name: string;
  reward_type: RewardType;
  points_value: number;
  badge_image: string | null;
  description: string;
}

// Matches StudentRewardSerializer: one row per earned reward
export interface StudentReward {
  id: number;
  student: number;
  student_username: string;
  reward: number;
  reward_detail: RewardDetail;
  quest_assignment: number;
  points_awarded: number;
  earned_at: string;
}

// GET /rewards/student-rewards/summary/ : the one source for every points/badge total
export interface RewardSummary {
  total_points: number;
  total_badges: number;
  per_quest: { quest_assignment: number; quest_title: string; points: number; badges: number }[];
}

export interface RewardCreatePayload {
  reward_name: string;
  reward_type: RewardType;
  points_value: number;
  description?: string;
}

// Matches QuestStepRewardSerializer (read)
export interface QuestStepReward {
  id: number;
  quest_step: number;
  reward: number;
  reward_detail: RewardDetail;
  reward_condition: string;
  points_override: number | null;
  effective_points: number;
}

// Matches QuestStepRewardCreateUpdateSerializer (write)
export interface QuestStepRewardCreatePayload {
  reward: number;
  reward_condition: string;
  points_override?: number | null;
}