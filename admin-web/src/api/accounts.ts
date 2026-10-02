import { apiClient } from './client';
import type { LoginResponse, LoginPayload } from '../types/accounts';

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/accounts/login/', payload);
  return data;
}