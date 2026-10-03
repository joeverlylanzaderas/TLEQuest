// mobile/src/api/dashboard.ts
import { apiClient } from './client';
import { TeacherDashboardSummary } from '../types/dashboard';

export async function getTeacherDashboardSummary(): Promise<TeacherDashboardSummary> {
  const { data } = await apiClient.get<TeacherDashboardSummary>('/dashboard/teacher-dashboard/');
  return data;
}