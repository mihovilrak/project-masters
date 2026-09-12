import { Logger } from 'pino';
import { Pool, PoolConfig } from 'pg';

export interface DatabaseConfig {
  host: string | undefined;
  port: number;
  user: string | undefined;
  password: string | undefined;
  database: string | undefined;
}

export interface DatabaseDefaults {
  preferTest?: boolean;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
}

export function createLogger(env?: NodeJS.ProcessEnv): Logger;
export function readDatabaseConfig(
  env?: NodeJS.ProcessEnv,
  options?: DatabaseDefaults,
): DatabaseConfig;
export function createPool(
  database: PoolConfig,
  logger: Logger,
  overrides?: PoolConfig,
): Pool;
