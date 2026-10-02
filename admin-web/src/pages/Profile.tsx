// admin-web/src/pages/Profile.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getMyProfile, updateMyProfile, uploadMyProfilePicture } from '../api/profile';
import { useToast } from '../context/ToastContext';
import type { FullAdminProfile, UpdateProfilePayload } from '../types/profile';

// Established Warm Project Theme Colors
const COLOR_PRIMARY = '#5C2C16';   // Deep Warm Brown
const COLOR_SECONDARY = '#C37800'; // Amber Gold
const COLOR_TERTIARY = '#804022';  // Terracotta
const COLOR_ACCENT_BG = '#FCECD6'; // Warm Soft Cream
const COLOR_BORDER = '#D6BB83';    // Muted Gold Border
const COLOR_DANGER = '#DF1B39';    // Crimson Red

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

export default function Profile() {
  const { showToast } = useToast();
  const [profile, setProfile] = useState<FullAdminProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const data = await getMyProfile();
      setProfile(data);
      setFirstName(data.profile.first_name || '');
      setMiddleName(data.profile.middle_name || '');
      setLastName(data.profile.last_name || '');
      setEmail(data.profile.email || '');
    } catch (e: any) {
      setLoadError(formatApiError(e?.response?.data));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: UpdateProfilePayload = {
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        email: email || undefined,
      };
      const updated = await updateMyProfile(payload);
      setProfile(updated);
      showToast('Profile updated successfully.', 'success');
    } catch (e: any) {
      showToast(formatApiError(e?.response?.data), 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const updated = await uploadMyProfilePicture(file);
      setProfile(updated);
      showToast('Profile picture updated.', 'success');
    } catch (e: any) {
      showToast(formatApiError(e?.response?.data), 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  if (isLoading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: COLOR_TERTIARY, fontWeight: 600, fontFamily: 'sans-serif' }}>
        Loading profile details...
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Top Header & Navigation Actions */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>My Profile</h1>
          <p style={styles.subtitle}>Manage your account information and preferences</p>
        </div>
        <div style={styles.navGroup}>
          <Link to="/dashboard" style={styles.secondaryLink}>
            ← Back to Dashboard
          </Link>
          <Link to="/change-password" style={styles.primaryLink}>
            Change Password →
          </Link>
        </div>
      </div>

      {loadError && (
        <div style={styles.errorBanner}>
          <span style={{ whiteSpace: 'pre-line' }}>{loadError}</span>
        </div>
      )}

      {/* Main Profile Card Container */}
      <div style={styles.card}>
        {/* Profile Photo & Account Meta */}
        <div style={styles.profileOverview}>
          <div style={styles.photoContainer}>
            {profile?.profile.profile_picture ? (
              <img src={profile.profile.profile_picture} alt="Profile" style={styles.photo} />
            ) : (
              <div style={styles.photoPlaceholder}>
                {(profile?.profile.first_name || profile?.username || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <label style={{ ...styles.uploadLabel, opacity: isUploadingPhoto ? 0.7 : 1 }}>
              {isUploadingPhoto ? 'Uploading...' : 'Change Photo'}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                disabled={isUploadingPhoto}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          <div style={styles.overviewDetails}>
            <div style={styles.badgeRow}>
              <span style={styles.usernameText}>@{profile?.username}</span>
              <span style={styles.roleBadge}>{profile?.role?.toUpperCase()}</span>
            </div>
            <p style={styles.metaText}>
              <strong>Member Since:</strong> {profile ? new Date(profile.date_joined).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
            </p>
          </div>
        </div>

        <div style={styles.divider} />

        {/* Editable Profile Information Form */}
        <form onSubmit={handleSave} style={styles.form}>
          <h3 style={styles.sectionTitle}>Personal Details</h3>

          <div style={styles.formGrid}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>First Name</label>
              <input
                style={styles.input}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter first name"
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Middle Name</label>
              <input
                style={styles.input}
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="Enter middle name"
              />
            </div>
          </div>

          <div style={styles.formGrid}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Last Name</label>
              <input
                style={styles.input}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter last name"
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                style={styles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
              />
            </div>
          </div>

          <div style={styles.buttonContainer}>
            <button type="submit" style={styles.saveButton} disabled={isSaving}>
              {isSaving ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Global Layout & Component CSS Objects
const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '32px',
    maxWidth: '800px',
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
  navGroup: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  secondaryLink: {
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
  primaryLink: {
    textDecoration: 'none',
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: 600,
    padding: '8px 16px',
    borderRadius: '8px',
    backgroundColor: COLOR_SECONDARY,
    transition: 'all 0.15s ease',
  },
  errorBanner: {
    color: COLOR_DANGER,
    backgroundColor: '#FDF2F2',
    border: '1px solid #F8B4B4',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  card: {
    backgroundColor: '#FFFFFF',
    border: `1px solid ${COLOR_BORDER}`,
    borderRadius: '12px',
    padding: '28px',
    boxShadow: '0 4px 12px rgba(92, 44, 22, 0.05)',
  },
  profileOverview: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    flexWrap: 'wrap',
  },
  photoContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  photo: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: `2px solid ${COLOR_BORDER}`,
    marginBottom: '10px',
  },
  photoPlaceholder: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    backgroundColor: COLOR_ACCENT_BG,
    border: `2px solid ${COLOR_BORDER}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '38px',
    fontWeight: 800,
    color: COLOR_PRIMARY,
    marginBottom: '10px',
  },
  uploadLabel: {
    fontSize: '12px',
    color: COLOR_PRIMARY,
    fontWeight: 700,
    cursor: 'pointer',
    border: `1px solid ${COLOR_BORDER}`,
    borderRadius: '6px',
    padding: '6px 12px',
    backgroundColor: '#FFFFFF',
  },
  overviewDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  usernameText: {
    fontSize: '20px',
    fontWeight: 800,
    color: COLOR_PRIMARY,
  },
  roleBadge: {
    fontSize: '11px',
    fontWeight: 700,
    color: COLOR_PRIMARY,
    backgroundColor: COLOR_ACCENT_BG,
    border: `1px solid ${COLOR_BORDER}`,
    borderRadius: '12px',
    padding: '3px 10px',
    letterSpacing: '0.5px',
  },
  metaText: {
    margin: 0,
    fontSize: '14px',
    color: COLOR_TERTIARY,
  },
  divider: {
    height: '1px',
    backgroundColor: '#EADEC9',
    margin: '24px 0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sectionTitle: {
    margin: '0 0 8px 0',
    fontSize: '16px',
    fontWeight: 700,
    color: COLOR_PRIMARY,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
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
  buttonContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '12px',
  },
  saveButton: {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: COLOR_PRIMARY,
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
  },
};