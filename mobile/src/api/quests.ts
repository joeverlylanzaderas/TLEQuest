// mobile/src/api/quests.ts
import { apiClient } from './client';
import {
  Quest, QuestCreatePayload, QuestUpdatePayload,
  QuestStep, QuestStepCreatePayload,
  QuestStepChecklistItem, ChecklistItemCreatePayload,
} from '../types/quests';

export async function getMyQuests(): Promise<Quest[]> {
  const { data } = await apiClient.get<Quest[]>('/quests/quests/');
  return data;
}

export async function getQuestDetail(questId: number): Promise<Quest> {
  const { data } = await apiClient.get<Quest>(`/quests/quests/${questId}/`);
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

export async function createQuestStep(questId: number, payload: QuestStepCreatePayload): Promise<QuestStep> {
  const { data } = await apiClient.post<QuestStep>(`/quests/quests/${questId}/steps/`, payload);
  return data;
}

export async function updateQuestStep(stepId: number, payload: Partial<QuestStepCreatePayload>): Promise<QuestStep> {
  const { data } = await apiClient.patch<QuestStep>(`/quests/steps/${stepId}/`, payload);
  return data;
}

export async function deleteQuestStep(stepId: number): Promise<void> {
  await apiClient.delete(`/quests/steps/${stepId}/`);
}

export async function createChecklistItem(stepId: number, payload: ChecklistItemCreatePayload): Promise<QuestStepChecklistItem> {
  const { data } = await apiClient.post<QuestStepChecklistItem>(`/quests/steps/${stepId}/checklist/`, payload);
  return data;
}

export async function updateChecklistItem(itemId: number, payload: Partial<ChecklistItemCreatePayload>): Promise<QuestStepChecklistItem> {
  const { data } = await apiClient.patch<QuestStepChecklistItem>(`/quests/checklist/${itemId}/`, payload);
  return data;
}

export async function deleteChecklistItem(itemId: number): Promise<void> {
  await apiClient.delete(`/quests/checklist/${itemId}/`);
}