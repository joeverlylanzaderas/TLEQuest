import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { AdminUser, LoginPayload } from '../types/accounts';
import { login as loginApi, logoutOnServer } from '../api/accounts';
import SignOutConfirm from '../components/SignOutConfirm';
import IdleWarning from '../components/IdleWarning';

// Automatic sign-out after no activity. Change these two numbers if you want a different limit.
const IDLE_LIMIT_MS = 30 * 60 * 1000; // sign out after 30 minutes without activity
const WARN_BEFORE_MS = 60 * 1000;     // show "Are you still there?" for the last 60 seconds
const ACTIVITY_KEY = 'last_activity'; // shared between browser tabs
export const SIGNED_OUT_REASON_KEY = 'signed_out_reason'; // read by the login page

interface AuthContextType {
  user: AdminUser | null;
  isLoading: boolean;
  signIn: (payload: LoginPayload) => Promise<void>;
  // Shows the "Sign Out?" confirmation first. Every Sign Out button calls this.
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readActivity(): number {
  try {
    return Number(localStorage.getItem(ACTIVITY_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeActivity(ts: number) {
  try {
    localStorage.setItem(ACTIVITY_KEY, String(ts));
  } catch {
    /* storage blocked: the in-memory timestamp still works for this tab */
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [idleSecondsLeft, setIdleSecondsLeft] = useState<number | null>(null);

  const lastActivity = useRef(Date.now());
  const warningOpen = useRef(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const accessToken = localStorage.getItem('access_token');
    if (storedUser && accessToken) {
      setUser(JSON.parse(storedUser));
      // A tab that stayed closed longer than the limit must not resume the old session.
      const last = readActivity();
      if (last && Date.now() - last >= IDLE_LIMIT_MS) {
        logoutOnServer(localStorage.getItem('refresh_token'), 'idle');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        try { sessionStorage.setItem(SIGNED_OUT_REASON_KEY, 'idle'); } catch { /* ignore */ }
        setUser(null);
      }
    }
    setIsLoading(false);
  }, []);

  async function signIn(payload: LoginPayload) {
    const data = await loginApi(payload);

    if (data.role !== 'admin') {
      // Same boundary the mobile app enforces, mirrored here —
      // this dashboard is admin-only, students/teachers use the app.
      throw { response: { data: { detail: 'This dashboard is for admin accounts only.' } } };
    }

    const loggedInUser: AdminUser = {
      id: data.user_id,
      username: data.username,
      role: data.role,
    };

    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    try { sessionStorage.removeItem(SIGNED_OUT_REASON_KEY); } catch { /* ignore */ }
    lastActivity.current = Date.now();
    writeActivity(lastActivity.current);
    setUser(loggedInUser);
  }

  const performSignOut = useCallback((reason?: 'idle' | 'expired') => {
    logoutOnServer(localStorage.getItem('refresh_token'), reason === 'idle' ? 'idle' : undefined);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem(ACTIVITY_KEY);
    if (reason) {
      try { sessionStorage.setItem(SIGNED_OUT_REASON_KEY, reason); } catch { /* ignore */ }
    }
    warningOpen.current = false;
    setIdleSecondsLeft(null);
    setUser(null);
  }, []);

  function signOut() {
    setConfirmOpen(true);
  }

  // The refresh token was rejected (expired, revoked, account deactivated): back to the login page.
  useEffect(() => {
    const onExpired = () => performSignOut('expired');
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [performSignOut]);

  // Idle timeout. Only runs while someone is signed in.
  useEffect(() => {
    if (!user) return;

    lastActivity.current = Date.now(); // opening/returning to the page counts as activity
    writeActivity(lastActivity.current);
    let lastWrite = 0;

    const touch = () => {
      if (warningOpen.current) return; // once the warning is up, only the button counts
      const now = Date.now();
      lastActivity.current = now;
      if (now - lastWrite > 5000) { // don't hit localStorage on every mouse move
        lastWrite = now;
        writeActivity(now);
      }
    };

    const events: (keyof WindowEventMap)[] = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));

    const timer = window.setInterval(() => {
      // another tab may have been active more recently
      const last = Math.max(lastActivity.current, readActivity());
      const idle = Date.now() - last;
      if (idle >= IDLE_LIMIT_MS) {
        performSignOut('idle');
      } else if (idle >= IDLE_LIMIT_MS - WARN_BEFORE_MS) {
        warningOpen.current = true;
        setIdleSecondsLeft(Math.max(1, Math.ceil((IDLE_LIMIT_MS - idle) / 1000)));
      } else if (warningOpen.current) {
        warningOpen.current = false; // the other tab was used, so this one is fine again
        setIdleSecondsLeft(null);
      }
    }, 1000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, touch));
      window.clearInterval(timer);
    };
  }, [user, performSignOut]);

  function staySignedIn() {
    const now = Date.now();
    lastActivity.current = now;
    writeActivity(now);
    warningOpen.current = false;
    setIdleSecondsLeft(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
      <SignOutConfirm
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          performSignOut();
        }}
      />
      {user && idleSecondsLeft !== null && (
        <IdleWarning
          secondsLeft={idleSecondsLeft}
          onStay={staySignedIn}
          onSignOut={() => performSignOut()}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
