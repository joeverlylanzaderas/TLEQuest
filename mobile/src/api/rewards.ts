// mobile/src/api/rewards.ts
import { apiClient } from './client';
import { StudentReward } from '../types/rewards';

// Handles both a plain array response and DRF's paginated
// { results: [...] } shape, in case pagination gets turned on later.
function normalizeList<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : data.results;
}

export async function getMyRewards(): Promise<StudentReward[]> {
  const { data } = await apiClient.get('/rewards/student-rewards/');
  return normalizeList<StudentReward>(data);
}