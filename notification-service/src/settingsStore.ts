import { pool } from './db';
import { applySettings, config } from './config';
import { logger } from './utils/logger';
import { AppSettingsRow } from './types/config.types';

const QUERY = `SELECT sender_email, app_base_url, email_enabled, email_host, email_port, email_secure
               FROM app_settings WHERE id = 1`;

let warnedAboutCredentials = false;

// Called before each batch so settings changed in the admin UI take effect
// without restarting the container.
export const reloadSettings = async (): Promise<boolean> => {
  let row: AppSettingsRow | null = null;
  try {
    const result = await pool.query<AppSettingsRow>(QUERY);
    row = result.rows[0] ?? null;
  } catch (err) {
    logger.error({ err }, 'Failed to load app settings; keeping current values');
    return false;
  }

  const changed = applySettings(row);

  if (config.app.emailEnabled && !config.email.auth.pass) {
    if (!warnedAboutCredentials) {
      logger.warn(
        'Email is enabled in settings but EMAIL_USER/EMAIL_PASSWORD are not set',
      );
      warnedAboutCredentials = true;
    }
  } else {
    warnedAboutCredentials = false;
  }

  return changed;
};
