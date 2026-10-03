import { apiClient } from './client';
import { Notification } from '../types/notifications';

export async function getAllNotifications(): Promise<Notification[]> {
  const { data } = await apiClient.get<Notification[]>('/notifications/');
  return data;
}

export async function getUnreadNotifications(): Promise<Notification[]> {
  const { data } = await apiClient.get<Notification[]>('/notifications/', {
    params: { unread: 'true' },
  });
  return data;
}

export async function markNotificationRead(id: number): Promise<Notification> {
  const { data } = await apiClient.patch<Notification>(`/notifications/${id}/read/`);
  return data;
}

export async function markAllNotificationsRead(): Promise<{ marked_read: number }> {
  const { data } = await apiClient.patch<{ marked_read: number }>('/notifications/mark-all-read/');
  return data;
}