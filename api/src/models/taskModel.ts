import {
  Task,
  TaskDetails,
  TaskStatus,
  TaskPriority,
  TaskCreateInput,
  TaskUpdateInput,
  TaskQueryFilters,
} from '../types/task';
import { Pool, QueryResult } from 'pg';
import { Queryable } from '../utils/transaction';
import { buildUpdateAssignments } from '../utils/sqlUpdate';
import { accessibleProjectsSubquery } from './accessModel';
import {
  Pagination,
  defaultPagination,
  paginationClause,
} from '../utils/pagination';

/**
 * WHERE clause restricting tasks to the projects `scopeUserId` may see, using
 * the placeholder at `index`. Empty string for an unscoped (administrator) read.
 */
const accessFilter = (
  scopeUserId: string | null | undefined,
  index: number,
): string =>
  scopeUserId == null
    ? ''
    : `WHERE project_id IN (${accessibleProjectsSubquery(index)})`;

/** Normalize number | number[] into the array form get_tasks takes. */
function toArray(val: number | number[] | null | undefined): number[] | null {
  if (val == null) return null;
  if (Array.isArray(val)) return val.length > 0 ? val : null;
  return [val];
}

// Get all tasks (get_tasks params include date ranges and created_by)
export const getTasks = async (
  pool: Pool,
  filters?: TaskQueryFilters,
  pagination: Pagination = defaultPagination(),
  scopeUserId?: string | null,
): Promise<TaskDetails[]> => {
  const whereParams = filters?.whereParams ?? {};
  const id = filters?.id ?? whereParams.id ?? null;
  const project_id = filters?.project_id ?? whereParams.project_id ?? null;
  const assignee_id = filters?.assignee_id ?? whereParams.assignee_id ?? null;
  const holder_id = filters?.holder_id ?? whereParams.holder_id ?? null;
  const status_id = filters?.status_id ?? whereParams.status_id ?? null;
  const priority_id = filters?.priority_id ?? whereParams.priority_id ?? null;
  const type_id = filters?.type_id ?? whereParams.type_id ?? null;
  const parent_id = filters?.parent_id ?? whereParams.parent_id ?? null;
  const created_by = filters?.created_by ?? whereParams.created_by ?? null;
  const due_date_from =
    filters?.due_date_from ?? whereParams.due_date_from ?? null;
  const due_date_to = filters?.due_date_to ?? whereParams.due_date_to ?? null;
  const start_date_from =
    filters?.start_date_from ?? whereParams.start_date_from ?? null;
  const start_date_to =
    filters?.start_date_to ?? whereParams.start_date_to ?? null;
  const created_from =
    filters?.created_from ?? whereParams.created_from ?? null;
  const created_to = filters?.created_to ?? whereParams.created_to ?? null;
  const estimated_time_min =
    filters?.estimated_time_min ?? whereParams.estimated_time_min ?? null;
  const estimated_time_max =
    filters?.estimated_time_max ?? whereParams.estimated_time_max ?? null;
  const inactive_statuses_only = Boolean(
    filters?.inactive_statuses_only ?? whereParams.inactive_statuses_only,
  );
  const hasFilter = (v: unknown) =>
    v != null && (typeof v !== 'object' || (Array.isArray(v) && v.length > 0));
  const hasFilters =
    filters != null &&
    [
      id,
      project_id,
      assignee_id,
      holder_id,
      status_id,
      priority_id,
      type_id,
      parent_id,
      created_by,
      due_date_from,
      due_date_to,
      start_date_from,
      start_date_to,
      created_from,
      created_to,
      estimated_time_min,
      estimated_time_max,
      inactive_statuses_only,
    ].some(hasFilter);
  const explicit_active_only = Boolean(
    filters?.active_statuses_only ?? whereParams.active_statuses_only,
  );
  const active_statuses_only =
    explicit_active_only || (!hasFilters && !inactive_statuses_only);

  // Only the filters that are set are passed, by name.
  const args = (
    [
      ['p_id', id],
      ['p_parent_id', parent_id],
      ['p_project_ids', toArray(project_id as number | number[] | null)],
      ['p_assignee_ids', toArray(assignee_id as number | number[] | null)],
      ['p_holder_ids', toArray(holder_id as number | number[] | null)],
      ['p_status_ids', toArray(status_id as number | number[] | null)],
      ['p_priority_ids', toArray(priority_id as number | number[] | null)],
      ['p_type_ids', toArray(type_id as number | number[] | null)],
      ['p_created_by_ids', toArray(created_by as number | number[] | null)],
      ['p_active_statuses_only', active_statuses_only || null],
      ['p_inactive_statuses_only', inactive_statuses_only || null],
      ['p_due_date_from', due_date_from],
      ['p_due_date_to', due_date_to],
      ['p_start_date_from', start_date_from],
      ['p_start_date_to', start_date_to],
      ['p_created_from', created_from],
      ['p_created_to', created_to],
      ['p_estimated_time_min', estimated_time_min],
      ['p_estimated_time_max', estimated_time_max],
    ] as [string, unknown][]
  ).filter(([, value]) => value != null);

  const scoped = scopeUserId != null;
  const where = accessFilter(scopeUserId, args.length + 1);
  const page = paginationClause(pagination, args.length + (scoped ? 2 : 1));
  const result: QueryResult<TaskDetails> = await pool.query(
    `SELECT * FROM get_tasks(${args.map(([name], i) => `${name} => $${i + 1}`).join(', ')})
     ${where}
     ORDER BY id
     ${page.clause}`,
    [
      ...args.map(([, value]) => value),
      ...(scoped ? [scopeUserId] : []),
      ...page.values,
    ],
  );
  return result.rows;
};

// Get a task by ID
export const getTaskById = async (
  pool: Pool,
  id: string,
): Promise<TaskDetails | null> => {
  const result: QueryResult<TaskDetails> = await pool.query(
    'SELECT * FROM get_tasks(p_id => $1)',
    [id],
  );
  return result.rows[0] || null;
};

// Create a task
export const createTask = async (
  pool: Queryable,
  {
    name,
    description,
    estimated_time,
    start_date,
    due_date,
    priority_id,
    status_id,
    type_id,
    parent_id,
    project_id,
    holder_id,
    assignee_id,
    created_by,
    tag_ids,
  }: TaskCreateInput,
  watchers: number[],
): Promise<{ task_id: number }> => {
  const result = await pool.query<{ task_id: number }>(
    `SELECT * FROM create_task (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15
    )`,
    [
      name,
      description,
      estimated_time,
      start_date,
      due_date,
      priority_id,
      status_id,
      type_id,
      parent_id ?? null,
      project_id,
      holder_id ?? null,
      assignee_id ?? null,
      created_by,
      tag_ids,
      watchers,
    ],
  );

  if (!result.rows[0]) {
    throw new Error('Task creation failed - no task ID returned');
  }

  return result.rows[0];
};

export const ALLOWED_TASK_UPDATE_KEYS = [
  'name',
  'project_id',
  'holder_id',
  'assignee_id',
  'description',
  'estimated_time',
  'status_id',
  'type_id',
  'priority_id',
  'start_date',
  'due_date',
  'end_date',
  'progress',
] as const;

// Update a task
export const updateTask = async (
  pool: Queryable,
  taskId: string,
  taskData: TaskUpdateInput,
): Promise<Task | null> => {
  const assignments = buildUpdateAssignments(
    taskData as Record<string, unknown>,
    ALLOWED_TASK_UPDATE_KEYS,
  );
  if (!assignments) {
    return null;
  }

  const result: QueryResult<Task> = await pool.query(
    `UPDATE tasks
     SET ${assignments.setClause}
     WHERE id = $${assignments.nextIndex}
     RETURNING *`,
    [...assignments.values, taskId],
  );

  return result.rows[0] || null;
};

// Change a task status
export const changeTaskStatus = async (
  pool: Queryable,
  id: number,
  statusId: number,
): Promise<Task | null> => {
  const result: QueryResult<Task> = await pool.query(
    `UPDATE tasks
    SET (status_id, updated_on) = ($1, CURRENT_TIMESTAMP)
    WHERE id = $2
    RETURNING *`,
    [statusId, id],
  );
  return result.rows[0] || null;
};

// Delete a task
export const deleteTask = async (
  pool: Pool,
  id: string,
): Promise<Task | null> => {
  const result: QueryResult<Task> = await pool.query(
    `UPDATE tasks
    SET (status_id, updated_on) = (task_status_id('deleted'), CURRENT_TIMESTAMP)
    WHERE id = $1
    RETURNING *`,
    [id],
  );
  return result.rows[0] || null;
};

// Get task statuses
export const getTaskStatuses = async (pool: Pool): Promise<TaskStatus[]> => {
  const result: QueryResult<TaskStatus> = await pool.query(
    `SELECT id, name, color
    FROM task_statuses`,
  );
  return result.rows;
};

// Get priorities
export const getPriorities = async (pool: Pool): Promise<TaskPriority[]> => {
  const result: QueryResult<TaskPriority> = await pool.query(
    `SELECT id, name, color
    FROM priorities`,
  );
  return result.rows;
};

// Get active tasks (assignee_id + active statuses only)
export const getActiveTasks = async (
  pool: Pool,
  userId: string,
): Promise<TaskDetails[]> => {
  const result: QueryResult<TaskDetails> = await pool.query(
    'SELECT * FROM get_tasks(p_assignee_ids => ARRAY[$1::int], p_active_statuses_only => true)',
    [userId],
  );
  return result.rows;
};

// Get tasks by project
export const getTasksByProject = async (
  pool: Pool,
  project_id: string,
  pagination: Pagination = defaultPagination(),
  scopeUserId?: string | null,
): Promise<TaskDetails[]> => {
  const scoped = scopeUserId != null;
  const where = accessFilter(scopeUserId, 2);
  const page = paginationClause(pagination, scoped ? 3 : 2);
  const result: QueryResult<TaskDetails> = await pool.query(
    `SELECT * FROM get_tasks(p_project_ids => ARRAY[$1::int])
     ${where}
     ORDER BY created_on DESC, id DESC
     ${page.clause}`,
    [project_id, ...(scoped ? [scopeUserId] : []), ...page.values],
  );
  return result.rows;
};

// Get tasks whose start/due window overlaps a date range (calendar view).
// Tasks with neither date set are excluded - they have nowhere to sit on a calendar.
export const getTasksByDateRange = async (
  pool: Pool,
  startDate: string,
  endDate: string,
  scopeUserId?: string | null,
): Promise<TaskDetails[]> => {
  const scoped = scopeUserId != null;
  const conditions = [
    'coalesce(start_date, due_date) <= $2::date',
    'coalesce(due_date, start_date) >= $1::date',
  ];
  if (scoped) {
    conditions.push(`project_id IN (${accessibleProjectsSubquery(3)})`);
  }
  const result: QueryResult<TaskDetails> = await pool.query(
    `SELECT * FROM get_tasks()
     WHERE ${conditions.join(' AND ')}
     ORDER BY start_date NULLS LAST, id`,
    [startDate, endDate, ...(scoped ? [scopeUserId] : [])],
  );
  return result.rows;
};

// Get subtasks
export const getSubtasks = async (
  pool: Pool,
  parentId: string,
): Promise<TaskDetails[]> => {
  const result: QueryResult<TaskDetails> = await pool.query(
    `SELECT * FROM get_tasks(p_parent_id => $1)
     ORDER BY created_on ASC`,
    [parentId],
  );
  return result.rows;
};
