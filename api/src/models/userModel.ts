import { Pool, QueryResult } from 'pg';
import {
  User,
  UserQueryFilters,
  UserUpdateInput,
  UserStatus,
} from '../types/user';
import { invalidatePermissionCache } from './permissionModel';

// Get user statuses
export const getUserStatuses = async (pool: Pool): Promise<UserStatus[]> => {
  const result: QueryResult<UserStatus> = await pool.query(
    'SELECT id, name, color FROM user_statuses ORDER BY id',
  );
  return result.rows;
};

const ALLOWED_USER_WHERE_KEYS = ['status_id', 'role_id'] as const;

// Get all users
export const getUsers = async (
  pool: Pool,
  filters?: UserQueryFilters,
): Promise<User[]> => {
  let status_id: number | null = null;
  let role_id: number | null = null;
  const includeDeleted = Boolean(filters?.includeDeleted);

  if (filters?.whereParams && Object.keys(filters.whereParams).length > 0) {
    const allowedEntries = Object.entries(filters.whereParams).filter(([key]) =>
      ALLOWED_USER_WHERE_KEYS.includes(
        key as (typeof ALLOWED_USER_WHERE_KEYS)[number],
      ),
    );
    for (const [key, value] of allowedEntries) {
      if (key === 'status_id') status_id = Number(value);
      if (key === 'role_id') role_id = Number(value);
    }
  }

  const result = await pool.query('SELECT * FROM get_users($1, $2, $3)', [
    status_id,
    role_id,
    includeDeleted,
  ]);
  return result.rows;
};

// Get a user by ID
export const getUserById = async (
  pool: Pool,
  id: string,
): Promise<User | null> => {
  const result = await pool.query('SELECT * FROM get_users(p_id => $1)', [id]);
  return result.rows[0] || null;
};

// Create a user
export const createUser = async (
  pool: Pool,
  login: string,
  name: string,
  surname: string,
  email: string,
  password: string,
  role_id: number,
): Promise<User> => {
  const result = await pool.query(
    `INSERT INTO users
    (login, name, surname, email, password, role_id)
    VALUES ($1, $2, $3, $4, crypt($5, gen_salt('bf', 12)), $6)
    RETURNING id, login, name, surname, email, status_id, role_id, created_on, updated_on`,
    [login, name, surname, email, password, role_id],
  );
  return result.rows[0];
};

// Update a user
export const updateUser = async (
  pool: Pool,
  updates: UserUpdateInput | Record<string, unknown>,
  id: string,
): Promise<User | null> => {
  const columns = Object.keys(updates).filter((k) =>
    [
      'login',
      'name',
      'surname',
      'email',
      'password',
      'role_id',
      'status_id',
    ].includes(k),
  ) as Array<keyof UserUpdateInput>;
  if (columns.length === 0) {
    return getUserById(pool, id);
  }
  const values: unknown[] = [];
  const setExpressions = columns.map((column, index) => {
    if (column === 'password') {
      values.push((updates as UserUpdateInput)[column]);
      return `password = crypt($${index + 1}, gen_salt('bf', 12))`;
    } else {
      values.push((updates as UserUpdateInput)[column]);
      return `${column} = $${index + 1}`;
    }
  });

  const query = `UPDATE users SET ${setExpressions.join(', ')} WHERE id = $${columns.length + 1}`;

  values.push(id);

  const result = await pool.query(query, values);

  if (result.rowCount && result.rowCount > 0) {
    if (columns.includes('role_id') || columns.includes('status_id')) {
      invalidatePermissionCache(pool, id);
    }
    return getUserById(pool, id);
  }
  return null;
};

// Change user status
export const changeUserStatus = async (
  pool: Pool,
  id: string,
  status: number,
): Promise<User | null> => {
  const result = await pool.query(
    `UPDATE users
    SET (status_id, updated_on) = ($1, CURRENT_TIMESTAMP)
    WHERE id = $2
    RETURNING id, login, name, surname, email, status_id, role_id, created_on, updated_on`,
    [status, id],
  );
  if (result.rows[0]) invalidatePermissionCache(pool, id);
  return result.rows[0] || null;
};

// Delete a user
export const deleteUser = async (
  pool: Pool,
  id: string,
): Promise<User | null> => {
  const result = await pool.query(
    `UPDATE users
    SET (status_id, updated_on) = (user_status_id('deleted'), CURRENT_TIMESTAMP)
    WHERE id = $1
    RETURNING id, login, name, surname, email, status_id, role_id, created_on, updated_on`,
    [id],
  );
  if (result.rows[0]) invalidatePermissionCache(pool, id);
  return result.rows[0] || null;
};
