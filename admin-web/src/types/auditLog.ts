export interface AuditLogEntry {
  id: number;
  action: string;
  actor_username: string;
  target_id: number | null;
  target_label: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface AuditLogPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: AuditLogEntry[];
}
