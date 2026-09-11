import * as schedule from 'node-schedule';
import { pool } from '../db';
import { logger } from '../utils/logger';

export const createDueSoonNotifications = async (): Promise<void> => {
  try {
    const result = await pool.query<{ created: number }>(
      'SELECT create_due_soon_notifications() AS created',
    );
    logger.info(
      { created: result.rows[0]?.created ?? 0 },
      'Created due soon notifications',
    );
  } catch (error) {
    logger.error({ err: error }, 'Error creating due soon notifications');
  }
};

// Hourly rather than daily so a due date set during the day is still picked up
// the same day; the SQL function skips tasks it has already notified.
export const scheduleDueSoon = (): schedule.Job =>
  schedule.scheduleJob('5 * * * *', createDueSoonNotifications);
