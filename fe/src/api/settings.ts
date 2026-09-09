import { api } from './api';
import { UserSettings, AppSettings, TimezoneOption } from '../types/setting';

// Get User Settings
export const getUserSettings = async (
  signal?: AbortSignal,
): Promise<UserSettings> => {
  const response = await api.get<UserSettings>('/settings/user_settings', {
    signal,
  });
  return response.data;
};

// Update User Settings
export const updateUserSettings = async (
  settings: UserSettings,
): Promise<void> => {
  await api.put<void>('/settings/user_settings', settings);
};

// Get System Settings
export const getSystemSettings = async (
  signal?: AbortSignal,
): Promise<AppSettings> => {
  const response = await api.get<AppSettings>('/settings/app_settings', {
    signal,
  });
  return response.data;
};

// Update System Settings
export const updateSystemSettings = async (
  settings: AppSettings,
): Promise<void> => {
  await api.put<void>('/settings/app_settings', settings);
};

// Get App Theme
export const getAppTheme = async (): Promise<{
  theme: 'light' | 'dark' | 'system';
}> => {
  const response = await api.get<{ theme: 'light' | 'dark' | 'system' }>(
    '/settings/app_theme',
  );
  return response.data;
};

// Get list of available timezones
export const getTimezones = async (
  signal?: AbortSignal,
): Promise<TimezoneOption[]> => {
  const response = await api.get<TimezoneOption[]>('/settings/timezones', {
    signal,
  });
  return response.data;
};

// Get env settings (Admin only; secrets masked)
export interface EnvEntry {
  key: string;
  value: string;
  masked: boolean;
}

export interface EnvUpdateResult {
  entries: EnvEntry[];
  restartRequired: boolean;
  message: string;
}

export const getEnvSettings = async (
  signal?: AbortSignal,
): Promise<EnvEntry[]> => {
  const response = await api.get<EnvEntry[]>('/settings/env', { signal });
  return response.data;
};

export const updateEnvSettings = async (
  updates: Record<string, string>,
): Promise<EnvUpdateResult> => {
  const response = await api.patch<EnvUpdateResult>('/settings/env', {
    updates,
  });
  return response.data;
};

// Test SMTP Connection
export interface SmtpTestResult {
  success: boolean;
  message: string;
  messageId?: string;
}

export const testSmtpConnection = async (
  email: string,
): Promise<SmtpTestResult> => {
  const response = await api.post<SmtpTestResult>('/settings/test-smtp', {
    email,
  });
  return response.data;
};
