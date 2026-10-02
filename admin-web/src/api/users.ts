import { apiClient } from './client';
import type {
  ManagedUser,
  CreateUserPayload,
  UpdateUserPayload,
  BulkUploadResult,
  AdminResetPasswordResult,
} from '../types/users';

export async function getUsers(): Promise<ManagedUser[]> {
  const { data } = await apiClient.get<ManagedUser[]>('/accounts/admin/users/');
  return data;
}

export async function createUser(payload: CreateUserPayload): Promise<ManagedUser> {
  const { data } = await apiClient.post<ManagedUser>('/accounts/admin/users/', payload);
  return data;
}

export async function updateUser(id: number, payload: UpdateUserPayload): Promise<ManagedUser> {
  const { data } = await apiClient.patch<ManagedUser>(`/accounts/admin/users/${id}/`, payload);
  return data;
}

export async function deactivateUser(id: number): Promise<void> {
  // Backend soft-deletes on DELETE — sets is_active=false, doesn't remove the row
  await apiClient.delete(`/accounts/admin/users/${id}/`);
}

export async function resetUserPassword(id: number): Promise<AdminResetPasswordResult> {
  const { data } = await apiClient.post<AdminResetPasswordResult>(
    `/accounts/admin/users/${id}/reset-password/`
  );
  return data;
}

export async function bulkUploadUsers(file: File): Promise<BulkUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post<BulkUploadResult>(
    '/accounts/admin/users/bulk-upload/',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}