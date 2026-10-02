// admin-web/src/api/dashboard.ts
import { apiClient } from './client';
import type { DashboardSummary } from '../types/dashboard';

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummary>('/dashboard/teacher-dashboard/');
  return data;
}