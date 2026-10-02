import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    // Auto-dismiss after 4s — errors linger a touch longer since they
    // often carry more text (e.g. multi-line validation messages)
    const duration = type === 'error' ? 5000 : 3500;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={styles.container}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{ ...styles.toast, ...styles[t.type] }}
            onClick={() => dismiss(t.id)}
          >
            <span style={styles.icon}>
              {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
            </span>
            <span style={{ whiteSpace: 'pre-line' }}>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 20,
    right: 20,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    maxWidth: 360,
  },
  toast: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '12px 16px',
    borderRadius: 10,
    color: '#fff',
    fontSize: 14,
    fontWeight: 500,
    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
    cursor: 'pointer',
    animation: 'toastSlideIn 0.25s ease-out',
  },
  success: { backgroundColor: '#16a34a' },
  error: { backgroundColor: '#dc2626' },
  info: { backgroundColor: '#3A2B1A' },
  icon: { fontWeight: 700, flexShrink: 0 },
};