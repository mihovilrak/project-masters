import path from 'path';
import dotenv from 'dotenv';
import { Config, EmailConfig } from './types/config';
import { Settings } from './types/settings';
import logger from './utils/logger';
import { readDatabaseConfig } from '@pm/backend-common';

// When running integration tests under Jest, load .env.test first so the app uses the test DB
if (process.env.JEST_WORKER_ID !== undefined) {
  dotenv.config({ path: path.join(process.cwd(), '.env.test') });
}
// Load environment variables from .env file (does not override existing vars)
dotenv.config();

// Only tests get defaults. Anywhere else a missing POSTGRES_* must fail
// validation rather than silently connect with the wrong credentials.
const testDefaults =
  process.env.NODE_ENV === 'test'
    ? {
        host: 'db',
        user: 'pm_user',
        password: 'pm_password',
        database: 'pm_test',
      }
    : {};

// Use TEST_DB_* when set (e.g. CI integration tests) so the app connects to the same DB as tests
const database = readDatabaseConfig(process.env, {
  preferTest: true,
  ...testDefaults,
});

const config: Config = {
  port: parseInt(process.env.PORT || '5000', 10),
  database,
  sessionSecret: process.env.SESSION_SECRET || 'default_secret',
  feUrl: process.env.FE_URL || 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV || 'development',
};

function validateConfig(): void {
  const { nodeEnv, sessionSecret, database: db, port, feUrl } = config;

  if (!Number.isFinite(port) || port <= 0) {
    logger.error(
      'Config validation failed: PORT must be a valid positive number.',
    );
    process.exit(1);
  }

  const missingDb = (['host', 'user', 'password', 'database'] as const).filter(
    (key) => !db[key],
  );
  if (missingDb.length > 0) {
    logger.error(
      `Config validation failed: missing database settings (${missingDb.join(', ')}). Set POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB (or TEST_DB_* for tests).`,
    );
    process.exit(1);
  }
  if (!Number.isFinite(db.port) || db.port <= 0) {
    logger.error('Config validation failed: POSTGRES_PORT must be a valid port.');
    process.exit(1);
  }

  if (nodeEnv === 'production') {
    if (!process.env.SESSION_SECRET || sessionSecret === 'default_secret') {
      logger.error(
        'Config validation failed: SESSION_SECRET must be set to a non-default value in production.',
      );
      process.exit(1);
    }
    if (
      !process.env.FE_URL ||
      !feUrl ||
      typeof feUrl !== 'string' ||
      feUrl.trim() === ''
    ) {
      logger.error(
        'Config validation failed: FE_URL must be set in production.',
      );
      process.exit(1);
    }
  }
}

validateConfig();

const DEFAULT_EMAIL_PORT = 587;

// SMTP host/port/sender live in app_settings so the admin UI can change them
// without a restart; only the credentials stay in the environment as secrets.
export const buildEmailConfig = (settings: Settings | null): EmailConfig => ({
  enabled: settings?.email_enabled ?? false,
  host: settings?.email_host || 'smtp.gmail.com',
  port: settings?.email_port || DEFAULT_EMAIL_PORT,
  secure: settings?.email_secure ?? false,
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASSWORD,
  from: settings?.sender_email || 'no-reply@example.com',
});

export default config;
