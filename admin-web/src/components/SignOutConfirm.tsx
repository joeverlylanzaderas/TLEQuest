import { useEffect } from 'react';
import { LogOut } from 'lucide-react';

interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function SignOutConfirm({ open, onCancel, onConfirm }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(20, 20, 30, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="signout-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 380,
          background: '#FFFFFF',
          border: '1px solid var(--t-d6bb83)',
          borderRadius: 24,
          padding: '28px 24px 22px',
          textAlign: 'center',
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
          fontFamily: 'inherit',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--t-fcecd6)',
            color: 'var(--t-5c2c16)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
          }}
        >
          <LogOut size={26} />
        </div>

        <h2
          id="signout-title"
          style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--t-5c2c16)' }}
        >
          Sign Out?
        </h2>
        <p style={{ margin: '8px 0 22px', fontSize: 15, color: 'var(--t-804022)' }}>
          You will need to log in again.
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              height: 46,
              borderRadius: 999,
              border: '1.5px solid var(--t-d6bb83)',
              background: '#FFFFFF',
              color: 'var(--t-5c2c16)',
              fontSize: 15,
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            style={{
              flex: 1,
              height: 46,
              borderRadius: 999,
              border: 'none',
              background: 'var(--t-5c2c16)',
              color: '#FFFFFF',
              fontSize: 15,
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}