//mobile/src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { User, LoginPayload } from '../types/accounts';
import { login as loginApi } from '../api/accounts';
import { registerForceSignOutHandler } from '../api/client';


interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (payload: LoginPayload) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Lets client.ts force a real logout (e.g. refresh token got
    // blacklisted after a password change) instead of leaving the app
    // stuck thinking it's still logged in.
    registerForceSignOutHandler(() => setUser(null));

    (async () => {
      try {
        const storedUser = await SecureStore.getItemAsync('user');
        const accessToken = await SecureStore.getItemAsync('access_token');
        if (storedUser && accessToken) {
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.log('Failed to restore session', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function signIn(payload: LoginPayload) {
    const data = await loginApi(payload);

    const loggedInUser: User = {
      id: data.user_id,
      username: data.username,
      role: data.role,
    };

    await SecureStore.setItemAsync('access_token', data.access);
    await SecureStore.setItemAsync('refresh_token', data.refresh);
    await SecureStore.setItemAsync('user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  }

  async function signOut() {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}