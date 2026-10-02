import { apiClient } from './client';
import type { SecurityQuestion, ChangePasswordPayload } from '../types/security';

export async function getSecurityQuestions(): Promise<SecurityQuestion[]> {
  const { data } = await apiClient.get<SecurityQuestion[]>('/accounts/security-questions/');
  return data;
}

export async function changePassword(payload: ChangePasswordPayload): Promise<{ detail: string }> {
  const { data } = await apiClient.post<{ detail: string }>('/accounts/change-password/', payload);
  return data;
}