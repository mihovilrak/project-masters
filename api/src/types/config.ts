import { DatabaseConfig } from '@pm/backend-common';

export interface Config {
  port: number;
  database: DatabaseConfig;
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
