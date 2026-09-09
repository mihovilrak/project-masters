import fs from 'fs';
import dotenv from 'dotenv';
import { Config, EmailConfig } from './types/config.types';
import { readDatabaseConfig } from '@pm/backend-common';

// The admin UI rewrites this file at runtime, so it is the source of truth for
// email settings and must win over the container environment (same precedence
// as api/src/controllers/settingsController.ts).
const envFilePath = process.env.ENV_FILE_PATH ?? '/app/config/.env';

dotenv.config({ path: envFilePath });

const DEFAULT_EMAIL_PORT = 587;

const readEnvFile = (): NodeJS.ProcessEnv => {
  try {
    return dotenv.parse(fs.readFileSync(envFilePath));
  } catch {
    return {};
  }
};

const resolveEnv = (): NodeJS.ProcessEnv => ({
  ...process.env,
  ...readEnvFile(),
});

const buildEmailConfig = (env: NodeJS.ProcessEnv): EmailConfig => {
  const port = parseInt(env.EMAIL_PORT || String(DEFAULT_EMAIL_PORT), 10);
  return {
    host: env.EMAIL_HOST || 'smtp.gmail.com',
    port:
      Number.isFinite(port) && port > 0 && port <= 65535
        ? port
        : DEFAULT_EMAIL_PORT,
    secure: env.EMAIL_SECURE === 'true',
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASSWORD,
    },
    from: env.EMAIL_FROM || 'Project Management <noreply@yourcompany.com>',
  };
};

const initialEnv = resolveEnv();

export const config: Config = {
  db: { ...readDatabaseConfig() },
  email: buildEmailConfig(initialEnv),
  // Links in notifications are opened by the user's browser, so they must point
  // at the app's public URL, not at this service's own port.
  appBaseUrl: (
    initialEnv.APP_BASE_URL ||
    initialEnv.FE_URL ||
    'http://localhost:3000'
  ).replace(/\/+$/, ''),
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    emailEnabled: initialEnv.EMAIL_ENABLED === 'true',
    port: parseInt(process.env.PORT || '5001', 10),
  },
};

// Called before each batch so settings changed in the admin UI take effect
// without restarting the container. Returns true when the SMTP connection
// parameters changed and the transporter has to be rebuilt.
export const reloadEmailConfig = (): boolean => {
  const env = resolveEnv();
  const next = buildEmailConfig(env);
  const changed = JSON.stringify(next) !== JSON.stringify(config.email);
  config.email = next;
  config.app.emailEnabled = env.EMAIL_ENABLED === 'true';
  return changed;
};

export function validateConfig(): void {
  const missing: string[] = [];
  if (!process.env.POSTGRES_HOST) missing.push('POSTGRES_HOST');
  if (!process.env.POSTGRES_USER) missing.push('POSTGRES_USER');
  if (!process.env.POSTGRES_DB) missing.push('POSTGRES_DB');
  if (!process.env.POSTGRES_PASSWORD) missing.push('POSTGRES_PASSWORD');
  if (config.app.emailEnabled) {
    if (!config.email.auth.user) missing.push('EMAIL_USER');
    if (!config.email.auth.pass) missing.push('EMAIL_PASSWORD');
  }
  if (missing.length > 0) {
    throw new Error(`Missing required env: ${missing.join(', ')}`);
  }
}
