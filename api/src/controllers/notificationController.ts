import { Response } from 'express';
import { Pool } from 'pg';
import * as notificationModel from '../models/notificationModel';
import { CustomRequest } from '../types/express';
import logger from '../utils/logger';
import { parsePagination } from '../utils/pagination';

// Get notifications of the current user
export const getUserNotifications = async (
  req: CustomRequest,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  const userId = req.session?.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const notifications = await notificationModel.getNotificationsByUserId(
      pool,
      String(userId),
      parsePagination(req.query),
    );
    res.status(200).json(notifications);
  } catch (error) {
    logger.error({ err: error });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark the current user's notifications as read
export const markAsRead = async (
  req: CustomRequest,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  const userId = req.session?.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const { notification_id: notificationId } = (req.body ?? {}) as {
      notification_id?: number | string;
    };
    const updatedNotifications =
      notificationId === undefined || notificationId === null
        ? await notificationModel.markNotificationsAsRead(pool, String(userId))
        : await notificationModel.markNotificationAsRead(
            pool,
            String(notificationId),
            String(userId),
          );
    res.status(200).json(updatedNotifications);
  } catch (error) {
    logger.error({ err: error });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a notification owned by the current user
export const deleteNotification = async (
  req: CustomRequest,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  const { id } = req.params;
  const userId = req.session?.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const deleted = await notificationModel.deleteNotification(
      pool,
      id,
      String(userId),
    );
    if (!deleted) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.status(200).json({ message: 'Notification deleted' });
  } catch (error) {
    logger.error({ err: error });
    res.status(500).json({ error: 'Internal server error' });
  }
};
