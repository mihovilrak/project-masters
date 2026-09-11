import path from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import logger from '../../../utils/logger';

// Force load .env.test so the app (when imported by tests) uses the test DB
dotenv.config({ path: path.join(process.cwd(), '.env.test') });

// Integration test database pool
export let testPool: Pool;

// Check if integration tests should run
const shouldRunIntegration = () => {
  return (
    process.env.TEST_DB_HOST &&
    process.env.TEST_DB_PASSWORD &&
    process.env.SKIP_INTEGRATION_TESTS !== 'true'
  );
};

beforeAll(async () => {
  if (!shouldRunIntegration()) {
    throw new Error(
      'Integration tests require TEST_DB_HOST and TEST_DB_PASSWORD. ' +
        'Set these env vars (e.g. in CI) or do not run the integration test suite.',
    );
  }

  // The app under test connects as TEST_DB_USER (the non-superuser app role).
  // Seeding and TRUNCATE need the owner, so the fixture pool can use another role.
  testPool = new Pool({
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    database: process.env.TEST_DB_NAME || 'pm_test',
    user:
      process.env.TEST_DB_ADMIN_USER || process.env.TEST_DB_USER || 'pm_user',
    password: process.env.TEST_DB_ADMIN_PASSWORD || process.env.TEST_DB_PASSWORD,
  });

  // Test connection
  try {
    await testPool.query('SELECT 1');
    logger.info('Integration test database connected');
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect to test database');
    throw error;
  }
});

afterAll(async () => {
  if (testPool) {
    await testPool.end();
  }
});

// Supertest Cookie header expects a string; set-cookie from response is an array
export const cookieHeader = (
  setCookie: string[] | string | undefined,
): string => {
  if (!setCookie) return '';
  const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
  return arr.map((c) => String(c).split(';')[0].trim()).join('; ');
};

const TEST_TABLES = [
  'comments',
  'files',
  'notifications',
  'projects',
  'project_users',
  'session',
  'task_tags',
  'tasks',
  'time_logs',
  'users',
  'watchers',
] as const;

type TestTable = (typeof TEST_TABLES)[number];
const testTableSet = new Set<string>(TEST_TABLES);

export const cleanupTables = async (tables: readonly TestTable[]) => {
  if (!testPool || tables.length === 0) return;

  for (const table of tables) {
    if (!testTableSet.has(table)) {
      throw new Error(`Unsupported integration-test table: ${table}`);
    }
  }

  const identifiers = tables.map((table) => `"${table}"`).join(', ');
  await testPool.query(`TRUNCATE TABLE ${identifiers} CASCADE`);
};

export const seedTestUser = async () => {
  if (!testPool) return null;

  const result = await testPool.query(`
    INSERT INTO users (login, email, password, name, surname, role_id, status_id)
    VALUES ('testuser', 'test@example.com', crypt(
      'password123',
      gen_salt('bf', 12)
    ), 'Test', 'User', 2, 1)
    ON CONFLICT (login) DO UPDATE SET
      password = EXCLUDED.password,
      updated_on = CURRENT_TIMESTAMP
    RETURNING *
  `);
  return result.rows[0];
};

export const seedLowPrivilegeUser = async () => {
  if (!testPool) return null;

  const result = await testPool.query(`
    INSERT INTO users (login, email, password, name, surname, role_id, status_id)
    VALUES ('limiteduser', 'limited@example.com', crypt(
      'password123',
      gen_salt('bf', 12)
    ), 'Limited', 'User', (SELECT id FROM roles WHERE name = 'Developer'), 1)
    ON CONFLICT (login) DO UPDATE SET
      password = EXCLUDED.password,
      role_id = EXCLUDED.role_id,
      updated_on = CURRENT_TIMESTAMP
    RETURNING *
  `);
  return result.rows[0];
};

export const seedTestProject = async (userId: number) => {
  if (!testPool) return null;

  const result = await testPool.query(
    `
    INSERT INTO projects
    (name, description, start_date, due_date, created_by, status_id)
    VALUES
    ('Test Project', 'Test project description', CURRENT_DATE,
     CURRENT_DATE + INTERVAL '30 days', $1, 1)
    RETURNING *
  `,
    [userId],
  );
  return result.rows[0];
};

export const seedTestTask = async (projectId: number, userId: number) => {
  if (!testPool) return null;

  const result = await testPool.query(
    `
    SELECT * FROM create_task(
      'Test Task',
      'Test task description',
      8::numeric,
      CURRENT_DATE,
      (CURRENT_DATE + INTERVAL '7 days')::date,
      2::smallint,
      1::smallint,
      1::smallint,
      NULL::integer,
      $1,
      $2,
      $2,
      $2,
      ARRAY[]::smallint[],
      ARRAY[$2]::integer[]
    )
  `,
    [projectId, userId],
  );
  return result.rows[0];
};
