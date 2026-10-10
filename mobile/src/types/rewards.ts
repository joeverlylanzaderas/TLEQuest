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
  earned_at: string;
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