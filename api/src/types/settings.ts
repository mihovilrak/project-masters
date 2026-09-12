export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface Settings {
  id: number;
  user_id: number;
  app_name: string;
  company_name: string;
  sender_email: string;
  time_zone: string;
  theme: 'light' | 'dark' | 'system';
  welcome_message: string;
  app_base_url: string;
  log_level: LogLevel;
  email_enabled: boolean;
  email_host: string;
  email_port: number;
  email_secure: boolean;
  created_on: Date;
  updated_on: Date;
}

export interface SettingsUpdateInput {
  app_name?: string;
  company_name?: string;
  sender_email?: string;
  time_zone?: string;
  theme?: 'light' | 'dark' | 'system';
  welcome_message?: string;
  app_base_url?: string;
  log_level?: LogLevel;
  email_enabled?: boolean;
  email_host?: string;
  email_port?: number;
  email_secure?: boolean;
}

export interface UserSettingsUpdateInput {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  notifications_enabled?: boolean;
  email_notifications_enabled?: boolean;
  // Legacy name kept so an older client body still reaches the right column.
  email_notifications?: boolean;
}

export interface UserSettings extends Settings {
  user_name: string;
  user_surname: string;
  user_email: string;
  user_login: string;
}
