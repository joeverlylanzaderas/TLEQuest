// admin-web/src/pages/ChangePassword.tsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSecurityQuestions, changePassword } from '../api/security';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { SecurityQuestion } from '../types/security';

// Established Warm Project Theme Colors
const COLOR_PRIMARY = '#5C2C16';   // Deep Warm Brown
const COLOR_SECONDARY = '#C37800'; // Amber Gold
const COLOR_TERTIARY = '#804022';  // Terracotta
const COLOR_ACCENT_BG = '#FCECD6'; // Warm Soft Cream
const COLOR_BORDER = '#D6BB83';    // Muted Gold Border
const COLOR_DANGER = '#DF1B39';    // Crimson Red

function formatApiError(data: any): string {
  if (!data || typeof data !== 'object') return 'Something went wrong.';
  if (data.detail) return typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
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

export default function ChangePassword() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { showToast } = useToast();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [questions, setQuestions] = useState<SecurityQuestion[]>([]);
  const [showSecuritySection, setShowSecuritySection] = useState(false);
  const [q1, setQ1] = useState({ questionId: '', answer: '' });
  const [q2, setQ2] = useState({ questionId: '', answer: '' });
  const [q3, setQ3] = useState({ questionId: '', answer: '' });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getSecurityQuestions()
      .then(setQuestions)
      .catch(() => {
        // Non-fatal — section just won't have options until this loads
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showToast('New password and confirmation do not match.', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = { old_password: oldPassword, new_password: newPassword };

      if (q1.questionId && q1.answer && q2.questionId && q2.answer && q3.questionId && q3.answer) {
        payload.security_answers = [
          { question_id: Number(q1.questionId), answer: q1.answer },
          { question_id: Number(q2.questionId), answer: q2.answer },
          { question_id: Number(q3.questionId), answer: q3.answer },
        ];
      }

      await changePassword(payload);
      showToast('Password changed successfully. You will be signed out for security...', 'success');
      setTimeout(() => {
        signOut();
        navigate('/login');
      }, 2500);
    } catch (e: any) {
      const data = e?.response?.data;
      if (data?.security_answers) {
        setShowSecuritySection(true);
      }
      showToast(formatApiError(data), 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  const usedIds = [q1.questionId, q2.questionId, q3.questionId].filter(Boolean);

  return (
    <div style={styles.container}>
      {/* Top Navigation & Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Security & Password</h1>
          <p style={styles.subtitle}>Update your login credentials and self-service recovery questions</p>
        </div>
        <Link to="/profile" style={styles.backButton}>
          ← Back to Profile
        </Link>
      </div>

      {/* Main Form Card Container */}
      <div style={styles.card}>
        <form onSubmit={handleSubmit} style={styles.form}>
          
          {/* Section 1 Header */}
          <div style={styles.sectionHeader}>
            <span style={styles.stepBadge}>01</span>
            <div>
              <h3 style={styles.sectionTitle}>Change Credentials</h3>
              <p style={styles.sectionDesc}>Enter your current password and choose a strong new password.</p>
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Current Password</label>
            <input
              style={styles.input}
              type="password"
              placeholder="••••••••"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </div>

          <div style={styles.gridTwoCols}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>New Password</label>
              <input
                style={styles.input}
                type="password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Confirm New Password</label>
              <input
                style={styles.input}
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
          </div>

          {/* Password Tip Callout Box */}
          <div style={styles.tipCard}>
            <span style={styles.tipIcon}>💡</span>
            <div style={styles.tipText}>
              Password must be at least <strong>8 characters long</strong>. You will be automatically logged out after a successful password change.
            </div>
          </div>

          <div style={styles.divider} />

          {/* Section 2 Header: Security Questions Accordion */}
          <div style={styles.sectionHeader}>
            <span style={styles.stepBadge}>02</span>
            <div style={{ flex: 1 }}>
              <h3 style={styles.sectionTitle}>Account Recovery Setup</h3>
              <p style={styles.sectionDesc}>Used for self-service recovery if you ever forget your password.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowSecuritySection((s) => !s)}
              style={styles.toggleButton}
            >
              {showSecuritySection ? '− Hide Questions' : '+ Setup Questions'}
            </button>
          </div>

          {showSecuritySection && (
            <div style={styles.securityBox}>
              <p style={styles.securityBoxHint}>
                Please select and answer <strong>3 unique security questions</strong> below:
              </p>

              {[
                { state: q1, setState: setQ1 },
                { state: q2, setState: setQ2 },
                { state: q3, setState: setQ3 },
              ].map((entry, idx) => (
                <div key={idx} style={styles.questionCard}>
                  <div style={styles.questionCardHeader}>
                    <span style={styles.questionBadge}>Q{idx + 1}</span>
                    <label style={styles.label}>Security Question {idx + 1}</label>
                  </div>
                  
                  <select
                    style={styles.selectInput}
                    value={entry.state.questionId}
                    onChange={(e) => entry.setState({ ...entry.state, questionId: e.target.value })}
                  >
                    <option value="">Select a security question...</option>
                    {questions
                      .filter((q) => !usedIds.includes(String(q.id)) || String(q.id) === entry.state.questionId)
                      .map((q) => (
                        <option key={q.id} value={q.id}>{q.question_text}</option>
                      ))}
                  </select>

                  <input
                    style={{ ...styles.input, marginTop: 8 }}
                    placeholder={`Answer for Question ${idx + 1}`}
                    value={entry.state.answer}
                    onChange={(e) => entry.setState({ ...entry.state, answer: e.target.value })}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Action Submit Area */}
          <div style={styles.actionContainer}>
            <button type="submit" style={styles.primaryButton} disabled={isSubmitting}>
              {isSubmitting ? 'Updating Password...' : 'Update Password & Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Global Layout & Styled Components Object
const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '32px',
    maxWidth: '680px',
    margin: '0 auto',
    fontFamily: 'sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 800,
    color: COLOR_PRIMARY,
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: '14px',
    color: COLOR_TERTIARY,
  },
  backButton: {
    textDecoration: 'none',
    color: COLOR_PRIMARY,
    fontSize: '14px',
    fontWeight: 600,
    padding: '8px 16px',
    border: `1px solid ${COLOR_BORDER}`,
    borderRadius: '8px',
    backgroundColor: '#FFFFFF',
    transition: 'all 0.15s ease',
  },
  card: {
    backgroundColor: '#FFFFFF',
    border: `1px solid ${COLOR_BORDER}`,
    borderRadius: '12px',
    padding: '32px',
    boxShadow: '0 4px 12px rgba(92, 44, 22, 0.05)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  stepBadge: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: COLOR_ACCENT_BG,
    border: `1px solid ${COLOR_BORDER}`,
    color: COLOR_PRIMARY,
    fontWeight: 800,
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 700,
    color: COLOR_PRIMARY,
  },
  sectionDesc: {
    margin: '2px 0 0 0',
    fontSize: '13px',
    color: COLOR_TERTIARY,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  gridTwoCols: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 700,
    color: COLOR_PRIMARY,
  },
  input: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: `1px solid ${COLOR_BORDER}`,
    fontSize: '14px',
    color: COLOR_PRIMARY,
    backgroundColor: '#FFFFFF',
    outline: 'none',
  },
  selectInput: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: `1px solid ${COLOR_BORDER}`,
    fontSize: '14px',
    color: COLOR_PRIMARY,
    backgroundColor: '#FFFFFF',
    outline: 'none',
    cursor: 'pointer',
  },
  tipCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    backgroundColor: COLOR_ACCENT_BG,
    border: `1px solid ${COLOR_BORDER}`,
    borderRadius: '8px',
    padding: '12px 14px',
  },
  tipIcon: {
    fontSize: '16px',
  },
  tipText: {
    fontSize: '12px',
    color: COLOR_PRIMARY,
    lineHeight: '1.5',
  },
  divider: {
    height: '1px',
    backgroundColor: '#EADEC9',
    margin: '8px 0',
  },
  toggleButton: {
    padding: '6px 12px',
    border: `1px solid ${COLOR_SECONDARY}`,
    borderRadius: '6px',
    backgroundColor: '#FFFFFF',
    color: COLOR_SECONDARY,
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '12px',
  },
  securityBox: {
    backgroundColor: '#FAF5EE',
    border: `1px solid ${COLOR_BORDER}`,
    borderRadius: '10px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  securityBoxHint: {
    margin: 0,
    fontSize: '13px',
    color: COLOR_PRIMARY,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    border: `1px solid ${COLOR_BORDER}`,
    borderRadius: '8px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
  },
  questionCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  questionBadge: {
    fontSize: '11px',
    fontWeight: 800,
    color: COLOR_PRIMARY,
    backgroundColor: COLOR_ACCENT_BG,
    padding: '2px 6px',
    borderRadius: '4px',
  },
  actionContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '12px',
  },
  primaryButton: {
    padding: '12px 28px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: COLOR_PRIMARY,
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(92, 44, 22, 0.15)',
  },
};