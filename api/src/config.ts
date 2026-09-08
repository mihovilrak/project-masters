import path from 'path';
import dotenv from 'dotenv';
import { Config, EmailConfig } from './types/config';
import logger from './utils/logger';
import {
  readDatabaseConfig,
  toDatabaseUrl,
} from '@pm/backend-common';

// When running integration tests under Jest, load .env.test first so the app uses the test DB
if (process.env.JEST_WORKER_ID !== undefined) {
  dotenv.config({ path: path.join(process.cwd(), '.env.test') });
}
// Load environment variables from .env file (does not override existing vars)
dotenv.config();

// Use TEST_DB_* when set (e.g. CI integration tests) so the app connects to the same DB as tests
const database = readDatabaseConfig(process.env, {
  preferTest: true,
  host: 'db',
  user: 'pm_user',
  password: 'pm_password',
  database: 'pm_test',
});

const config: Config = {
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: toDatabaseUrl(database),
  sessionSecret: process.env.SESSION_SECRET || 'default_secret',
  feUrl: process.env.FE_URL || 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV || 'development',
};

function validateConfig(): void {
  const { nodeEnv, sessionSecret, databaseUrl, port, feUrl } = config;

  if (!Number.isFinite(port) || port <= 0) {
    logger.error(
      'Config validation failed: PORT must be a valid positive number.',
    );
    process.exit(1);
  }

  if (databaseUrl.includes('undefined')) {
    logger.error(
      'Config validation failed: database URL contains undefined. Set POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB (or TEST_DB_* for tests).',
    );
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

// Read at call time rather than at import: the settings endpoint can rewrite
// .env while the process runs, and the caller decides how to report a bad value
// (unlike the startup config, which exits).
export const readEmailConfig = (
  env: NodeJS.ProcessEnv = process.env,
): EmailConfig => {
  const port = parseInt(env.EMAIL_PORT || String(DEFAULT_EMAIL_PORT), 10);

  return {
    enabled: env.EMAIL_ENABLED === 'true',
    host: env.EMAIL_HOST || 'smtp.gmail.com',
    port:
      Number.isFinite(port) && port > 0 && port <= 65535
        ? port
        : DEFAULT_EMAIL_PORT,
    secure: env.EMAIL_SECURE === 'true',
    user: env.EMAIL_USER,
    password: env.EMAIL_PASSWORD,
    from: env.EMAIL_FROM || 'Project Management <noreply@example.com>',
  };
};

export default config;
