import { useEffect, useState, useCallback } from 'react';
import { Palette, School, ShieldCheck, ToggleLeft, Save } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { getSystemSettings, updateSystemSettings } from '../api/settings';
import type { SystemSettings as SystemSettingsType, ThemeKey } from '../types/settings';
import { applyTheme } from '../theme/theme';

// Mini previews of the two app themes (the real colors live in the mobile app).
const THEMES: { key: ThemeKey; name: string; description: string; swatches: string[]; header: string; page: string; button: string; buttonText: string }[] = [
  {
    key: 'default',
    name: 'TLEQuest Default',
    description: 'The current app look: gold, brown and orange.',
    swatches: ['#F5B921', '#5C2C16', '#EA580C', '#F5EDD8'],
    header: '#F5B921', page: '#F5EDD8', button: '#EA580C', buttonText: '#FFFFFF',
  },
  {
    key: 'school',
    name: 'School Blue',
    description: 'Blue, white and cream, like the app login page. Follows the school colors.',
    swatches: ['#1E4D8F', '#18303D', '#FAF6E8', '#FFFFFF'],
    header: '#1E4D8F', page: '#FAF6E8', button: '#18303D', buttonText: '#F2B84B',
  },
];

function formatApiError(data: any): string {
  if (!data || typeof data !== 'object') return 'Something went wrong.';
  if (data.detail) return data.detail;

  const messages: string[] = [];
  for (const [field, value] of Object.entries(data)) {
    const fieldMessages = Array.isArray(value) ? value : [String(value)];
    fieldMessages.forEach((msg) => {
      const label = field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
      messages.push(`${label}: ${msg}`);
    });
  }
  return messages.join('\n') || 'Something went wrong.';
}

export default function SystemSettingsPage() {
  const { showToast } = useToast();

  const [settings, setSettings] = useState<SystemSettingsType | null>(null);
  // Last version that the server actually has (used to auto-save the theme alone).
  const [saved, setSaved] = useState<SystemSettingsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await getSystemSettings();
      setSettings(data);
      setSaved(data);
      applyTheme(data.theme);
    } catch (e: any) {
      setError(formatApiError(e?.response?.data));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function updateField<K extends keyof SystemSettingsType>(key: K, value: SystemSettingsType[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!settings) return;
    setIsSaving(true);
    try {
      const updated = await updateSystemSettings({
        school_name: settings.school_name,
        school_year: settings.school_year,
        theme: settings.theme,
        min_password_length: settings.min_password_length,
        bulk_upload_enabled: settings.bulk_upload_enabled,
        self_service_password_reset_enabled: settings.self_service_password_reset_enabled,
      });
      setSettings(updated);
      setSaved(updated);
      applyTheme(updated.theme);
      showToast('System settings saved.', 'success');
    } catch (e: any) {
      showToast(formatApiError(e?.response?.data), 'error');
    } finally {
      setIsSaving(false);
    }
  }

  // Picking a theme saves it to the server right away (only the theme changes;
  // other fields you have typed but not saved yet are left alone).
  async function pickTheme(key: ThemeKey) {
    if (!settings || !saved || isSavingTheme || settings.theme === key) return;

    const previous = settings.theme;
    updateField('theme', key);
    applyTheme(key);
    setIsSavingTheme(true);
    try {
      const updated = await updateSystemSettings({
        school_name: saved.school_name,
        school_year: saved.school_year,
        theme: key,
        min_password_length: saved.min_password_length,
        bulk_upload_enabled: saved.bulk_upload_enabled,
        self_service_password_reset_enabled: saved.self_service_password_reset_enabled,
      });
      setSaved(updated);
      updateField('theme', updated.theme);
      applyTheme(updated.theme);
      showToast('Theme applied.', 'success');
    } catch (e: any) {
      // Put it back so the screen matches what the server has.
      updateField('theme', previous);
      applyTheme(previous);
      showToast(formatApiError(e?.response?.data), 'error');
    } finally {
      setIsSavingTheme(false);
    }
  }

  if (isLoading || !settings) {
    return (
      <div style={{ padding: 32, color: 'var(--t-c37800)', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
        Loading system settings...
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        body {
          margin: 0;
          background-color: var(--t-f8efe6);
          color: var(--t-804022);
          font-family: 'Inter', sans-serif;
        }
        h1, h2, h3, .card-title, .modal-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        .page-wrapper {
          min-height: 100vh;
          padding: 24px 32px;
          max-width: 900px;
          margin: 0 auto;
        }

        .header-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .back-btn {
          background: #FFFFFF;
          border: 1px solid var(--t-d6bb83);
          color: var(--t-804022);
          padding: 10px 18px;
          border-radius: 9999px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 2px 8px rgba(128, 64, 34, 0.05);
          transition: all 0.2s ease;
        }
        .back-btn:hover { background: var(--t-fcecd6); border-color: var(--t-c37800); color: var(--t-c37800); }
        .signout-btn {
          background: rgba(223, 27, 57, 0.1);
          color: #DF1B39;
          border: 1px solid rgba(223, 27, 57, 0.2);
          padding: 10px 18px;
          border-radius: 9999px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .signout-btn:hover { background: rgba(223, 27, 57, 0.2); }

        .page-title-area { text-align: center; margin-bottom: 24px; }
        .page-title-area h1 { font-size: 32px; font-weight: 800; color: var(--t-5c2c16); margin: 0 0 8px 0; }
        .page-title-area p { margin: 0; color: var(--t-804022); font-size: 15px; font-weight: 500; }

        .settings-section {
          background: #FFFFFF;
          border: 1px solid var(--t-d6bb83);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 20px;
          box-shadow: 0 4px 12px rgba(128, 64, 34, 0.04);
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
        }
        .section-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: var(--t-fcecd6);
          color: var(--t-5c2c16);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .section-title { font-size: 16px; font-weight: 800; color: var(--t-5c2c16); margin: 0; }
        .section-subtitle { font-size: 13px; color: var(--t-804022); margin: 2px 0 0 0; }

        .field-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid var(--t-f3efd4);
          gap: 16px;
        }
        .field-row:last-child { border-bottom: none; }
        .field-label { font-size: 14px; font-weight: 600; color: var(--t-5c2c16); }
        .field-hint { font-size: 12px; color: var(--t-804022); margin-top: 2px; }

        .settings-input {
          background: var(--t-f8efe6);
          border: 1px solid var(--t-d6bb83);
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 14px;
          color: var(--t-804022);
          outline: none;
          min-width: 220px;
        }
        .settings-input-narrow { min-width: 100px; }
        .theme-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .theme-card {
          text-align: left; background: #FFFFFF; border: 2px solid var(--t-d6bb83); border-radius: 16px;
          padding: 12px; cursor: pointer; font-family: inherit; color: var(--t-5c2c16);
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .theme-card:hover { border-color: var(--t-c37800); }
        .theme-card:disabled { cursor: wait; opacity: 0.8; }
        .theme-card.selected { border-color: #22C55E; box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2); }
        .theme-preview { border-radius: 12px; overflow: hidden; border: 1px solid rgba(0,0,0,0.08); height: 120px; display: flex; flex-direction: column; }
        .theme-preview-header { height: 38px; flex-shrink: 0; }
        .theme-preview-body { flex: 1; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
        .theme-preview-line { height: 8px; border-radius: 4px; background: rgba(0,0,0,0.12); width: 70%; }
        .theme-preview-btn { align-self: flex-start; font-size: 10px; font-weight: 800; padding: 5px 12px; border-radius: 9999px; }
        .theme-info { margin-top: 10px; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .theme-name { font-size: 14px; font-weight: 800; }
        .theme-desc { font-size: 12px; color: var(--t-804022); margin-top: 2px; }
        .theme-dots { display: flex; gap: 4px; margin-top: 8px; }
        .theme-dot { width: 16px; height: 16px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.15); }
        .theme-badge { font-size: 11px; font-weight: 800; color: #166534; background: #DCFCE7; padding: 3px 10px; border-radius: 9999px; white-space: nowrap; }

        /* Toggle switch */
        .toggle-switch {
          position: relative;
          width: 48px;
          height: 26px;
          flex-shrink: 0;
        }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .toggle-slider {
          position: absolute;
          cursor: pointer;
          inset: 0;
          background-color: var(--t-d6bb83);
          border-radius: 9999px;
          transition: background-color 0.2s;
        }
        .toggle-slider::before {
          content: "";
          position: absolute;
          height: 20px;
          width: 20px;
          left: 3px;
          bottom: 3px;
          background-color: #FFFFFF;
          border-radius: 50%;
          transition: transform 0.2s;
        }
        .toggle-switch input:checked + .toggle-slider { background-color: #22C55E; }
        .toggle-switch input:checked + .toggle-slider::before { transform: translateX(22px); }

        .action-btn-primary {
          background: var(--t-5c2c16);
          color: #FFFFFF;
          border: none;
          padding: 12px 24px;
          border-radius: 9999px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: background 0.2s;
        }
        .action-btn-primary:hover { background: var(--t-804022); }
        .action-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

        .save-bar {
          display: flex;
          justify-content: flex-end;
          margin-top: 8px;
        }

        .last-updated {
          text-align: center;
          font-size: 12px;
          color: var(--t-c37800);
          margin-top: 16px;
        }

        @media (max-width: 640px) {
          .page-wrapper { padding: 16px; }
          .field-row { flex-direction: column; align-items: flex-start; }
          .settings-input { width: 100%; min-width: 0; }
          .theme-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="page-title-area">
        <h1>System Settings</h1>
        <p>Configure app-wide rules that apply across all classes, teachers, and students.</p>
      </div>

      {error && (
        <div style={{ background: '#EC7D76', color: '#fff', padding: 14, borderRadius: 12, marginBottom: 20, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* School information */}
      <div className="settings-section">
        <div className="section-header">
          <div className="section-icon"><School size={18} /></div>
          <div>
            <h2 className="section-title">School Information</h2>
            <p className="section-subtitle">Shown across the app</p>
          </div>
        </div>

        <div className="field-row">
          <div>
            <div className="field-label">School Name</div>
          </div>
          <input
            className="settings-input"
            value={settings.school_name}
            onChange={(e) => updateField('school_name', e.target.value)}
            placeholder="e.g. Corpus Christi High School"
          />
        </div>

        <div className="field-row">
          <div>
            <div className="field-label">School Year</div>
          </div>
          <input
            className="settings-input"
            value={settings.school_year}
            onChange={(e) => updateField('school_year', e.target.value)}
            placeholder="e.g. 2026-2027"
          />
        </div>
      </div>

      {/* Theme */}
      <div className="settings-section">
        <div className="section-header">
          <div className="section-icon"><Palette size={18} /></div>
          <div>
            <h2 className="section-title">Theme</h2>
            <p className="section-subtitle">Choose the color look of the mobile app. It is applied and saved as soon as you pick one.</p>
          </div>
        </div>

        <div className="theme-grid">
          {THEMES.map((t) => {
            const selected = settings.theme === t.key;
            return (
              <button
                type="button"
                key={t.key}
                className={`theme-card${selected ? ' selected' : ''}`}
                onClick={() => pickTheme(t.key)}
                disabled={isSavingTheme}
                aria-pressed={selected}
              >
                <div className="theme-preview" style={{ background: t.page }}>
                  <div className="theme-preview-header" style={{ background: t.header }} />
                  <div className="theme-preview-body">
                    <div className="theme-preview-line" />
                    <div className="theme-preview-line" style={{ width: '45%' }} />
                    <div className="theme-preview-btn" style={{ background: t.button, color: t.buttonText }}>Button</div>
                  </div>
                </div>
                <div className="theme-info">
                  <div>
                    <div className="theme-name">{t.name}</div>
                    <div className="theme-desc">{t.description}</div>
                  </div>
                  {selected && <span className="theme-badge">Selected</span>}
                </div>
                <div className="theme-dots">
                  {t.swatches.map((c) => <span key={c} className="theme-dot" style={{ background: c }} />)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Security Policy */}
      <div className="settings-section">
        <div className="section-header">
          <div className="section-icon"><ShieldCheck size={18} /></div>
          <div>
            <h2 className="section-title">Security Policy</h2>
            <p className="section-subtitle">Applies to all password changes, resets, and new accounts</p>
          </div>
        </div>

        <div className="field-row">
          <div>
            <div className="field-label">Minimum Password Length</div>
            <div className="field-hint">Also affects generated passwords for new accounts and resets</div>
          </div>
          <input
            type="number"
            min={6}
            max={32}
            className="settings-input settings-input-narrow"
            value={settings.min_password_length}
            onChange={(e) => updateField('min_password_length', Number(e.target.value))}
          />
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="settings-section">
        <div className="section-header">
          <div className="section-icon"><ToggleLeft size={18} /></div>
          <div>
            <h2 className="section-title">Feature Toggles</h2>
            <p className="section-subtitle">Turn specific system features on or off</p>
          </div>
        </div>

        <div className="field-row">
          <div>
            <div className="field-label">CSV Bulk Upload</div>
            <div className="field-hint">Allow admins to create accounts via CSV import</div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.bulk_upload_enabled}
              onChange={(e) => updateField('bulk_upload_enabled', e.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <div className="field-row">
          <div>
            <div className="field-label">Self-Service Password Reset</div>
            <div className="field-hint">Allow students/teachers to reset their own password via security questions</div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.self_service_password_reset_enabled}
              onChange={(e) => updateField('self_service_password_reset_enabled', e.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>

      <div className="save-bar">
        <button className="action-btn-primary" onClick={handleSave} disabled={isSaving}>
          <Save size={16} />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="last-updated">
        Last updated: {new Date(settings.updated_at).toLocaleString()}
      </div>
    </div>
  );
}