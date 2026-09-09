import { Request, Response } from 'express';
import { Pool } from 'pg';
import { CustomRequest } from '../types/express';
import {
  TaskCreateInput,
  TaskUpdateInput,
  TaskQueryFilters,
} from '../types/task';
import * as taskModel from '../models/taskModel';
import { resolveProjectScope } from '../models/accessModel';
import * as notificationModel from '../models/notificationModel';
import { NotificationType } from '../types/notification';
import logger from '../utils/logger';
import { parsePagination } from '../utils/pagination';
import { withTransaction } from '../utils/transaction';
import { parseIdParam, toTimestamp } from '../utils/requestParsing';

// Get tasks
export const getTasks = async (
  req: Request,
  res: Response,
  pool: Pool,
): Promise<void> => {
  try {
    const userId = (req as CustomRequest).session?.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const {
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
      active_statuses_only,
    } = req.query;

    // Only use getTasksByProject when project_id is the sole filter
    const otherFilters = [
      id,
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
      active_statuses_only,
    ].some(Boolean);
    const pagination = parsePagination(req.query);
    // Tasks inherit their project's tenancy, so the listing is scoped inside the
    // query rather than filtered afterwards - otherwise paging drops rows.
    const scopeUserId = await resolveProjectScope(pool, userId);

    if (project_id && !otherFilters) {
      const tasks = await taskModel.getTasksByProject(
        pool,
        project_id as string,
        pagination,
        scopeUserId,
      );
      res.status(200).json(tasks);
      return;
    }

    const filters: TaskQueryFilters = {};

    const parsedId = id !== undefined && id !== '' ? Number(id) : NaN;
    if (!Number.isNaN(parsedId)) filters.id = parsedId;
    const parsedProjectId = parseIdParam(
      project_id as string | string[] | undefined,
    );
    if (parsedProjectId !== null) filters.project_id = parsedProjectId;
    const parsedAssigneeId = parseIdParam(
      assignee_id as string | string[] | undefined,
    );
    if (parsedAssigneeId !== null) filters.assignee_id = parsedAssigneeId;
    const parsedHolderId = parseIdParam(
      holder_id as string | string[] | undefined,
    );
    if (parsedHolderId !== null) filters.holder_id = parsedHolderId;
    const parsedStatusId = parseIdParam(
      status_id as string | string[] | undefined,
    );
    if (parsedStatusId !== null) filters.status_id = parsedStatusId;
    const parsedPriorityId = parseIdParam(
      priority_id as string | string[] | undefined,
    );
    if (parsedPriorityId !== null) filters.priority_id = parsedPriorityId;
    const parsedTypeId = parseIdParam(type_id as string | string[] | undefined);
    if (parsedTypeId !== null) filters.type_id = parsedTypeId;
    const parsedParentId =
      parent_id !== undefined && parent_id !== '' ? Number(parent_id) : NaN;
    if (!Number.isNaN(parsedParentId)) filters.parent_id = parsedParentId;
    const parsedCreatedBy = parseIdParam(
      created_by as string | string[] | undefined,
    );
    if (parsedCreatedBy !== null) filters.created_by = parsedCreatedBy;
    if (due_date_from && typeof due_date_from === 'string') {
      filters.due_date_from = due_date_from;
    }
    if (due_date_to && typeof due_date_to === 'string') {
      filters.due_date_to = due_date_to;
    }
    if (start_date_from && typeof start_date_from === 'string') {
      filters.start_date_from = start_date_from;
    }
    if (start_date_to && typeof start_date_to === 'string') {
      filters.start_date_to = start_date_to;
    }
    if (created_from && typeof created_from === 'string') {
      filters.created_from = created_from;
    }
    if (created_to && typeof created_to === 'string') {
      filters.created_to = created_to;
    }
    if (estimated_time_min !== undefined) {
      filters.estimated_time_min = Number(estimated_time_min);
    }
    if (estimated_time_max !== undefined) {
      filters.estimated_time_max = Number(estimated_time_max);
    }
    if (inactive_statuses_only === '1' || inactive_statuses_only === 'true') {
      filters.inactive_statuses_only = true;
    }
    if (active_statuses_only === '1' || active_statuses_only === 'true') {
      filters.active_statuses_only = true;
    }

    const hasFilters = Object.keys(filters).length > 0;
    const tasks = await taskModel.getTasks(
      pool,
      hasFilters ? filters : undefined,
      pagination,
      scopeUserId,
    );
    res.status(200).json(tasks);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching tasks');
    res.status(500).json({ error: 'Internal server error' });
  }
};

/** Parse an ISO date/datetime query param into a `YYYY-MM-DD` string, or null. */
const parseDateParam = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

// Get tasks overlapping a date range (calendar view)
export const getTasksByDateRange = async (
  req: Request,
  res: Response,
  pool: Pool,
): Promise<void> => {
  try {
    const userId = (req as CustomRequest).session?.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const startDate = parseDateParam(req.query.start_date);
    const endDate = parseDateParam(req.query.end_date);
    if (!startDate || !endDate) {
      res
        .status(400)
        .json({ error: 'start_date and end_date must be valid dates' });
      return;
    }
    if (endDate < startDate) {
      res
        .status(400)
        .json({ error: 'end_date must be on or after start_date' });
      return;
    }

    const scopeUserId = await resolveProjectScope(pool, userId);
    const tasks = await taskModel.getTasksByDateRange(
      pool,
      startDate,
      endDate,
      scopeUserId,
    );
    res.status(200).json(tasks);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching tasks by date range');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get Task by ID
export const getTaskById = async (
  req: Request,
  res: Response,
  pool: Pool,
): Promise<void> => {
  const { id } = req.params;
  try {
    const task = await taskModel.getTaskById(pool, id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.status(200).json(task);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching task by ID');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get tasks by assignee
export const getTaskByAssignee = async (
  req: Request,
  res: Response,
  pool: Pool,
): Promise<void> => {
  try {
    const { assignee_id } = req.query;
    const result = await taskModel.getTasks(pool, {
      whereParams: { assignee_id: Number(assignee_id) },
    });
    if (!result || result.length === 0) {
      res.status(404).json({ error: 'No tasks assigned' });
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching tasks by assignee');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get tasks by holder
export const getTaskByHolder = async (
  req: Request,
  res: Response,
  pool: Pool,
): Promise<void> => {
  try {
    const { holder_id } = req.query;
    const result = await taskModel.getTasks(pool, {
      whereParams: { holder_id: Number(holder_id) },
    });
    if (!result || result.length === 0) {
      res.status(404).json({ error: 'No tasks assigned' });
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching tasks by holder');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a task
export const createTask = async (
  req: CustomRequest,
  res: Response,
  pool: Pool,
): Promise<void> => {
  try {
    const taskData: TaskCreateInput = req.body;
    // Authorship comes from the session only; a client-supplied created_by
    // would let a caller attribute the task to somebody else.
    const created_by = Number(req.session?.user?.id);
    if (!Number.isInteger(created_by)) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    const { holder_id, assignee_id, tag_ids, estimated_time } = taskData;

    // Create unique watchers array from holder, assignee, and creator
    const watcherIds = [holder_id, assignee_id, created_by];
    const watchers = Array.from(new Set(watcherIds)).filter(
      (id): id is number => typeof id === 'number' && !isNaN(id),
    );

    // Validate required fields
    const requiredFields: (keyof TaskCreateInput)[] = [
      'name',
      'start_date',
      'due_date',
      'priority_id',
      'status_id',
      'type_id',
      'project_id',
      'holder_id',
      'assignee_id',
    ];

    // A falsy check would reject a legitimate 0 (a valid id or an empty name is
    // caught by the trim below instead).
    const missingFields = requiredFields.filter((field) => {
      const value = taskData[field];
      return (
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim() === '')
      );
    });

    if (missingFields.length > 0) {
      res.status(400).json({
        error: 'Missing required fields',
        missingFields,
      });
      return;
    }

    const startDate = taskData.start_date
      ? toTimestamp(taskData.start_date as Date | string)
      : NaN;
    const dueDate = taskData.due_date
      ? toTimestamp(taskData.due_date as Date | string)
      : NaN;
    if (!isNaN(startDate) && !isNaN(dueDate) && dueDate < startDate) {
      res
        .status(400)
        .json({ error: 'Due date must be on or after start date' });
      return;
    }
    const endDate = taskData.end_date
      ? toTimestamp(taskData.end_date as Date | string)
      : NaN;
    if (
      taskData.end_date != null &&
      !isNaN(startDate) &&
      !isNaN(endDate) &&
      endDate < startDate
    ) {
      res
        .status(400)
        .json({ error: 'End date must be on or after start date' });
      return;
    }

    // Convert types to match database expectations
    const processedData: TaskCreateInput = {
      ...taskData,
      // Convert estimated_time from string to number if present
      estimated_time: estimated_time ? Number(estimated_time) : null,

      priority_id: taskData.priority_id,
      status_id: taskData.status_id,
      type_id: taskData.type_id,
      project_id: taskData.project_id,
      holder_id: taskData.holder_id,
      assignee_id: taskData.assignee_id,
      created_by,
      parent_id: taskData.parent_id || undefined,
      // Extract tag IDs and ensure they are numbers
      tag_ids: (taskData.tags || []).map((tag) => Number(tag.id)),
    };

    // The task and its watcher notifications are one unit of work: a failure
    // after the insert must not leave a task nobody is notified about.
    const task = await withTransaction(pool, async (client) => {
      const created = await taskModel.createTask(client, processedData, watchers);

      if (!created || !created.task_id) {
        throw new Error('Task creation failed - no task ID returned');
      }

      const taskId = Number(created.task_id);
      if (isNaN(taskId)) {
        throw new Error(`Invalid task ID: ${created.task_id}`);
      }

      await notificationModel.createWatcherNotifications(client, {
        task_id: taskId,
        action_user_id: created_by,
        type_id: NotificationType.TaskCreated,
      });

      return created;
    });

    logger.debug({ task }, 'Created task');

    res.status(201).json(task);
  } catch (error) {
    logger.error({ err: error, taskData: req.body }, 'Error creating task');
    // 22023 = invalid_parameter_value, raised by create_task() for input it
    // rejects; that is the caller's fault, not a server failure.
    if ((error as { code?: string })?.code === '22023') {
      res.status(400).json({ error: 'Invalid task data' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a task
export const updateTask = async (
  req: CustomRequest,
  res: Response,
  pool: Pool,
): Promise<void> => {
  const { id } = req.params;
  const userId = req.session.user?.id;
  const taskData: TaskUpdateInput = req.body;

  const startDate =
    taskData.start_date != null
      ? toTimestamp(taskData.start_date as Date | string)
      : null;
  const dueDate =
    taskData.due_date != null
      ? toTimestamp(taskData.due_date as Date | string)
      : null;
  const endDate =
    taskData.end_date != null
      ? toTimestamp(taskData.end_date as Date | string)
      : null;
  if (
    startDate != null &&
    dueDate != null &&
    !isNaN(startDate) &&
    !isNaN(dueDate) &&
    dueDate < startDate
  ) {
    res.status(400).json({ error: 'Due date must be on or after start date' });
    return;
  }
  if (
    startDate != null &&
    endDate != null &&
    !isNaN(startDate) &&
    !isNaN(endDate) &&
    endDate < startDate
  ) {
    res.status(400).json({ error: 'End date must be on or after start date' });
    return;
  }

  try {
    const task = await withTransaction(pool, async (client) => {
      const updated = await taskModel.updateTask(client, id, taskData);
      if (!updated) {
        return null;
      }

      await notificationModel.createWatcherNotifications(client, {
        task_id: parseInt(id),
        action_user_id: parseInt(userId!),
        type_id: NotificationType.TaskUpdated, // Task Updated
      });

      return updated;
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.status(200).json(task);
  } catch (error) {
    logger.error({ err: error }, 'Error updating task');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Change task status
export const changeTaskStatus = async (
  req: CustomRequest,
  res: Response,
  pool: Pool,
): Promise<void> => {
  const { id } = req.params;
  const { statusId } = req.body;
  const userId = req.session.user?.id;

  const statusIdNum = Number(statusId);
  if (!Number.isInteger(statusIdNum) || statusIdNum < 1) {
    res.status(400).json({ error: 'statusId must be a positive integer' });
    return;
  }

  try {
    const task = await withTransaction(pool, async (client) => {
      const updated = await taskModel.changeTaskStatus(
        client,
        Number(id),
        statusIdNum,
      );
      if (!updated) {
        return null;
      }

      await notificationModel.createWatcherNotifications(client, {
        task_id: parseInt(id),
        action_user_id: parseInt(userId!),
        type_id: NotificationType.TaskUpdated, // Task Status Changed
      });

      return updated;
    });

    if (!task) {
      res.status(404).json({ error: 'Unable to update task status' });
      return;
    }

    res.status(200).json(task);
  } catch (error) {
    logger.error({ err: error }, 'Error changing task status');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update only a task's start/due dates (Gantt drag-to-reschedule)
export const updateTaskDates = async (
  req: CustomRequest,
  res: Response,
  pool: Pool,
): Promise<void> => {
  const { id } = req.params;
  const userId = req.session.user?.id;
  const { start_date, due_date } = req.body ?? {};

  if (start_date === undefined && due_date === undefined) {
    res
      .status(400)
      .json({ error: 'At least one of start_date or due_date is required' });
    return;
  }

  const dates: TaskUpdateInput = {};
  for (const [key, value] of Object.entries({ start_date, due_date })) {
    if (value === undefined) continue;
    const timestamp = toTimestamp(value as Date | string);
    if (isNaN(timestamp)) {
      res.status(400).json({ error: `${key} must be a valid date` });
      return;
    }
    (dates as Record<string, Date>)[key] = new Date(timestamp);
  }

  try {
    const existing = await taskModel.getTaskById(pool, id);
    if (!existing) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // A partial update must still be ordered against the date it is not changing.
    const nextStart = dates.start_date ?? existing.start_date;
    const nextDue = dates.due_date ?? existing.due_date;
    if (
      nextStart != null &&
      nextDue != null &&
      new Date(nextDue).getTime() < new Date(nextStart).getTime()
    ) {
      res.status(400).json({ error: 'Due date must be on or after start date' });
      return;
    }

    const task = await withTransaction(pool, async (client) => {
      const updated = await taskModel.updateTask(client, id, dates);
      if (!updated) {
        return null;
      }

      await notificationModel.createWatcherNotifications(client, {
        task_id: parseInt(id),
        action_user_id: parseInt(userId!),
        type_id: NotificationType.TaskUpdated,
      });

      return updated;
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.status(200).json(task);
  } catch (error) {
    logger.error({ err: error }, 'Error updating task dates');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a task
export const deleteTask = async (
  req: Request,
  res: Response,
  pool: Pool,
): Promise<void> => {
  const { id } = req.params;
  try {
    const task = await taskModel.deleteTask(pool, id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.status(200).json(task);
  } catch (error) {
    logger.error({ err: error }, 'Error deleting task');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get task statuses
export const getTaskStatuses = async (
  req: Request,
  res: Response,
  pool: Pool,
): Promise<void> => {
  try {
    const statuses = await taskModel.getTaskStatuses(pool);
    res.status(200).json(statuses);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching task statuses');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get priorities
export const getPriorities = async (
  req: Request,
  res: Response,
  pool: Pool,
): Promise<void> => {
  try {
    const priorities = await taskModel.getPriorities(pool);
    res.status(200).json(priorities);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching priorities');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get active tasks
export const getActiveTasks = async (
  req: CustomRequest,
  res: Response,
  pool: Pool,
): Promise<void> => {
  try {
    const userId = req.session.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const tasks = await taskModel.getActiveTasks(pool, userId);
    res.status(200).json(tasks);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching active tasks');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get subtasks
export const getSubtasks = async (
  req: Request,
  res: Response,
  pool: Pool,
): Promise<void> => {
  const { id } = req.params;
  try {
    const subtasks = await taskModel.getSubtasks(pool, id);
    res.status(200).json(subtasks);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching subtasks');
    res.status(500).json({ error: 'Internal server error' });
  }
};
