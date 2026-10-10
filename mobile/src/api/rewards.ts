// mobile/src/api/rewards.ts
import { apiClient } from './client';
import {
  StudentReward, RewardDetail, RewardCreatePayload,
  QuestStepReward, QuestStepRewardCreatePayload,
} from '../types/rewards';

// Handles both a plain array response and DRF's paginated
// { results: [...] } shape, in case pagination gets turned on later.
function normalizeList<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : data.results;
}

export async function getMyRewards(): Promise<StudentReward[]> {
  const { data } = await apiClient.get('/rewards/student-rewards/');
  return normalizeList<StudentReward>(data);
}

export async function createReward(payload: RewardCreatePayload): Promise<RewardDetail> {
  const { data } = await apiClient.post<RewardDetail>('/rewards/rewards/', payload);
  return data;
}

export async function attachRewardToStep(
  stepId: number,
  payload: QuestStepRewardCreatePayload
): Promise<QuestStepReward> {
  const { data } = await apiClient.post<QuestStepReward>(`/rewards/steps/${stepId}/rewards/`, payload);
  return data;
}