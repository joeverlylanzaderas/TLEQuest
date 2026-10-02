// admin-web/src/api/reports.ts
import { apiClient } from './client';
import type { AdminReports } from '../types/reports';

interface GetReportsOptions {
  activityDays?: number;
  leaderboardLimit?: number;
}

export async function getAdminReports(options: GetReportsOptions = {}): Promise<AdminReports> {
  const params: Record<string, number> = {};
  if (options.activityDays) params.activity_days = options.activityDays;
  if (options.leaderboardLimit) params.leaderboard_limit = options.leaderboardLimit;

  const { data } = await apiClient.get<AdminReports>('/dashboard/admin-reports/', { params });
  return data;
}