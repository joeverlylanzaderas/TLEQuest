import axios from 'axios';
import { apiClient, BASE_URL } from './client';
import type { LoginResponse, LoginPayload } from '../types/accounts';

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/accounts/login/', payload);
  return data;
}

// Tells the server to revoke the refresh token. Best effort: signing out never waits for it or
// fails because of it. Plain axios on purpose (no Authorization header, the access token may be expired).
export function logoutOnServer(refresh: string | null, reason?: 'idle'): void {
  if (!refresh) return;
  axios.post(`${BASE_URL}/accounts/logout/`, { refresh, reason }, { timeout: 3000 }).catch(() => {});
}
