import * as schedule from 'node-schedule';
import type { Server } from 'http';
import { config, validateConfig } from './config';
import { pool } from './db';
import { reloadSettings } from './settingsStore';
import { startServer, stopSmtpProbe } from './server';
import { scheduleCleanup } from './jobs/cleanup';
import { scheduleDueSoon } from './jobs/dueSoon';
import { emailService } from './services/emailService';
import { notificationService } from './services/notificationService';
import { logger } from './utils/logger';

let server: Server | null = null;

const initializeService = async (): Promise<void> => {
  try {
    if (config.app.nodeEnv !== 'test') {
      validateConfig();
    }
    await pool.query('SELECT 1');
    logger.info('Database connection established');

    // Load the admin-editable settings before the first send.
    if (await reloadSettings()) {
      emailService.refreshTransport();
    }

    await emailService.initializeTemplates();

    server = startServer();

    schedule.scheduleJob('*/1 * * * *', async () => {
      await notificationService.processNewNotifications();
    });
    scheduleCleanup();
    scheduleDueSoon();
    logger.info('Email processing scheduled');
  } catch (error) {
    logger.error({ err: error }, 'Service initialization failed');
    process.exit(1);
  }
};

const closePool = (): void => {
  pool
    .end()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error({ err: error }, 'Error closing pool');
      process.exit(1);
    });
};

const shutdown = (signal: string): void => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  stopSmtpProbe();
  void schedule.gracefulShutdown();

  if (!server) {
    closePool();
    return;
  }

  server.close((err) => {
    if (err) {
      logger.error({ err }, 'Error closing server');
      process.exit(1);
    }
    logger.info('Server closed');
    closePool();
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

initializeService().catch((error: Error) => {
  logger.error({ err: error }, 'Failed to start service');
  process.exit(1);
});
