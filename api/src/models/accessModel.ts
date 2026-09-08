import { Pool } from 'pg';
import { hasPermission } from './permissionModel';

const MEMBERSHIP_PREDICATE = `(pu.user_id IS NOT NULL OR p.created_by = $2)`;

export const isProjectMember = async (
  pool: Pool,
  projectId: string,
  userId: string,
): Promise<boolean> => {
  const result = await pool.query(
    `SELECT 1
    FROM projects p
    LEFT JOIN project_users pu ON pu.project_id = p.id AND pu.user_id = $2
    WHERE p.id = $1 AND ${MEMBERSHIP_PREDICATE}
    LIMIT 1`,
    [projectId, userId],
  );
  return (result.rowCount ?? 0) > 0;
};

// Is the user a member of the project the task belongs to?
export const isTaskProjectMember = async (
  pool: Pool,
  taskId: string,
  userId: string,
): Promise<boolean> => {
  const result = await pool.query(
    `SELECT 1
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    LEFT JOIN project_users pu ON pu.project_id = p.id AND pu.user_id = $2
    WHERE t.id = $1 AND ${MEMBERSHIP_PREDICATE}
    LIMIT 1`,
    [taskId, userId],
  );
  return (result.rowCount ?? 0) > 0;
};

// Every project id the user may see. Embed this in a list query instead of
// fetching the ids first and filtering in JS: post-filtering a paged result
// silently returns short pages.
export const accessibleProjectsSubquery = (userIdIndex: number): string =>
  `SELECT DISTINCT ap.id
    FROM projects ap
    LEFT JOIN project_users apu ON apu.project_id = ap.id AND apu.user_id = $${userIdIndex}
    WHERE apu.user_id IS NOT NULL OR ap.created_by = $${userIdIndex}`;

export const getAccessibleProjectIds = async (
  pool: Pool,
  userId: string,
): Promise<number[]> => {
  const result = await pool.query<{ id: number }>(
    accessibleProjectsSubquery(1),
    [userId],
  );
  return result.rows.map((row) => Number(row.id));
};

// The user id a list query must scope to, or null when the user is an
// administrator and sees everything.
export const resolveProjectScope = async (
  pool: Pool,
  userId: string,
): Promise<string | null> =>
  (await hasPermission(pool, userId, 'Admin')) ? null : userId;

// Drop rows belonging to projects the user cannot reach. Administrators keep
// the full result set.
export const filterByProjectAccess = async <T extends object>(
  pool: Pool,
  userId: string,
  rows: T[],
  projectIdKey: keyof T,
): Promise<T[]> => {
  if (rows.length === 0) return rows;
  if (await hasPermission(pool, userId, 'Admin')) return rows;
  const accessible = new Set(await getAccessibleProjectIds(pool, userId));
  return rows.filter((row) => accessible.has(Number(row[projectIdKey])));
};

// A comment may only be edited or removed by its author
export const isCommentAuthor = async (
  pool: Pool,
  commentId: string,
  userId: string,
): Promise<boolean> => {
  const result = await pool.query(
    `SELECT 1 FROM comments WHERE id = $1 AND user_id = $2 LIMIT 1`,
    [commentId, userId],
  );
  return (result.rowCount ?? 0) > 0;
};

// A time log may only be edited or removed by the user who logged it
export const isTimeLogOwner = async (
  pool: Pool,
  timeLogId: string,
  userId: string,
): Promise<boolean> => {
  const result = await pool.query(
    `SELECT 1 FROM time_logs WHERE id = $1 AND user_id = $2 LIMIT 1`,
    [timeLogId, userId],
  );
  return (result.rowCount ?? 0) > 0;
};
