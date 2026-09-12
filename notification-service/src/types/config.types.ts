export interface DbConfig {
  user: string | undefined;
  host: string | undefined;
  database: string | undefined;
  password: string | undefined;
  port: number;
}

export interface EmailAuth {
  user: string | undefined;
  pass: string | undefined;
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: EmailAuth;
  from: string;
}

export interface AppConfig {
  nodeEnv: string;
  emailEnabled: boolean;
  port: number;
}

export interface Config {
  db: DbConfig;
  email: EmailConfig;
  appBaseUrl: string;
  app: AppConfig;
}

// The runtime-editable half of app_settings, shared with the API.
export interface AppSettingsRow {
  sender_email: string;
  app_base_url: string;
  email_enabled: boolean;
  email_host: string;
  email_port: number;
  email_secure: boolean;
}
