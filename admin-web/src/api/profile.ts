import { apiClient } from './client';
import type { FullAdminProfile, UpdateProfilePayload } from '../types/profile';

export async function getMyProfile(): Promise<FullAdminProfile> {
  const { data } = await apiClient.get<FullAdminProfile>('/accounts/me/');
  return data;
}

export async function updateMyProfile(payload: UpdateProfilePayload): Promise<FullAdminProfile> {
  const { data } = await apiClient.patch<FullAdminProfile>('/accounts/me/', payload);
  return data;
}

export async function uploadMyProfilePicture(file: File): Promise<FullAdminProfile> {
  const formData = new FormData();
  formData.append('profile_picture', file);
  const { data } = await apiClient.patch<FullAdminProfile>('/accounts/me/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}