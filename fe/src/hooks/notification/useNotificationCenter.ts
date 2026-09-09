import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNotifications,
  markAsRead,
  deleteNotification,
} from '../../api/notifications';
import { Notification } from '../../types/notification';
import { useAsyncResource } from '../common/useAsyncResource';
import logger from '../../utils/logger';
import getApiErrorMessage from '../../utils/getApiErrorMessage';

const EMPTY_NOTIFICATIONS: Notification[] = [];

export const useNotificationCenter = (
  userId: number | undefined,
  pollIntervalMs: number = 60000,
) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const navigate = useNavigate();

  const {
    data: notifications,
    loading,
    error,
    setError,
    refetch: fetchNotifications,
  } = useAsyncResource<Notification[]>(
    async (signal) => (await getNotifications(signal)) || [],
    [userId],
    {
      initialData: EMPTY_NOTIFICATIONS,
      enabled: Boolean(userId),
      errorMessage: 'Failed to load notifications',
    },
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n?.is_read).length,
    [notifications],
  );

  useEffect(() => {
    if (!userId || pollIntervalMs <= 0) return;
    const interval = setInterval(fetchNotifications, pollIntervalMs);
    return () => clearInterval(interval);
  }, [userId, pollIntervalMs, fetchNotifications]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (): void => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (
    notification: Notification,
  ): Promise<void> => {
    try {
      if (!userId) return;
      if (!notification) return;

      if (!notification.is_read) {
        await markAsRead(notification.id);
        await fetchNotifications();
      }
      handleClose();
      if (notification?.link) {
        navigate(notification.link);
      }
    } catch (error: unknown) {
      logger.error('Failed to handle notification click:', error);
      // Don't prevent navigation if marking as read fails
      handleClose();
      if (notification?.link) {
        navigate(notification.link);
      }
    }
  };

  const handleDeleteNotification = async (
    id: number,
    event: React.MouseEvent,
  ): Promise<void> => {
    event.stopPropagation();
    try {
      if (!id) return;
      await deleteNotification(id);
      await fetchNotifications();
    } catch (err: unknown) {
      logger.error('Failed to delete notification:', err);
      setError(getApiErrorMessage(err, 'Failed to delete notification'));
    }
  };

  const handleMarkAllAsRead = async (): Promise<void> => {
    if (!userId) return;
    try {
      await markAsRead();
      await fetchNotifications();
    } catch (err: unknown) {
      logger.error('Failed to mark all notifications as read:', err);
      setError(getApiErrorMessage(err, 'Failed to mark notifications as read'));
    }
  };

  return {
    anchorEl,
    notifications,
    loading,
    error,
    clearError: () => setError(null),
    unreadCount,
    fetchNotifications,
    handleClick,
    handleClose,
    handleNotificationClick,
    handleDeleteNotification,
    handleMarkAllAsRead,
  };
};
