import { Clock3 } from 'lucide-react';

interface Props {
  secondsLeft: number;
  onStay: () => void;
  onSignOut: () => void;
}

// Shown shortly before the automatic sign-out. Mouse movement does not dismiss it on purpose:
// the admin has to answer, so an unattended screen still signs out.
export default function IdleWarning({ secondsLeft, onStay, onSignOut }: Props) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(20, 20, 30, 0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="idle-title"
        style={{
          width: '100%', maxWidth: 400, background: '#FFFFFF', border: '1px solid var(--t-d6bb83)',
          borderRadius: 24, padding: '28px 24px 22px', textAlign: 'center',
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)', fontFamily: 'inherit',
        }}
      >
        <div
          style={{
            width: 56, height: 56, borderRadius: '50%', background: 'var(--t-fcecd6)', color: 'var(--t-5c2c16)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
          }}
        >
          <Clock3 size={26} />
        </div>
        <h2 id="idle-title" style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: 'var(--t-5c2c16)' }}>
          Are you still there?
        </h2>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--t-804022)', lineHeight: 1.5 }}>
          For your security you will be signed out in <strong>{secondsLeft}</strong> second{secondsLeft === 1 ? '' : 's'} because there was no activity.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onSignOut}
            style={{
              padding: '11px 20px', borderRadius: 9999, border: '1px solid var(--t-d6bb83)', background: '#FFFFFF',
              color: 'var(--t-804022)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
          >
            Sign out now
          </button>
          <button
            type="button"
            autoFocus
            onClick={onStay}
            style={{
              padding: '11px 22px', borderRadius: 9999, border: 'none', background: 'var(--t-5c2c16)',
              color: '#FFFFFF', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
          >
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  );
}
