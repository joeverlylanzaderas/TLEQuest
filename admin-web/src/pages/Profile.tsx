// admin-web/src/pages/Profile.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, Camera, KeyRound, Mail, User } from 'lucide-react';
import { getMyProfile, updateMyProfile, uploadMyProfilePicture } from '../api/profile';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { FullAdminProfile, UpdateProfilePayload } from '../types/profile';

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
  const navigate = useNavigate();
  const { signOut } = useAuth();
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
      setFirstName(data.profile?.first_name || '');
      setMiddleName(data.profile?.middle_name || '');
      setLastName(data.profile?.last_name || '');
      setEmail(data.profile?.email || '');
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
    } catch (err: any) {
      showToast(formatApiError(err?.response?.data), 'error');
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
    } catch (err: any) {
      showToast(formatApiError(err?.response?.data), 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  const p = profile?.profile ?? null;
  const displayName =
    [p?.first_name, p?.last_name].filter(Boolean).join(' ') || profile?.username || '';
  const initial = (p?.first_name || profile?.username || '?').charAt(0).toUpperCase();

  return (
    <div className="page-wrapper">
      <style>{`
        .pf-layout { display: grid; grid-template-columns: 300px 1fr; gap: 20px; align-items: start; max-width: 1000px; margin: 0 auto; }
        .pf-card { background: #FFFFFF; border: 1px solid #D6BB83; border-radius: 16px; box-shadow: 0 4px 20px rgba(128,64,34,0.05); padding: 24px; }
        .pf-side { text-align: center; }
        .pf-avatar { width: 112px; height: 112px; border-radius: 50%; object-fit: cover; border: 3px solid #D6BB83; margin: 0 auto 14px; display: block; }
        .pf-avatar-fallback { width: 112px; height: 112px; border-radius: 50%; background: #FCECD6; border: 3px solid #D6BB83; color: #5C2C16; display: flex; align-items: center; justify-content: center; font-size: 44px; font-weight: 800; margin: 0 auto 14px; font-family: 'Plus Jakarta Sans', sans-serif; }
        .pf-photo-btn { display: inline-flex; align-items: center; gap: 8px; background: #FFFFFF; border: 1px solid #D6BB83; color: #804022; padding: 8px 16px; border-radius: 9999px; font-size: 13px; font-weight: 700; cursor: pointer; }
        .pf-photo-btn:hover { background: #FCECD6; }
        .pf-name { margin: 16px 0 2px; font-size: 20px; font-weight: 800; color: #5C2C16; font-family: 'Plus Jakarta Sans', sans-serif; }
        .pf-username { font-size: 14px; color: #804022; margin-bottom: 10px; }
        .pf-role { display: inline-block; background: #FCECD6; border: 1px solid #D6BB83; color: #5C2C16; border-radius: 9999px; padding: 4px 14px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; }
        .pf-meta { margin-top: 16px; padding-top: 16px; border-top: 1px solid #F3EFD4; font-size: 13px; color: #804022; }
        .pf-title { margin: 0 0 16px; font-size: 16px; font-weight: 800; color: #5C2C16; font-family: 'Plus Jakarta Sans', sans-serif; display: flex; align-items: center; gap: 8px; }
        .pf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
        .pf-field label { display: block; font-size: 11px; font-weight: 700; color: #C37800; text-transform: uppercase; margin-bottom: 5px; }
        .pf-field input { width: 100%; background: #F8EFE6; border: 1px solid #D6BB83; padding: 11px 14px; border-radius: 10px; font-size: 14px; color: #5C2C16; outline: none; }
        .pf-field input:focus { border-color: #C37800; background: #FFFFFF; }
        .pf-actions { display: flex; justify-content: flex-end; margin-top: 8px; }
        .pf-security { display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; }
        .pf-security p { margin: 0; font-size: 13px; color: #804022; max-width: 420px; line-height: 1.5; }
        .pf-link-btn { text-decoration: none; }
        .pf-error { background: #FDF2F2; border: 1px solid #F8B4B4; color: #DF1B39; padding: 12px 16px; border-radius: 10px; margin: 0 auto 16px; max-width: 1000px; font-size: 14px; white-space: pre-line; }
        .pf-loading { text-align: center; color: #804022; font-weight: 600; padding: 40px; }
        @media (max-width: 800px) { .pf-layout { grid-template-columns: 1fr; } }
        @media (max-width: 520px) { .pf-grid { grid-template-columns: 1fr; } }
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
        <h1>My Profile</h1>
        <p>Manage your account information.</p>
      </div>

      {loadError && <div className="pf-error">{loadError}</div>}

      {isLoading ? (
        <div className="pf-loading">Loading profile details...</div>
      ) : (
        <div className="pf-layout">
          <div className="pf-card pf-side">
            {p?.profile_picture ? (
              <img src={p.profile_picture} alt="Profile" className="pf-avatar" />
            ) : (
              <div className="pf-avatar-fallback">{initial}</div>
            )}

            <label className="pf-photo-btn" style={{ opacity: isUploadingPhoto ? 0.7 : 1 }}>
              <Camera size={15} />
              {isUploadingPhoto ? 'Uploading...' : 'Change Photo'}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                disabled={isUploadingPhoto}
                style={{ display: 'none' }}
              />
            </label>

            <div className="pf-name">{displayName}</div>
            <div className="pf-username">@{profile?.username}</div>
            <span className="pf-role">{profile?.role?.toUpperCase()}</span>

            <div className="pf-meta">
              <strong>Member since</strong>
              <br />
              {profile?.date_joined
                ? new Date(profile.date_joined).toLocaleDateString(undefined, {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })
                : '—'}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <form className="pf-card" onSubmit={handleSave}>
              <h3 className="pf-title"><User size={18} /> Personal Details</h3>

              <div className="pf-grid">
                <div className="pf-field">
                  <label>First Name</label>
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
                </div>
                <div className="pf-field">
                  <label>Middle Name</label>
                  <input value={middleName} onChange={(e) => setMiddleName(e.target.value)} placeholder="Middle name" />
                </div>
              </div>

              <div className="pf-grid">
                <div className="pf-field">
                  <label>Last Name</label>
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
                </div>
                <div className="pf-field">
                  <label><Mail size={11} style={{ verticalAlign: 'middle' }} /> Email Address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" />
                </div>
              </div>

              <div className="pf-actions">
                <button type="submit" className="action-btn-primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>

            <div className="pf-card">
              <h3 className="pf-title"><KeyRound size={18} /> Security</h3>
              <div className="pf-security">
                <p>Change your password, and set your security questions the first time you do.</p>
                <Link to="/change-password" className="action-btn-secondary pf-link-btn">
                  Change Password
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}