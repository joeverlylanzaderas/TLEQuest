import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ClipboardList, Search } from 'lucide-react';
import { getAuditLogs } from '../api/auditLog';
import type { AuditLogEntry } from '../types/auditLog';

const PAGE_SIZE = 25;

// Plain-language names for the action codes the server writes.
const ACTION_LABELS: Record<string, { label: string; tone: 'green' | 'blue' | 'amber' | 'red' | 'gray' }> = {
  'user.create': { label: 'Created user', tone: 'green' },
  'user.update': { label: 'Edited user', tone: 'blue' },
  'user.activate': { label: 'Reactivated user', tone: 'green' },
  'user.deactivate': { label: 'Deactivated user', tone: 'red' },
  'user.password_reset': { label: 'Reset password', tone: 'amber' },
  'user.bulk_upload': { label: 'Bulk upload', tone: 'blue' },
  'auth.login': { label: 'Signed in', tone: 'gray' },
  'auth.login_failed': { label: 'Failed sign-in', tone: 'red' },
  'auth.logout': { label: 'Signed out', tone: 'gray' },
  'auth.password_change': { label: 'Changed own password', tone: 'amber' },
  'settings.update': { label: 'Changed system settings', tone: 'blue' },
};

const CATEGORIES = [
  { value: '', label: 'All activity' },
  { value: 'user.', label: 'User accounts' },
  { value: 'auth.', label: 'Sign-ins' },
  { value: 'settings.', label: 'System settings' },
];

const pretty = (key: string) => key.replace(/_/g, ' ');
const show = (v: unknown) => (v === true ? 'on' : v === false ? 'off' : v === '' || v == null ? '(empty)' : String(v));

function describe(entry: AuditLogEntry): string {
  const d = entry.details ?? {};
  const parts: string[] = [];
  // What really changed: "theme: default → school"
  if (d.changes && typeof d.changes === 'object') {
    for (const [key, v] of Object.entries(d.changes as Record<string, { from?: unknown; to?: unknown }>)) {
      parts.push(`${pretty(key)}: ${show(v?.from)} → ${show(v?.to)}`);
    }
  }
  // Older entries (before this change) only had the list of fields
  if (Array.isArray(d.fields) && d.fields.length) parts.push(`changed ${(d.fields as string[]).join(', ')}`);
  if (d.role_from && d.role_to) parts.push(`role ${d.role_from} → ${d.role_to}`);
  else if (d.role) parts.push(`role: ${d.role}`);
  if (typeof d.created_count === 'number') parts.push(`${d.created_count} created, ${d.error_count ?? 0} rejected`);
  if (d.reason === 'idle') parts.push('automatic (no activity)');
  return parts.join(' · ');
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default function AuditLogPage() {
  const [rows, setRows] = useState<AuditLogEntry[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState(''); // search text actually sent (debounced)
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => { setQuery(search.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getAuditLogs({ page, action: category, q: query });
      setRows(data.results);
      setCount(data.count);
    } catch (err: any) {
      if (err?.response?.status === 404 && page > 1) { setPage(1); return; }
      setError(err?.response?.data?.detail || 'Could not load the audit log. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [page, category, query]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <div className="page-wrapper">
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; background-color: var(--t-f8efe6); color: var(--t-804022); font-family: 'Inter', sans-serif; }
        h1, h2, h3 { font-family: 'Plus Jakarta Sans', sans-serif; }
        .page-wrapper { min-height: 100vh; padding: 24px 32px; max-width: 1100px; margin: 0 auto; }
        .header-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 12px; }
        .back-btn {
          background: #FFFFFF; border: 1px solid var(--t-d6bb83); color: var(--t-804022); padding: 10px 18px;
          border-radius: 9999px; font-size: 14px; font-weight: 700; cursor: pointer; display: inline-flex;
          align-items: center; gap: 8px; box-shadow: 0 2px 8px rgba(128, 64, 34, 0.05); transition: all 0.2s ease;
        }
        .back-btn:hover { background: var(--t-fcecd6); border-color: var(--t-c37800); color: var(--t-c37800); }
        .signout-btn {
          background: rgba(223, 27, 57, 0.1); color: #DF1B39; border: 1px solid rgba(223, 27, 57, 0.2);
          padding: 10px 18px; border-radius: 9999px; font-size: 14px; font-weight: 700; cursor: pointer;
          display: inline-flex; align-items: center; gap: 8px;
        }
        .signout-btn:hover { background: rgba(223, 27, 57, 0.2); }
        .page-title-area { text-align: center; margin-bottom: 24px; }
        .page-title-area h1 { font-size: 32px; font-weight: 800; color: var(--t-5c2c16); margin: 0 0 8px 0; }
        .page-title-area p { margin: 0; color: var(--t-804022); font-size: 15px; font-weight: 500; }

        .al-card { background: #FFFFFF; border: 1px solid var(--t-d6bb83); border-radius: 16px; box-shadow: 0 4px 12px rgba(128, 64, 34, 0.04); overflow: hidden; }
        .al-toolbar { display: flex; gap: 12px; padding: 16px; flex-wrap: wrap; border-bottom: 1px solid var(--t-f3efd4); }
        .al-search { position: relative; flex: 1 1 240px; min-width: 0; }
        .al-search svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--t-c37800); }
        .al-input, .al-select {
          width: 100%; background: var(--t-f8efe6); border: 1px solid var(--t-d6bb83); padding: 10px 14px;
          border-radius: 10px; font-size: 14px; color: var(--t-804022); outline: none; font-family: inherit;
        }
        .al-input { padding-left: 38px; }
        .al-select { width: auto; flex: 0 0 auto; cursor: pointer; }
        .al-table-wrap { overflow-x: auto; }
        table.al-table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 760px; }
        .al-table th {
          text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--t-804022);
          padding: 12px 16px; background: var(--t-f8efe6); white-space: nowrap;
        }
        .al-table td { padding: 12px 16px; border-top: 1px solid var(--t-f3efd4); vertical-align: top; color: var(--t-5c2c16); }
        .al-time { white-space: nowrap; color: var(--t-804022); }
        .al-muted { color: var(--t-804022); font-size: 13px; }
        .al-badge { display: inline-block; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 9999px; white-space: nowrap; }
        .al-green { background: #DCFCE7; color: #166534; }
        .al-blue { background: #DBEAFE; color: #1E40AF; }
        .al-amber { background: #FEF3C7; color: #92400E; }
        .al-red { background: #FEE2E2; color: #991B1B; }
        .al-gray { background: #F1F5F9; color: #475569; }
        .al-empty { padding: 40px 16px; text-align: center; color: var(--t-804022); }
        .al-pager { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-top: 1px solid var(--t-f3efd4); gap: 12px; flex-wrap: wrap; }
        .al-pager button {
          background: #FFFFFF; border: 1px solid var(--t-d6bb83); color: var(--t-804022); padding: 8px 14px; border-radius: 9999px;
          font-weight: 700; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;
        }
        .al-pager button:disabled { opacity: 0.45; cursor: not-allowed; }
        @media (max-width: 640px) { .page-wrapper { padding: 16px; } .page-title-area h1 { font-size: 26px; } }
      `}</style>


      <div className="page-title-area">
        <h1>Audit Log</h1>
        <p>A record of who created, changed or deactivated accounts, and who signed in as admin.</p>
      </div>

      {error && (
        <div style={{ background: '#EC7D76', color: '#fff', padding: 14, borderRadius: 12, marginBottom: 20, fontSize: 14 }}>
          {error}
        </div>
      )}

      <div className="al-card">
        <div className="al-toolbar">
          <div className="al-search">
            <Search size={16} />
            <input
              className="al-input"
              placeholder="Search by admin or username…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search the audit log"
            />
          </div>
          <select
            className="al-select"
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            aria-label="Filter by type"
          >
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        <div className="al-table-wrap">
          <table className="al-table">
            <thead>
              <tr><th>When</th><th>Who</th><th>Action</th><th>Account</th><th>Details</th><th>IP address</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const meta = ACTION_LABELS[r.action] ?? { label: r.action, tone: 'gray' as const };
                return (
                  <tr key={r.id}>
                    <td className="al-time">{formatTime(r.created_at)}</td>
                    <td>{r.actor_username || <span className="al-muted">—</span>}</td>
                    <td><span className={`al-badge al-${meta.tone}`}>{meta.label}</span></td>
                    <td>{r.target_label || <span className="al-muted">—</span>}</td>
                    <td className="al-muted">{describe(r) || '—'}</td>
                    <td className="al-muted">{r.ip_address || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!isLoading && rows.length === 0 && !error && (
          <div className="al-empty">
            <ClipboardList size={28} style={{ marginBottom: 8 }} />
            <div>No activity recorded{query || category ? ' for this search' : ' yet'}.</div>
          </div>
        )}
        {isLoading && <div className="al-empty">Loading…</div>}

        <div className="al-pager">
          <span className="al-muted">{count} {count === 1 ? 'entry' : 'entries'} · page {Math.min(page, totalPages)} of {totalPages}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || isLoading}>
              <ChevronLeft size={14} /> Newer
            </button>
            <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages || isLoading}>
              Older <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
