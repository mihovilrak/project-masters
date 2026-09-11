import { Pool, PoolClient } from 'pg';

// Same role the API connects as; testPool is the owner.
export const appPool = new Pool({
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
  database: process.env.TEST_DB_NAME || 'pm_test',
  user: process.env.TEST_DB_USER || 'pm_app',
  password: process.env.TEST_DB_PASSWORD,
});

afterAll(async () => {
  await appPool.end();
});

export const inRollback = async <T>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('begin');
    return await fn(client);
  } finally {
    await client.query('rollback');
    client.release();
  }
};

export const expectPgError = async (
  promise: Promise<unknown>,
  code: string,
) => {
  await expect(promise).rejects.toMatchObject({ code });
};

// A failed statement aborts the transaction, so run it behind a savepoint.
export const expectPgErrorIn = async (
  client: PoolClient,
  sql: string,
  code: string,
  params: unknown[] = [],
) => {
  await client.query('savepoint expect_error');
  await expectPgError(client.query(sql, params), code);
  await client.query('rollback to savepoint expect_error');
};

let seq = 0;
const unique = () => `${Date.now()}_${++seq}`;

export type Row = Record<string, any>;

export const insertUser = async (
  client: PoolClient,
  overrides: {
    role?: string;
    status_id?: number;
    name?: string;
    surname?: string;
  } = {},
): Promise<Row> => {
  const tag = unique();
  const { rows } = await client.query(
    `insert into users (login, email, password, name, surname, role_id, status_id)
     values ($1, $2, 'x', $3, $4, (select id from roles where name = $5), $6)
     returning *`,
    [
      `u_${tag}`,
      `u_${tag}@example.com`,
      overrides.name ?? 'Test',
      overrides.surname ?? `User ${tag}`,
      overrides.role ?? 'Developer',
      overrides.status_id ?? 1,
    ],
  );
  return rows[0];
};

export const insertProject = async (
  client: PoolClient,
  createdBy: number,
  overrides: { name?: string; status_id?: number; parent_id?: number } = {},
): Promise<Row> => {
  const { rows } = await client.query(
    `insert into projects (name, start_date, due_date, created_by, status_id, parent_id)
     values ($1, current_date, current_date + 30, $2, $3, $4)
     returning *`,
    [
      overrides.name ?? `Project ${unique()}`,
      createdBy,
      overrides.status_id ?? 1,
      overrides.parent_id ?? null,
    ],
  );
  return rows[0];
};

export const insertTask = async (
  client: PoolClient,
  projectId: number,
  createdBy: number,
  overrides: {
    name?: string;
    assignee_id?: number | null;
    holder_id?: number | null;
    parent_id?: number | null;
    status_id?: number;
    priority_id?: number;
    type_id?: number;
    start_date?: string;
    due_date?: string;
    estimated_time?: number | null;
  } = {},
): Promise<Row> => {
  const { rows } = await client.query(
    `insert into tasks (name, project_id, created_by, holder_id, assignee_id,
       parent_id, status_id, priority_id, type_id, start_date, due_date,
       estimated_time)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9,
       coalesce($10::date, current_date),
       coalesce($11::date, current_date + 7), $12)
     returning *`,
    [
      overrides.name ?? `Task ${unique()}`,
      projectId,
      createdBy,
      overrides.holder_id ?? createdBy,
      overrides.assignee_id ?? null,
      overrides.parent_id ?? null,
      overrides.status_id ?? 1,
      overrides.priority_id ?? 2,
      overrides.type_id ?? 1,
      overrides.start_date ?? null,
      overrides.due_date ?? null,
      overrides.estimated_time ?? null,
    ],
  );
  return rows[0];
};

export const insertTimeLog = async (
  client: PoolClient,
  taskId: number,
  userId: number,
  spentTime: number,
): Promise<Row> => {
  const { rows } = await client.query(
    `insert into time_logs (task_id, user_id, log_date, spent_time, description,
       activity_type_id)
     values ($1, $2, current_date, $3, 'Test log',
       (select min(id) from activity_types))
     returning *`,
    [taskId, userId, spentTime],
  );
  return rows[0];
};
