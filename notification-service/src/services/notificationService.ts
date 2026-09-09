import { pool } from '../db';
import { config, reloadEmailConfig } from '../config';
import { logger } from '../utils/logger';
import { emailService } from './emailService';
import { metrics } from '../metrics';
import {
  DatabaseNotification,
  NotificationTemplateType,
  NotificationEmailData,
} from '../types/notification-service.types';

const BATCH_LIMIT = 100;
const SEND_CONCURRENCY = 5;
// After this many failed attempts a notification is dead-lettered: the claim
// function stops handing it out and the failure is logged and counted.
const MAX_EMAIL_ATTEMPTS = 5;

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let i = 0;
  while (i < items.length) {
    const chunk = items.slice(i, i + concurrency);
    i += chunk.length;
    await Promise.all(chunk.map(fn));
  }
}

class NotificationService {
  async processNewNotifications(): Promise<void> {
    try {
      // SMTP settings are editable from the admin UI while the service runs.
      if (reloadEmailConfig()) {
        emailService.refreshTransport();
      }

      // Claiming is one committed statement on purpose: the previous version
      // held FOR UPDATE row locks across every SMTP round-trip, and a failed
      // COMMIT re-sent the whole batch on the next tick.
      const result = await pool.query<DatabaseNotification>(
        'SELECT * FROM get_notifications_for_service($1, $2)',
        [BATCH_LIMIT, MAX_EMAIL_ATTEMPTS],
      );

      const sentIds: string[] = [];

      await runWithConcurrency(
        result.rows,
        SEND_CONCURRENCY,
        async (notification) => {
          const sent = await this.sendNotificationEmail(notification);
          if (sent) {
            sentIds.push(notification.id);
            metrics.increment('notificationsSent');
          } else if (notification.email_attempts >= MAX_EMAIL_ATTEMPTS) {
            logger.error(
              {
                notificationId: notification.id,
                attempts: notification.email_attempts,
              },
              'Notification dead-lettered after final delivery attempt',
            );
            metrics.increment('notificationsDeadLettered');
          }
        },
      );

      await this.markEmailed(sentIds);
      metrics.setProcessingTime();
    } catch (error) {
      logger.error({ err: error }, 'Failed to process notifications');
      metrics.increment('notificationErrors');
    }
  }

  // emailed_on, not read_on: whether the user has read the notification is
  // theirs to say, and writing read_on here also hid the email from anyone
  // who happened to open the notification in-app first.
  async markEmailed(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    try {
      await pool.query(
        'UPDATE notifications SET emailed_on = NOW() WHERE id = ANY($1::int[])',
        [ids],
      );
    } catch (error) {
      logger.error({ err: error, ids }, 'Failed to mark notifications emailed');
      metrics.increment('notificationErrors');
    }
  }

  async sendNotificationEmail(
    notification: DatabaseNotification,
  ): Promise<boolean> {
    try {
      const emailData: NotificationEmailData = {
        // The row's `data` jsonb carries the per-type fields the templates
        // reference; the named fields below always win over it.
        ...(notification.data ?? {}),
        userName: notification.login,
        // Links are relative app paths, which an email client has no origin to
        // resolve against.
        taskUrl: notification.link
          ? `${config.appBaseUrl}${notification.link}`
          : config.appBaseUrl,
        title: notification.title,
        message: notification.message,
        typeName: notification.type_name,
      };

      await emailService.sendEmailWithRetry(
        notification.email,
        notification.title,
        this.getEmailTemplate(notification.type_id),
        emailData,
      );

      return true;
    } catch (error) {
      logger.error(
        { err: error, notificationId: notification.id },
        'Failed to send notification email',
      );
      metrics.increment('emailErrors');
      return false;
    }
  }

  getEmailTemplate(typeId: number): NotificationTemplateType {
    switch (typeId) {
      case 1:
        return 'taskDueSoon';
      case 2:
        return 'taskAssigned';
      case 3:
        return 'taskUpdated';
      case 4:
        return 'taskComment';
      case 5:
        return 'taskCompleted';
      case 6:
        return 'projectUpdate';
      default:
        return 'default';
    }
  }
}

export const notificationService = new NotificationService();
