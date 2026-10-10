// mobile/src/api/assignments.ts
import { apiClient } from './client';
import { QuestProgress, QuestAssignment, QuestProgressDetail } from '../types/assignments';

export async function getMyProgress(): Promise<QuestProgress[]> {
  const { data } = await apiClient.get<QuestProgress[]>('/assignments/progress/');
  return data;
}

export async function getProgressDetail(progressId: number): Promise<QuestProgressDetail> {
  const { data } = await apiClient.get<QuestProgressDetail>(`/assignments/progress/${progressId}/`);
  return data;
}

export async function toggleChecklistItem(
  progressId: number,
  stepId: number,
  checklistId: number,
  isChecked: boolean
): Promise<QuestProgressDetail> {
  const { data } = await apiClient.patch<QuestProgressDetail>(
    `/assignments/progress/${progressId}/steps/${stepId}/checklist/${checklistId}/`,
    { is_checked: isChecked }
  );
  return data;
}

// Teacher: every assignment (one per group per quest) across all their quests
export async function getAllAssignments(): Promise<QuestAssignment[]> {
  const { data } = await apiClient.get<QuestAssignment[]>('/assignments/assignments/');
  return data;
}

export async function getAssignmentsForQuest(questId: number): Promise<QuestAssignment[]> {
  const { data } = await apiClient.get<QuestAssignment[]>(`/assignments/assignments/?quest=${questId}`);
  return data;
}

export async function assignQuest(payload: {
  quest: number;
  quest_mode: 'individual' | 'group';
  due_date?: string | null;
  group_ids?: number[]; // omit = every group in the quest's classes
}): Promise<QuestAssignment[]> {
  const { data } = await apiClient.post<QuestAssignment[]>('/assignments/assign/', payload);
  return data;
}

export async function updateAssignmentDueDate(assignmentId: number, dueDate: string | null): Promise<QuestAssignment> {
  const { data } = await apiClient.patch<QuestAssignment>(`/assignments/assignments/${assignmentId}/`, { due_date: dueDate });
  return data;
}