// admin-web/src/pages/Classes.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, Search, X, Pencil } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getClasses, getClassEnrollments, getClassGroups, updateClass } from '../api/classes';
import type { ClassSummary, ClassEnrollment, ClassGroup, ClassStudent } from '../types/classes';

function fullName(s: ClassStudent): string {
  return [s.first_name, s.last_name].filter(Boolean).join(' ') || s.username;
}

function errorMessage(e: any, fallback: string): string {
  const data = e?.response?.data;
  if (data?.detail) return data.detail;
  const first = data && typeof data === 'object' ? Object.values(data)[0] : null;
  return Array.isArray(first) ? String(first[0]) : fallback;
}

export default function Classes() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState<ClassSummary | null>(null);
  const [roster, setRoster] = useState<ClassEnrollment[]>([]);
  const [groups, setGroups] = useState<ClassGroup[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ class_name: '', subject: '', section: '', school_year: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    getClasses()
      .then(setClasses)
      .catch((e) => setError(errorMessage(e, 'Could not load classes.')))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter((c) =>
      [c.class_name, c.section, c.subject, c.school_year, c.teacher.username, c.invite_code]
        .join(' ').toLowerCase().includes(q)
    );
  }, [classes, search]);

  async function openDetail(c: ClassSummary) {
    setSelected(c);
    setEditing(false);
    setFormError('');
    setForm({ class_name: c.class_name, subject: c.subject, section: c.section, school_year: c.school_year });
    setRoster([]);
    setGroups([]);
    setIsDetailLoading(true);
    try {
      const [r, g] = await Promise.all([getClassEnrollments(c.id), getClassGroups(c.id)]);
      setRoster(r);
      setGroups(g);
    } catch (e: any) {
      setFormError(errorMessage(e, 'Could not load the roster and groups.'));
    } finally {
      setIsDetailLoading(false);
    }
  }

  async function handleSave() {
    if (!selected) return;
    if (!form.class_name.trim()) {
      setFormError('Class name is required.');
      return;
    }
    setIsSaving(true);
    setFormError('');
    try {
      const updated = await updateClass(selected.id, {
        class_name: form.class_name.trim(),
        subject: form.subject.trim(),
        section: form.section.trim(),
        school_year: form.school_year.trim(),
      });
      setClasses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setSelected(updated);
      setEditing(false);
    } catch (e: any) {
      setFormError(errorMessage(e, 'Could not save changes.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="page-wrapper">
      <style>{`
        .cls-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
        .cls-search { position: relative; flex: 1; max-width: 380px; min-width: 240px; }
        .cls-search input { width: 100%; background: #FFFFFF; border: 1px solid #D6BB83; padding: 10px 16px 10px 40px; border-radius: 9999px; font-size: 14px; color: #804022; outline: none; }
        .cls-search svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #C37800; }
        .cls-count { font-size: 13px; color: #804022; font-weight: 600; }
        .cls-card { background: #FFFFFF; border: 1px solid #D6BB83; border-radius: 16px; box-shadow: 0 4px 20px rgba(128,64,34,0.05); overflow: hidden; }
        .cls-scroll { width: 100%; overflow-x: auto; }
        .cls-table { width: 100%; border-collapse: collapse; text-align: left; }
        .cls-table thead tr { background: #5C2C16; color: #FFFFFF; }
        .cls-table th { padding: 14px 16px; font-size: 13px; font-weight: 700; white-space: nowrap; }
        .cls-table td { padding: 12px 16px; font-size: 14px; color: #5C2C16; border-bottom: 1px solid #F3EFD4; }
        .cls-table tbody tr { cursor: pointer; transition: background 0.15s; }
        .cls-table tbody tr:hover { background: #FCF8F2; }
        .cls-code { font-family: monospace; font-weight: 700; background: #FCECD6; padding: 3px 8px; border-radius: 6px; }
        .cls-badge { display: inline-block; padding: 3px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; color: #FFFFFF; }
        .cls-badge.on { background: #22C55E; } .cls-badge.off { background: #6B7280; }
        .cls-empty { padding: 32px; text-align: center; color: #804022; font-style: italic; }
        .cls-error { color: #DF1B39; font-size: 13px; margin-bottom: 12px; }
        .cls-overlay { position: fixed; inset: 0; background: rgba(40,20,10,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 16px; }
        .cls-modal { background: #FFFFFF; border: 1px solid #D6BB83; border-radius: 20px; width: 100%; max-width: 720px; max-height: 90vh; overflow-y: auto; padding: 28px; }
        .cls-modal-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
        .cls-modal h2 { margin: 0; font-size: 22px; color: #5C2C16; }
        .cls-sub { margin: 4px 0 0; font-size: 13px; color: #804022; }
        .cls-icon-btn { background: transparent; border: none; cursor: pointer; color: #804022; padding: 6px; border-radius: 8px; display: inline-flex; }
        .cls-icon-btn:hover { background: #FCECD6; }
        .cls-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
        .cls-field label { display: block; font-size: 11px; font-weight: 700; color: #C37800; margin-bottom: 4px; text-transform: uppercase; }
        .cls-field input { width: 100%; background: #F8EFE6; border: 1px solid #D6BB83; padding: 10px 12px; border-radius: 10px; font-size: 14px; color: #5C2C16; outline: none; }
        .cls-field .val { font-size: 14px; font-weight: 600; color: #5C2C16; }
        .cls-section { font-size: 14px; font-weight: 800; color: #5C2C16; margin: 18px 0 8px; }
        .cls-list { border: 1px solid #F3EFD4; border-radius: 12px; overflow: hidden; }
        .cls-row { display: flex; justify-content: space-between; gap: 12px; padding: 10px 14px; border-bottom: 1px solid #F3EFD4; font-size: 13px; color: #5C2C16; }
        .cls-row:last-child { border-bottom: none; }
        .cls-muted { color: #804022; font-size: 12px; }
        .cls-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
        @media (max-width: 640px) { .cls-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div className="header-nav">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <button className="signout-btn" onClick={handleSignOut}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      <div className="page-title-area">
        <h1>Classes</h1>
        <p>All classes across every teacher.</p>
      </div>

      <div className="cls-toolbar">
        <div className="cls-search">
          <Search size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search class, section, teacher, code..." />
        </div>
        <span className="cls-count">{filtered.length} of {classes.length} classes</span>
      </div>

      {error && <div className="cls-error">{error}</div>}

      <div className="cls-card">
        <div className="cls-scroll">
          <table className="cls-table">
            <thead>
              <tr>
                <th>Class</th><th>Section</th><th>Subject</th><th>School Year</th>
                <th>Teacher</th><th>Students</th><th>Invite Code</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="cls-empty">Loading classes...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="cls-empty">No classes found.</td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} onClick={() => openDetail(c)}>
                    <td style={{ fontWeight: 700 }}>{c.class_name}</td>
                    <td>{c.section || '—'}</td>
                    <td>{c.subject || '—'}</td>
                    <td>{c.school_year || '—'}</td>
                    <td>{c.teacher.username}</td>
                    <td>{c.student_count}</td>
                    <td><span className="cls-code">{c.invite_code}</span></td>
                    <td><span className={`cls-badge ${c.is_active ? 'on' : 'off'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="cls-overlay" onClick={() => setSelected(null)}>
          <div className="cls-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cls-modal-head">
              <div>
                <h2>{selected.class_name}</h2>
                <p className="cls-sub">Teacher: {selected.teacher.username} • Code <span className="cls-code">{selected.invite_code}</span></p>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {!editing && (
                  <button className="cls-icon-btn" title="Edit" onClick={() => setEditing(true)}><Pencil size={18} /></button>
                )}
                <button className="cls-icon-btn" title="Close" onClick={() => setSelected(null)}><X size={20} /></button>
              </div>
            </div>

            {formError && <div className="cls-error">{formError}</div>}

            <div className="cls-grid">
              {(['class_name', 'subject', 'section', 'school_year'] as const).map((key) => (
                <div className="cls-field" key={key}>
                  <label>{key.replace('_', ' ')}</label>
                  {editing ? (
                    <input value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
                  ) : (
                    <div className="val">{selected[key] || '—'}</div>
                  )}
                </div>
              ))}
            </div>

            {editing && (
              <div className="cls-actions" style={{ marginTop: 0, marginBottom: 8 }}>
                <button className="action-btn-secondary" onClick={() => { setEditing(false); setFormError(''); }} disabled={isSaving}>Cancel</button>
                <button className="action-btn-primary" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            )}

            <div className="cls-section">Groups ({groups.length})</div>
            <div className="cls-list">
              {isDetailLoading ? (
                <div className="cls-row"><span className="cls-muted">Loading...</span></div>
              ) : groups.length === 0 ? (
                <div className="cls-row"><span className="cls-muted">No groups yet.</span></div>
              ) : (
                groups.map((g) => (
                  <div className="cls-row" key={g.id}>
                    <span><b>{g.group_name || `Group ${g.group_number}`}</b> <span className="cls-muted">• {g.members.length} members</span></span>
                    <span className="cls-muted">Leader: {g.leader ? fullName(g.leader) : '—'}</span>
                  </div>
                ))
              )}
            </div>

            <div className="cls-section">Students ({roster.length})</div>
            <div className="cls-list">
              {isDetailLoading ? (
                <div className="cls-row"><span className="cls-muted">Loading...</span></div>
              ) : roster.length === 0 ? (
                <div className="cls-row"><span className="cls-muted">No students enrolled.</span></div>
              ) : (
                roster.map((r) => (
                  <div className="cls-row" key={r.id}>
                    <span>{fullName(r.student)}</span>
                    <span className="cls-muted">{r.student.username}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}