import {
  Project,
  ProjectDetails,
  ProjectMember,
  ProjectStatus,
  ProjectTaskFilters,
  ProjectFilters,
  ProjectTask,
} from '../types/project';
import { Pool, QueryResult } from 'pg';
import { Queryable } from '../utils/transaction';
import { buildUpdateAssignments } from '../utils/sqlUpdate';
import { accessibleProjectsSubquery } from './accessModel';
import {
  Pagination,
  defaultPagination,
  paginationClause,
} from '../utils/pagination';

// Get all projects (with status_name, created_by_name, estimated_time, spent_time, progress from project_details)
export const getProjects = async (
  pool: Pool,
  filters: ProjectFilters = {},
  pagination: Pagination = defaultPagination(),
  scopeUserId?: string | null,
): Promise<Project[]> => {
  const values: unknown[] = [];
  const conditions: string[] = [];

  const addCondition = (sql: string, value: unknown) => {
    if (value === undefined) return;
    values.push(value);
    conditions.push(`${sql} $${values.length}`);
  };

  addCondition('p.status_id =', filters.statusId);
  addCondition('p.created_by =', filters.createdBy);
  addCondition('p.parent_id =', filters.parentId);
  addCondition('p.start_date >=', filters.startDateFrom);
  addCondition('p.start_date <=', filters.startDateTo);
  addCondition('p.due_date >=', filters.dueDateFrom);
  addCondition('p.due_date <=', filters.dueDateTo);

  if (scopeUserId != null) {
    values.push(scopeUserId);
    conditions.push(`p.id IN (${accessibleProjectsSubquery(values.length)})`);
  }

  const whereClause =
    conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
  const page = paginationClause(pagination, values.length + 1);
  const query = `SELECT p.id, p.name, p.description, p.start_date, p.end_date, p.due_date, p.parent_id, p.status_id, p.created_by, p.created_on, p.updated_on,
    pd.status_name, pd.created_by_name, pd.estimated_time, pd.spent_time, pd.progress
FROM projects p
LEFT JOIN LATERAL (SELECT status_name, created_by_name, estimated_time, spent_time, progress FROM project_details(p.id)) pd ON true${whereClause}
ORDER BY p.id
${page.clause}`;

  const result: QueryResult<Project> = await pool.query(query, [
    ...values,
    ...page.values,
  ]);
  return result.rows;
};

// Get a project by ID
export const getProjectById = async (
  pool: Pool,
  id: string,
): Promise<Project | null> => {
  const result: QueryResult<Project> = await pool.query(
    `SELECT * FROM projects
    WHERE id = $1`,
    [id],
  );
  return result.rows[0] || null;
};

// Get project details
export const getProjectDetails = async (
  pool: Pool,
  id: string,
): Promise<ProjectDetails | null> => {
  const result: QueryResult<ProjectDetails> = await pool.query(
    `SELECT * FROM project_details($1)`,
    [id],
  );
  return result.rows[0] || null;
};

// Create a new project
export const createProject = async (
  pool: Pool,
  name: string,
  description: string,
  start_date: Date | null,
  due_date: Date | null,
  created_by: string,
  parent_id?: string,
): Promise<Project> => {
  const result: QueryResult<Project> = await pool.query(
    `INSERT INTO projects
    (name, description, start_date, due_date, created_by, parent_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [name, description, start_date, due_date, created_by, parent_id],
  );
  return result.rows[0];
};

// Change a project status. The function returns a message row, or no row at all
// when the project does not exist.
export const changeProjectStatus = async (
  pool: Pool,
  id: string,
  statusId: number,
): Promise<{ message: string } | null> => {
  const result: QueryResult<{ message: string }> = await pool.query(
    `SELECT * FROM change_project_status($1, $2)`,
    [id, statusId],
  );
  return result.rows[0] || null;
};

export const ALLOWED_PROJECT_UPDATE_KEYS = [
  'name',
  'description',
  'start_date',
  'due_date',
  'parent_id',
  'status_id',
] as const;

// Update a project
export const updateProject = async (
  pool: Pool,
  updates: Partial<Project>,
  id: string,
): Promise<number | null> => {
  const assignments = buildUpdateAssignments(
    updates as Record<string, unknown>,
    ALLOWED_PROJECT_UPDATE_KEYS,
  );
  if (!assignments) {
    return null;
  }

  const result: QueryResult = await pool.query(
    `UPDATE projects
    SET ${assignments.setClause}
    WHERE id = $${assignments.nextIndex}`,
    [...assignments.values, id],
  );
  return result.rowCount;
};

// Delete a project
export const deleteProject = async (
  pool: Pool,
  id: string,
): Promise<Project | null> => {
  const result: QueryResult<Project> = await pool.query(
    `SELECT * FROM delete_project($1)`,
    [id],
  );
  return result.rows[0] || null;
};

// Get project members
export const getProjectMembers = async (
  pool: Pool,
  projectId: string,
  pagination: Pagination = defaultPagination(),
): Promise<ProjectMember[]> => {
  const page = paginationClause(pagination, 2);
  const result: QueryResult<ProjectMember> = await pool.query(
    `SELECT * FROM get_project_members($1)
     ORDER BY user_id
     ${page.clause}`,
    [projectId, ...page.values],
  );
  return result.rows;
};

// Get subprojects
export const getSubprojects = async (
  pool: Pool,
  parentId: string,
  pagination: Pagination = defaultPagination(),
): Promise<Project[]> => {
  const page = paginationClause(pagination, 2);
  const result: QueryResult<Project> = await pool.query(
    `SELECT * FROM get_subprojects($1)
     ORDER BY id
     ${page.clause}`,
    [parentId, ...page.values],
  );
  return result.rows;
};

// Add project member
export const addProjectMember = async (
  pool: Queryable,
  projectId: string,
  userId: string,
): Promise<ProjectMember | null> => {
  const result: QueryResult<ProjectMember> = await pool.query(
    `INSERT INTO project_users
    (project_id, user_id)
    VALUES ($1, $2)
    RETURNING *`,
    [projectId, userId],
  );
  return result.rows[0] || null;
};

// Delete project member
export const deleteProjectMember = async (
  pool: Pool,
  projectId: string,
  userId: string,
): Promise<number | null> => {
  const result: QueryResult = await pool.query(
    `DELETE FROM project_users
    WHERE project_id = $1
    AND user_id = $2`,
    [projectId, userId],
  );
  return result.rowCount;
};

const ALLOWED_PROJECT_TASK_FILTER_KEYS = [
  'status',
  'priority',
  'assignee',
] as const;

// Get project tasks
export const getProjectTasks = async (
  pool: Pool,
  id: string,
  filters: ProjectTaskFilters = {},
  pagination: Pagination = defaultPagination(),
): Promise<ProjectTask[]> => {
  const projectId = id != null && id !== '' ? String(id).trim() : null;
  if (!projectId) {
    return [];
  }
  const rawStatus = filters.status != null ? Number(filters.status) : null;
  const rawPriority =
    filters.priority != null ? Number(filters.priority) : null;
  const rawAssignee =
    filters.assignee != null ? Number(filters.assignee) : null;
  const status_id =
    rawStatus != null && !Number.isNaN(rawStatus) ? rawStatus : null;
  const priority_id =
    rawPriority != null && !Number.isNaN(rawPriority) ? rawPriority : null;
  const assignee_id =
    rawAssignee != null && !Number.isNaN(rawAssignee) ? rawAssignee : null;

  const page = paginationClause(pagination, 5);
  const result: QueryResult<ProjectTask> = await pool.query(
    `SELECT * FROM get_tasks(
      null, $1, $2, null, $3, $4, null, null, false,
      null, null, null, null, null, null, null, null, null, false,
      null, null, null, null, null, null, null
    )
    ORDER BY created_on DESC, id DESC
    ${page.clause}`,
    [projectId, assignee_id, status_id, priority_id, ...page.values],
  );
  return result.rows;
};

// Get project statuses
export const getProjectStatuses = async (
  pool: Pool,
): Promise<ProjectStatus[]> => {
  const result: QueryResult<ProjectStatus> = await pool.query(
    `SELECT id, name, color FROM project_statuses
    ORDER BY id`,
  );
  return result.rows;
};
