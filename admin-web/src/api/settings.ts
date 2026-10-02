import { apiClient } from './client';
import type { SystemSettings, SystemSettingsUpdate } from '../types/settings';

export async function getSystemSettings(): Promise<SystemSettings> {
  const { data } = await apiClient.get<SystemSettings>('/core/system-settings/');
  return data;
}

export async function updateSystemSettings(
  payload: SystemSettingsUpdate
): Promise<SystemSettings> {
  const { data } = await apiClient.patch<SystemSettings>('/core/system-settings/', payload);
  return data;
}