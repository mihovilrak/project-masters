import { api } from './api';
import { Notification } from '../types/notification';

// Get the current user's notifications. The owner is resolved from the session
// server-side, so no user id is sent.
export const getNotifications = async (
  signal?: AbortSignal,
): Promise<Notification[]> => {
  const response = await api.get<Notification[]>('/notifications', { signal });
  return response.data;
};

// Mark one notification as read, or all of them when no id is given
export const markAsRead = async (notificationId?: number): Promise<void> => {
  await api.patch<void>(
    '/notifications',
    notificationId ? { notification_id: notificationId } : {},
  );
};

// Delete notification
export const deleteNotification = async (
  notificationId: number,
): Promise<void> => {
  await api.delete<void>(`/notifications/${notificationId}`);
};
