// mobile/src/api/quests.ts
import { apiClient } from './client';
import { Quest, QuestCreatePayload, QuestUpdatePayload } from '../types/quests';

// No class-filtered endpoint exists — returns ALL quests across every
// class this teacher owns. Filter by `class_obj` client-side.
export async function getMyQuests(): Promise<Quest[]> {
  const { data } = await apiClient.get<Quest[]>('/quests/quests/');
  return data;
}

export async function createQuest(payload: QuestCreatePayload): Promise<Quest> {
  const { data } = await apiClient.post<Quest>('/quests/quests/', payload);
  return data;
}

export async function updateQuest(questId: number, payload: QuestUpdatePayload): Promise<Quest> {
  const { data } = await apiClient.patch<Quest>(`/quests/quests/${questId}/`, payload);
  return data;
}

export async function deleteQuest(questId: number): Promise<void> {
  await apiClient.delete(`/quests/quests/${questId}/`);
}