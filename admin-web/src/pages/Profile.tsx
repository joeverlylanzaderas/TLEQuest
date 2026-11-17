// admin-web/src/pages/Profile.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Camera, KeyRound, Mail, User, ShieldCheck, CalendarDays, CheckCircle } from 'lucide-react';
import { getMyProfile, updateMyProfile, uploadMyProfilePicture } from '../api/profile';
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
      e.target.value = '';
    }
  }

  const p = profile?.profile ?? null;
  const displayName =
    [p?.first_name, p?.last_name].filter(Boolean).join(' ') || profile?.username || '';
  const initial = (p?.first_name || profile?.username || '?').charAt(0).toUpperCase();

  const joined = profile?.date_joined ? new Date(profile.date_joined) : null;
  const joinedShort = joined
    ? joined.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';
  const joinedChip = joined
    ? joined.toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
    : '—';

  return (
    <div className="page-wrapper">
      <style>{`
        .pf-wrap { max-width: 1000px; margin: 0 auto; }

        /* Banner + hero */
        .pf-banner { position: relative; height: 170px; border-radius: 28px; overflow: hidden; background: var(--t-c37800); }
        .pf-c1 { position: absolute; right: -60px; top: -80px; width: 280px; height: 280px; border-radius: 50%; background: rgba(255,255,255,0.10); }
        .pf-c2 { position: absolute; right: 150px; bottom: -110px; width: 200px; height: 200px; border-radius: 50%; background: rgba(255,255,255,0.14); }
        .pf-c3 { position: absolute; left: -50px; bottom: -90px; width: 190px; height: 190px; border-radius: 50%; background: rgba(255,255,255,0.08); }

        .pf-hero { display: flex; align-items: flex-start; gap: 20px; margin: -58px 32px 0; position: relative; flex-wrap: wrap; }
        .pf-avatar-wrap { position: relative; width: 116px; height: 116px; flex-shrink: 0; }
        .pf-avatar { width: 116px; height: 116px; border-radius: 50%; object-fit: cover; border: 5px solid #FFFFFF; display: block; box-shadow: 0 8px 20px rgba(0,0,0,0.15); background: #FFFFFF; }
        .pf-avatar-fallback { width: 116px; height: 116px; border-radius: 50%; background: var(--t-fcecd6); border: 5px solid #FFFFFF; color: var(--t-5c2c16); display: flex; align-items: center; justify-content: center; font-size: 48px; font-weight: 800; box-shadow: 0 8px 20px rgba(0,0,0,0.15); font-family: 'Plus Jakarta Sans', sans-serif; }
        .pf-cam { position: absolute; right: 0; bottom: 4px; width: 36px; height: 36px; border-radius: 50%; background: #F2B84B; border: 3px solid #FFFFFF; color: #3A2A00; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .pf-cam:hover { filter: brightness(1.06); }

        .pf-id { padding-top: 70px; min-width: 0; }
        .pf-name { margin: 0; font-size: 28px; font-weight: 800; color: var(--t-5c2c16); font-family: 'Plus Jakarta Sans', sans-serif; line-height: 1.15; }
        .pf-username { font-size: 14px; color: var(--t-804022); margin: 2px 0 8px; }
        .pf-chips { display: flex; gap: 8px; flex-wrap: wrap; }
        .pf-chip { display: inline-block; background: var(--t-fcecd6); color: var(--t-5c2c16); border-radius: 9999px; padding: 5px 12px; font-size: 11px; font-weight: 800; letter-spacing: 0.4px; }
        .pf-chip.alt { background: var(--t-f3efd4); color: var(--t-804022); }

        /* Body */
        .pf-body { display: grid; grid-template-columns: 1.6fr 1fr; gap: 18px; margin-top: 22px; align-items: start; }
        .pf-card { background: #FFFFFF; border: 1px solid var(--t-d6bb83); border-radius: 24px; box-shadow: 0 4px 20px rgba(128,64,34,0.05); padding: 24px; }
        .pf-title { margin: 0 0 16px; font-size: 17px; font-weight: 800; color: var(--t-5c2c16); font-family: 'Plus Jakarta Sans', sans-serif; display: flex; align-items: center; gap: 10px; }
        .pf-ic { width: 34px; height: 34px; border-radius: 10px; background: var(--t-fcecd6); color: var(--t-5c2c16); display: inline-flex; align-items: center; justify-content: center; }

        .pf-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 18px; }
        .pf-stat { border-radius: 20px; padding: 14px 16px; color: var(--t-5c2c16); min-width: 0; }
        .pf-stat .lbl { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; opacity: 0.85; }
        .pf-stat .val { font-size: 18px; font-weight: 800; margin-top: 4px; font-family: 'Plus Jakarta Sans', sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pf-stat.s1 { background: var(--t-fcecd6); }
        .pf-stat.s2 { background: color-mix(in srgb, var(--t-c37800) 25%, #FFFFFF); }
        .pf-stat.s3 { background: color-mix(in srgb, var(--t-c37800) 50%, #FFFFFF); }

        .pf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
        .pf-field label { display: block; font-size: 11px; font-weight: 700; color: var(--t-c37800); text-transform: uppercase; margin-bottom: 5px; }
        .pf-field input { width: 100%; background: var(--t-f8efe6); border: 1px solid var(--t-d6bb83); padding: 12px 14px; border-radius: 14px; font-size: 14px; color: var(--t-5c2c16); outline: none; }
        .pf-field input:focus { border-color: var(--t-c37800); background: #FFFFFF; }
        .pf-actions { display: flex; justify-content: flex-end; margin-top: 8px; }

        .pf-sec-text { margin: 0 0 16px; font-size: 14px; color: var(--t-804022); line-height: 1.5; }
        .pf-link-btn { text-decoration: none; display: inline-block; }

        .pf-error { background: #FDF2F2; border: 1px solid #F8B4B4; color: #DF1B39; padding: 12px 16px; border-radius: 10px; margin: 0 auto 16px; max-width: 1000px; font-size: 14px; white-space: pre-line; }
        .pf-loading { text-align: center; color: var(--t-804022); font-weight: 600; padding: 40px; }

        @media (max-width: 820px) {
          .pf-body { grid-template-columns: 1fr; }
          .pf-hero { margin: -58px 12px 0; }
        }
        @media (max-width: 520px) {
          .pf-grid { grid-template-columns: 1fr; }
          .pf-stats { grid-template-columns: 1fr; }
          .pf-id { padding-top: 8px; }
        }
      `}</style>


      <div className="page-title-area">
        <h1>My Profile</h1>
        <p>Manage your account information.</p>
      </div>

      {loadError && <div className="pf-error">{loadError}</div>}

      {isLoading ? (
        <div className="pf-loading">Loading profile details...</div>
      ) : (
        <div className="pf-wrap">
          <div className="pf-banner">
            <div className="pf-c1" />
            <div className="pf-c2" />
            <div className="pf-c3" />
          </div>

          <div className="pf-hero">
            <div className="pf-avatar-wrap">
              {p?.profile_picture ? (
                <img src={p.profile_picture} alt="Profile" className="pf-avatar" />
              ) : (
                <div className="pf-avatar-fallback">{initial}</div>
              )}
              <label
                className="pf-cam"
                title="Change photo"
                style={{ opacity: isUploadingPhoto ? 0.6 : 1 }}
              >
                <Camera size={16} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  disabled={isUploadingPhoto}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            <div className="pf-id">
              <h2 className="pf-name">{displayName}</h2>
              <div className="pf-username">@{profile?.username}</div>
              <div className="pf-chips">
                <span className="pf-chip">{profile?.role?.toUpperCase()}</span>
                <span className="pf-chip alt">Member since {joinedChip}</span>
                {isUploadingPhoto && <span className="pf-chip alt">Uploading photo...</span>}
              </div>
            </div>
          </div>

          <div className="pf-body">
            <div>
              <div className="pf-stats">
                <div className="pf-stat s1">
                  <div className="lbl"><ShieldCheck size={14} /> Role</div>
                  <div className="val">{profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : '—'}</div>
                </div>
                <div className="pf-stat s2">
                  <div className="lbl"><CalendarDays size={14} /> Joined</div>
                  <div className="val">{joinedShort}</div>
                </div>
                <div className="pf-stat s3">
                  <div className="lbl"><CheckCircle size={14} /> Status</div>
                  <div className="val">Active</div>
                </div>
              </div>

              <form className="pf-card" onSubmit={handleSave}>
                <h3 className="pf-title">
                  <span className="pf-ic"><User size={17} /></span> Personal Details
                </h3>

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
            </div>

            <div className="pf-card">
              <h3 className="pf-title">
                <span className="pf-ic"><KeyRound size={17} /></span> Security
              </h3>
              <p className="pf-sec-text">
                Change your password, and set your security questions the first time you do.
              </p>
              <Link to="/change-password" className="action-btn-secondary pf-link-btn">
                Change Password
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}