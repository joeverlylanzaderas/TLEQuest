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

// Matches StudentRewardSerializer — one row per earned reward
export interface StudentReward {
  id: number;
  student: number;
  student_username: string;
  reward: number;
  reward_detail: RewardDetail;
  quest_assignment: number;
  earned_at: string;
}