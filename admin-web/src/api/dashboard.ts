// admin-web/src/api/dashboard.ts
import { apiClient } from './client';
import type { DashboardSummary, MonthActivity, DayActivity } from '../types/dashboard';

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummary>('/dashboard/teacher-dashboard/');
  return data;
}

// The browser's own timezone, so "a day" means the admin's day and not the server's (UTC).
const viewerTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export async function getMonthActivity(month: string, classId?: number | null): Promise<MonthActivity> {
  const { data } = await apiClient.get<MonthActivity>('/dashboard/daily-activity/', {
    params: { month, tz: viewerTz(), ...(classId ? { class_id: classId } : {}) },
  });
  return data;
}

export async function getDayActivity(date: string, classId?: number | null): Promise<DayActivity> {
  const { data } = await apiClient.get<DayActivity>('/dashboard/daily-activity/', {
    params: { date, tz: viewerTz(), ...(classId ? { class_id: classId } : {}) },
  });
  return data;
}
