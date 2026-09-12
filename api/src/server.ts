import { Server } from 'http';
import app from './app';
import config from './config';
import { ensureConnection, pool } from './db';
import logger from './utils/logger';

let server: Server | undefined;
let shuttingDown = false;

const closePool = (): void => {
  pool
    .end()
    .then(() => {
      logger.info('Database pool closed');
      process.exit(0);
    })
    .catch((err) => {
      logger.error({ err }, 'Error closing database pool');
      process.exit(1);
    });
};

const shutdown = (signal: string): void => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received, shutting down`);

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

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  process.exit(1);
});

ensureConnection()
  .then(() => {
    server = app.listen(config.port, () => {
      logger.info(`Server is running on port ${config.port}`);
    });
  })
  .catch((err) => {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  });
