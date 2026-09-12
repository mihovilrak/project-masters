const { Pool } = require('pg');
const pino = require('pino');

const createLogger = (env = process.env) =>
  pino({
    level: env.LOG_LEVEL || 'info',
    redact: {
      paths: [
        'password',
        '*.password',
        '*.pass',
        'auth.pass',
        '*.auth.pass',
        'config.email.auth.pass',
        'EMAIL_PASSWORD',
        '*.EMAIL_PASSWORD',
        'POSTGRES_PASSWORD',
        '*.POSTGRES_PASSWORD',
        'SESSION_SECRET',
        '*.SESSION_SECRET',
      ],
      censor: '[redacted]',
    },
  });

const readDatabaseConfig = (env = process.env, options = {}) => {
  const test = options.preferTest && env.TEST_DB_HOST;
  const value = (postgresName, testName, fallback) => {
    const testValue = test ? env[`TEST_DB_${testName}`] : undefined;
    return testValue || env[`POSTGRES_${postgresName}`] || fallback;
  };

  return {
    host: value('HOST', 'HOST', options.host),
    port: Number(value('PORT', 'PORT', options.port || 5432)),
    user: value('USER', 'USER', options.user),
    password: value('PASSWORD', 'PASSWORD', options.password),
    database: value('DB', 'NAME', options.database),
  };
};

const createPool = (database, logger, overrides = {}) => {
  const pool = new Pool({
    ...database,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ...overrides,
  });
  pool.on('error', (err) => {
    logger.error({ err }, 'Unexpected error on idle client');
  });
  return pool;
};

module.exports = {
  createLogger,
  createPool,
  readDatabaseConfig,
};
