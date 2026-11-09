import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AdminUser, LoginPayload } from '../types/accounts';
import { login as loginApi } from '../api/accounts';
import SignOutConfirm from '../components/SignOutConfirm';

interface AuthContextType {
  user: AdminUser | null;
  isLoading: boolean;
  signIn: (payload: LoginPayload) => Promise<void>;
  // Shows the "Sign Out?" confirmation first. Every Sign Out button calls this.
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const accessToken = localStorage.getItem('access_token');
    if (storedUser && accessToken) {
      setUser(JSON.parse(storedUser));
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
    setUser(loggedInUser);
  }

  function performSignOut() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
  }

  function signOut() {
    setConfirmOpen(true);
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
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}