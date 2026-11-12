import { apiClient } from './client';
import type { AuditLogPage } from '../types/auditLog';

export async function getAuditLogs(params: { page: number; action?: string; q?: string }): Promise<AuditLogPage> {
  const { data } = await apiClient.get<AuditLogPage>('/accounts/admin/audit-logs/', {
    params: { page: params.page, action: params.action || undefined, q: params.q || undefined },
  });
  return data;
}
