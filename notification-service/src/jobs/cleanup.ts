import * as schedule from 'node-schedule';
import { pool } from '../db';
import { logger } from '../utils/logger';

// archived_on marks "aged out" so it stays distinguishable from the
// active = false that api/ writes when a user deletes a notification.
export const cleanupOldNotifications = async (): Promise<void> => {
  try {
    const result = await pool.query(
      `UPDATE notifications
       SET active = false,
           archived_on = NOW()
       WHERE active
       AND created_on < NOW() - INTERVAL '30 days'
       AND (read_on IS NOT NULL OR is_read = true)`,
    );
    logger.info({ rowCount: result.rowCount }, 'Cleaned up old notifications');
  } catch (error) {
    logger.error({ err: error }, 'Error cleaning up notifications');
  }
};

export const scheduleCleanup = (): schedule.Job =>
  schedule.scheduleJob('0 2 * * *', cleanupOldNotifications);
