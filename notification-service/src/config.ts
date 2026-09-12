import { AppSettingsRow, Config, EmailConfig } from './types/config.types';
import { readDatabaseConfig } from '@pm/backend-common';

const DEFAULT_EMAIL_PORT = 587;
const DEFAULT_BASE_URL = 'http://localhost:3000';

const buildEmailConfig = (settings: AppSettingsRow | null): EmailConfig => ({
  host: settings?.email_host || 'smtp.gmail.com',
  port: settings?.email_port || DEFAULT_EMAIL_PORT,
  secure: settings?.email_secure ?? false,
  // Credentials are secrets, so they stay in the environment; everything else
  // is editable from the admin UI and lives in app_settings.
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  from: settings?.sender_email || 'no-reply@example.com',
});

export const config: Config = {
  db: { ...readDatabaseConfig() },
  email: buildEmailConfig(null),
  // Links in notifications are opened by the user's browser, so they must point
  // at the app's public URL, not at this service's own port.
  appBaseUrl: DEFAULT_BASE_URL,
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    emailEnabled: false,
    port: parseInt(process.env.PORT || '5001', 10),
  },
};

// Returns true when the SMTP connection parameters changed and the transporter
// has to be rebuilt.
export const applySettings = (settings: AppSettingsRow | null): boolean => {
  const next = buildEmailConfig(settings);
  const changed = JSON.stringify(next) !== JSON.stringify(config.email);
  config.email = next;
  config.app.emailEnabled = settings?.email_enabled ?? false;
  config.appBaseUrl = (settings?.app_base_url || DEFAULT_BASE_URL).replace(
    /\/+$/,
    '',
  );
  return changed;
};

export function validateConfig(): void {
  const missing: string[] = [];
  if (!process.env.POSTGRES_HOST) missing.push('POSTGRES_HOST');
  if (!process.env.POSTGRES_USER) missing.push('POSTGRES_USER');
  if (!process.env.POSTGRES_DB) missing.push('POSTGRES_DB');
  if (!process.env.POSTGRES_PASSWORD) missing.push('POSTGRES_PASSWORD');
  if (missing.length > 0) {
    throw new Error(`Missing required env: ${missing.join(', ')}`);
  }
}
