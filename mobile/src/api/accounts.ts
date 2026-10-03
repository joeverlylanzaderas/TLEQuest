//mobile/src/api/accounts.ts
import { apiClient } from './client';
import { LoginResponse, LoginPayload, FullUser, ProfileUpdatePayload } from '../types/accounts';

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/accounts/login/', payload);
  return data;
}

export async function getMyProfile(): Promise<FullUser> {
  const { data } = await apiClient.get<FullUser>('/accounts/me/');
  return data;
}

export async function updateMyProfile(payload: ProfileUpdatePayload): Promise<FullUser> {
  // Must use multipart/form-data (not JSON) because profile_picture is a
  // file upload — Django's ImageField won't accept a base64 string here.
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) return;

    if (key === 'profile_picture') {
      if (value) {
        // React Native's FormData accepts this { uri, name, type } shape
        // directly — it's not a real Blob, but RN's networking layer
        // knows how to read it off disk.
        // @ts-ignore
        formData.append('profile_picture', value);
      }
      return;
    }

    formData.append(key, value as string);
  });

  // NOTE: MyProfileView uses ReadAfterWriteMixin, so a successful PATCH
  // returns the full UserSerializer shape (FullUser), not just the
  // profile fields — same shape as getMyProfile().
  const { data } = await apiClient.patch<FullUser>('/accounts/me/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}


export async function getSecurityQuestionList(): Promise<{ id: number; question_text: string }[]> {
  const { data } = await apiClient.get('/accounts/security-questions/');
  return data;
}

export async function changePassword(payload: {
  old_password: string;
  new_password: string;
  security_answers?: { question_id: number; answer: string }[];
}) {
  const { data } = await apiClient.post('/accounts/change-password/', payload);
  return data;
}

export async function getForgotPasswordQuestions(username: string) {
  const { data } = await apiClient.get(`/accounts/forgot-password/questions/?username=${encodeURIComponent(username)}`);
  return data;
}

export async function resetForgottenPassword(payload: {
  username: string;
  answers: { question_id: number; answer: string }[];
  new_password: string;
}) {
  const { data } = await apiClient.post('/accounts/forgot-password/reset/', payload);
  return data;
}