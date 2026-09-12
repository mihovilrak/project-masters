import { Pool, types } from 'pg';
import config from './config';
import logger from './utils/logger';
import { createPool } from '@pm/backend-common';

// `date` columns carry no time and no zone. Left to the default parser they
// become JS Dates at local midnight, serialize to a UTC instant, and arrive in
// the browser as the previous or next day. Hand them over as 'YYYY-MM-DD'.
types.setTypeParser(types.builtins.DATE, (value: string) => value);

export const pool: Pool = createPool(config.database, logger, {
  maxUses: 7500,
});

export async function ensureConnection(): Promise<void> {
  try {
    await pool.query('SELECT 1');
    logger.info('Connected to database successfully');
  } catch (err) {
    logger.error({ err }, 'Error connecting to the database');
    process.exit(1);
  }
}
