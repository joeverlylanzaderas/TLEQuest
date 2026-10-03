import { apiClient } from './client';
import { QuestProgress } from '../types/assignments';

export async function getMyProgress(): Promise<QuestProgress[]> {
  const { data } = await apiClient.get<QuestProgress[]>('/assignments/progress/');
  return data;
}