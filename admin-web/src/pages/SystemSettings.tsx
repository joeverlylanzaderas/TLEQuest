import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, Settings, Palette, ShieldCheck, ToggleLeft, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getSystemSettings, updateSystemSettings } from '../api/settings';
import type { SystemSettings as SystemSettingsType } from '../types/settings';

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
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { showToast } = useToast();

  const [settings, setSettings] = useState<SystemSettingsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await getSystemSettings();
      setSettings(data);
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
        primary_color: settings.primary_color,
        min_password_length: settings.min_password_length,
        bulk_upload_enabled: settings.bulk_upload_enabled,
        self_service_password_reset_enabled: settings.self_service_password_reset_enabled,
      });
      setSettings(updated);
      showToast('System settings saved.', 'success');
    } catch (e: any) {
      showToast(formatApiError(e?.response?.data), 'error');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading || !settings) {
    return (
      <div style={{ padding: 32, color: '#C37800', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
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
          background-color: #F8EFE6;
          color: #804022;
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
          border: 1px solid #D6BB83;
          color: #804022;
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
        .back-btn:hover { background: #FCECD6; border-color: #C37800; color: #C37800; }
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
        .page-title-area h1 { font-size: 32px; font-weight: 800; color: #5C2C16; margin: 0 0 8px 0; }
        .page-title-area p { margin: 0; color: #804022; font-size: 15px; font-weight: 500; }

        .settings-section {
          background: #FFFFFF;
          border: 1px solid #D6BB83;
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
          background: #FCECD6;
          color: #5C2C16;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .section-title { font-size: 16px; font-weight: 800; color: #5C2C16; margin: 0; }
        .section-subtitle { font-size: 13px; color: #804022; margin: 2px 0 0 0; }

        .field-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #F3EFD4;
          gap: 16px;
        }
        .field-row:last-child { border-bottom: none; }
        .field-label { font-size: 14px; font-weight: 600; color: #5C2C16; }
        .field-hint { font-size: 12px; color: #804022; margin-top: 2px; }

        .settings-input {
          background: #F8EFE6;
          border: 1px solid #D6BB83;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 14px;
          color: #804022;
          outline: none;
          min-width: 220px;
        }
        .settings-input-narrow { min-width: 100px; }
        .color-swatch-input {
          width: 44px;
          height: 36px;
          padding: 2px;
          border: 1px solid #D6BB83;
          border-radius: 8px;
          cursor: pointer;
        }

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
          background-color: #D6BB83;
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
          background: #5C2C16;
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
        .action-btn-primary:hover { background: #804022; }
        .action-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

        .save-bar {
          display: flex;
          justify-content: flex-end;
          margin-top: 8px;
        }

        .last-updated {
          text-align: center;
          font-size: 12px;
          color: #C37800;
          margin-top: 16px;
        }

        @media (max-width: 640px) {
          .page-wrapper { padding: 16px; }
          .field-row { flex-direction: column; align-items: flex-start; }
          .settings-input { width: 100%; min-width: 0; }
        }
      `}</style>

      <div className="header-nav">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={16} />
          <span>Go Back to Dashboard</span>
        </button>
        <button className="signout-btn" onClick={signOut}>
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="page-title-area">
        <h1>System Settings</h1>
        <p>Configure app-wide rules that apply across all classes, teachers, and students.</p>
      </div>

      {error && (
        <div style={{ background: '#EC7D76', color: '#fff', padding: 14, borderRadius: 12, marginBottom: 20, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Branding */}
      <div className="settings-section">
        <div className="section-header">
          <div className="section-icon"><Palette size={18} /></div>
          <div>
            <h2 className="section-title">Branding</h2>
            <p className="section-subtitle">School identity shown across the app</p>
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

        <div className="field-row">
          <div>
            <div className="field-label">Primary Color</div>
          </div>
          <input
            type="color"
            className="color-swatch-input"
            value={settings.primary_color}
            onChange={(e) => updateField('primary_color', e.target.value)}
          />
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