import { Pool } from 'pg';
import {
  Settings,
  SettingsUpdateInput,
  UserSettingsUpdateInput,
} from '../types/settings';

interface DbTimezoneRow {
  name: string;
  abbrev: string;
  utc_offset: string;
  is_dst: boolean;
}

export interface Timezone {
  name: string;
  region: string;
  abbrev: string;
  utcOffsetSeconds: number;
  isDst: boolean;
  label: string;
}

interface TimezoneCache {
  expiresAt: number;
  data: Timezone[];
}

const TIMEZONE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
let timezoneCache: TimezoneCache | null = null;

/** Clears timezone cache (for tests only). */
export const _clearTimezoneCacheForTest = (): void => {
  timezoneCache = null;
};

// Get System Settings
export const getSystemSettings = async (
  pool: Pool,
): Promise<Settings | null> => {
  const result = await pool.query(`SELECT * FROM app_settings WHERE id = 1`);
  return result.rows[0] || null;
};

// Update System Settings
export const updateSystemSettings = async (
  pool: Pool,
  settings: SettingsUpdateInput,
): Promise<Settings | null> => {
  // Every column is NOT NULL and callers may send a subset (the general form and
  // the runtime panel post separately), so an omitted field keeps its value.
  const result = await pool.query(
    `UPDATE app_settings
     SET (app_name, company_name, sender_email, time_zone, theme, welcome_message,
          app_base_url, log_level, email_enabled, email_host, email_port, email_secure, updated_on)
        = (
          COALESCE($1, app_name),
          COALESCE($2, company_name),
          COALESCE($3, sender_email),
          COALESCE($4, time_zone),
          COALESCE($5, theme),
          COALESCE($6, welcome_message),
          COALESCE($7, app_base_url),
          COALESCE($8, log_level),
          COALESCE($9, email_enabled),
          COALESCE($10, email_host),
          COALESCE($11, email_port),
          COALESCE($12, email_secure),
          CURRENT_TIMESTAMP
        )
     WHERE id = 1
     RETURNING *`,
    [
      settings.app_name ?? null,
      settings.company_name ?? null,
      settings.sender_email ?? null,
      settings.time_zone ?? null,
      settings.theme ?? null,
      settings.welcome_message ?? null,
      settings.app_base_url ?? null,
      settings.log_level ?? null,
      settings.email_enabled ?? null,
      settings.email_host ?? null,
      settings.email_port ?? null,
      settings.email_secure ?? null,
    ],
  );
  return result.rows[0] || null;
};

// Get User Settings
export const getUserSettings = async (
  pool: Pool,
  userId: string,
): Promise<Settings | null> => {
  const result = await pool.query(
    `SELECT * FROM user_settings WHERE user_id = $1`,
    [userId],
  );
  return result.rows[0] || null;
};

// Update User Settings
export const updateUserSettings = async (
  pool: Pool,
  userId: string,
  settings: UserSettingsUpdateInput,
): Promise<Settings | null> => {
  const { theme, language, notifications_enabled } = settings;
  const emailNotifications =
    settings.email_notifications_enabled ?? settings.email_notifications;
  // Every column is NOT NULL, so an omitted field must fall back to the stored
  // value (or the column default on first write) rather than be set to NULL.
  const result = await pool.query(
    `INSERT INTO user_settings (user_id, theme, language, notifications_enabled, email_notifications_enabled)
     VALUES (
       $1,
       COALESCE($2, 'light'),
       COALESCE($3, 'en'),
       COALESCE($4, true),
       COALESCE($5, true)
     )
     ON CONFLICT (user_id) DO UPDATE
     SET (theme, language, notifications_enabled, email_notifications_enabled, updated_on)
        = (
          COALESCE($2, user_settings.theme),
          COALESCE($3, user_settings.language),
          COALESCE($4, user_settings.notifications_enabled),
          COALESCE($5, user_settings.email_notifications_enabled),
          CURRENT_TIMESTAMP
        )
     RETURNING *`,
    [
      userId,
      theme ?? null,
      language ?? null,
      notifications_enabled ?? null,
      emailNotifications ?? null,
    ],
  );
  return result.rows[0] || null;
};

function parseIntervalToSeconds(interval: string | unknown): number {
  const raw = interval != null ? String(interval) : '';
  if (!raw) return 0;
  const trimmed = raw.trim();
  const negative = trimmed.startsWith('-');
  const value = negative ? trimmed.slice(1) : trimmed;
  const parts = value.split(':');
  if (parts.length < 2) return 0;
  const [hoursStr, minutesStr, secondsStr = '0'] = parts;
  const hours = parseInt(hoursStr, 10) || 0;
  const minutes = parseInt(minutesStr, 10) || 0;
  const seconds = parseInt(secondsStr, 10) || 0;
  const total = hours * 3600 + minutes * 60 + seconds;
  return negative ? -total : total;
}

function formatOffsetLabel(seconds: number): string {
  const sign = seconds >= 0 ? '+' : '-';
  const abs = Math.abs(seconds);
  const hours = Math.floor(abs / 3600);
  const minutes = Math.floor((abs % 3600) / 60);
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  return `UTC${sign}${hh}:${mm}`;
}

// Get timezones from PostgreSQL pg_timezone_names view, with simple in-memory caching
export const getTimezones = async (pool: Pool): Promise<Timezone[]> => {
  const now = Date.now();
  if (timezoneCache && timezoneCache.expiresAt > now) {
    return timezoneCache.data;
  }

  const result = await pool.query<DbTimezoneRow>(
    `SELECT name, abbrev, utc_offset, is_dst FROM pg_timezone_names WHERE name LIKE '%/%' ORDER BY name`,
  );

  const data: Timezone[] = result.rows.map((row) => {
    const region = row.name.split('/')[0] || 'Other';
    const utcOffsetSeconds = parseIntervalToSeconds(row.utc_offset);
    const offsetLabel = formatOffsetLabel(utcOffsetSeconds);
    return {
      name: row.name,
      region,
      abbrev: row.abbrev,
      utcOffsetSeconds,
      isDst: row.is_dst,
      label: `${row.name} (${offsetLabel})`,
    };
  });

  timezoneCache = {
    data,
    expiresAt: now + TIMEZONE_TTL_MS,
  };

  return data;
};
