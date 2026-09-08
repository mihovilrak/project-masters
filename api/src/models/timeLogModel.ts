import { Pool } from 'pg';
import {
  TimeLog,
  TimeLogCreateInput,
  TimeLogUpdateInput,
  TimeLogQueryFilters,
  SpentTime,
} from '../types/timeLog';
import { buildUpdateAssignments } from '../utils/sqlUpdate';
import {
  Pagination,
  defaultPagination,
  paginationClause,
} from '../utils/pagination';

export const ALLOWED_TIME_LOG_UPDATE_KEYS = [
  'log_date',
  'spent_time',
  'description',
  'activity_type_id',
] as const;

// get_time_logs only filters by task / user / project, so the rest of
// TimeLogQueryFilters is applied to its result set. Positional args are always
// $1-$3 so the filter placeholders keep the same numbers at every call site.
const FILTERED_TIME_LOGS = `SELECT * FROM get_time_logs($1, $2, $3)
  WHERE ($4::date IS NULL OR log_date >= $4::date)
  AND ($5::date IS NULL OR log_date <= $5::date)
  AND ($6::smallint IS NULL OR activity_type_id = $6::smallint)
  ORDER BY created_on DESC`;

// Query strings arrive as '' when a filter input is cleared; that is "no
// filter", not an empty date.
const orNull = <T>(value: T | undefined | null): T | null =>
  value === undefined || value === null || (value as unknown) === ''
    ? null
    : value;

const filterValues = (
  params?: TimeLogQueryFilters,
): (Date | number | null)[] => [
  orNull(params?.startDate),
  orNull(params?.endDate),
  orNull(params?.activity_type_id),
];

// Time log model
export const getAllTimeLogs = async (
  pool: Pool,
  pagination: Pagination = defaultPagination(),
): Promise<TimeLog[]> => {
  const page = paginationClause(pagination, 1);
  const result = await pool.query(
    `SELECT * FROM get_time_logs(null, null, null)
     ORDER BY log_date DESC, id DESC
     ${page.clause}`,
    page.values,
  );
  return result.rows;
};

// Create time log
export const createTimeLog = async (
  pool: Pool,
  taskId: string,
  userId: string,
  timeLogData: TimeLogCreateInput,
): Promise<TimeLog> => {
  const { log_date, spent_time, description, activity_type_id } = timeLogData;
  const result = await pool.query(
    `INSERT INTO time_logs
    (task_id, user_id, log_date, spent_time, description, activity_type_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [taskId, userId, log_date, spent_time, description, activity_type_id],
  );
  return result.rows[0];
};

// Update time log
export const updateTimeLog = async (
  pool: Pool,
  timeLogId: string,
  timeLogData: TimeLogUpdateInput,
): Promise<TimeLog | null> => {
  const assignments = buildUpdateAssignments(
    timeLogData as Record<string, unknown>,
    ALLOWED_TIME_LOG_UPDATE_KEYS,
  );
  if (!assignments) {
    const current = await pool.query('SELECT * FROM time_logs WHERE id = $1', [
      timeLogId,
    ]);
    return current.rows[0] || null;
  }

  const result = await pool.query(
    `UPDATE time_logs
    SET ${assignments.setClause}, updated_on = CURRENT_TIMESTAMP
    WHERE id = $${assignments.nextIndex}
    RETURNING *`,
    [...assignments.values, timeLogId],
  );
  return result.rows[0] || null;
};

// Delete time log
export const deleteTimeLog = async (
  pool: Pool,
  timeLogId: string,
): Promise<void> => {
  await pool.query('DELETE FROM time_logs WHERE id = $1', [timeLogId]);
};

// Get user time logs
export const getUserTimeLogs = async (
  pool: Pool,
  userId: string,
  params: TimeLogQueryFilters,
): Promise<TimeLog[]> => {
  const result = await pool.query(FILTERED_TIME_LOGS, [
    null,
    userId,
    null,
    ...filterValues(params),
  ]);
  return result.rows;
};

// Get project time logs
export const getProjectTimeLogs = async (
  pool: Pool,
  projectId: string,
  params: TimeLogQueryFilters,
): Promise<TimeLog[]> => {
  const result = await pool.query(FILTERED_TIME_LOGS, [
    null,
    null,
    projectId,
    ...filterValues(params),
  ]);
  return result.rows;
};

// Get project spent time
export const getProjectSpentTime = async (
  pool: Pool,
  projectId: string,
): Promise<SpentTime> => {
  const result = await pool.query('SELECT * FROM get_project_spent_time($1)', [
    projectId,
  ]);
  return result.rows[0];
};

// Get task time logs
export const getTaskTimeLogs = async (
  pool: Pool,
  taskId: string,
  params?: TimeLogQueryFilters,
): Promise<TimeLog[]> => {
  const result = await pool.query(FILTERED_TIME_LOGS, [
    taskId,
    null,
    null,
    ...filterValues(params),
  ]);
  return result.rows;
};

// Get task spent time
export const getTaskSpentTime = async (
  pool: Pool,
  taskId: string,
): Promise<SpentTime> => {
  const result = await pool.query('SELECT * FROM get_task_spent_time($1)', [
    taskId,
  ]);
  return result.rows[0];
};
