export interface Config {
  port: number;
  databaseUrl: string;
  sessionSecret: string;
  feUrl: string;
  nodeEnv: string;
}

export interface EmailConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  from: string;
}
