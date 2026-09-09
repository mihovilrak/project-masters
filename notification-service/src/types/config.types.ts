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
