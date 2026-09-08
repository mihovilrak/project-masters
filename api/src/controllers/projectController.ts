import { Request, Response } from 'express';
import { Pool } from 'pg';
import {
  ProjectTaskFilters,
  ProjectUpdateInput,
  ProjectQueryFilters,
} from '../types/project';
import { CustomRequest, ProjectRequest } from '../types/express';
import * as projectModel from '../models/projectModel';
import { resolveProjectScope } from '../models/accessModel';
import * as notificationModel from '../models/notificationModel';
import { NotificationType } from '../types/notification';
import logger from '../utils/logger';
import { parsePagination } from '../utils/pagination';
import { withTransaction } from '../utils/transaction';
import { ProjectStatusId } from '../constants/statusIds';
import { mapProjectQueryFilters } from '../mappers/projectFilters';

// Get all projects
export const getProjects = async (
  req: Request<{}, {}, {}, ProjectQueryFilters>,
  res: Response,
  pool: Pool,
): Promise<void> => {
  try {
    const filters = mapProjectQueryFilters(req.query);
    if (filters.statusId === undefined) {
      filters.statusId = ProjectStatusId.Active;
    }

    const userId = (req as unknown as CustomRequest).session?.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Scoped in the query rather than filtered afterwards, so a page is not
    // silently shortened by rows the user cannot see.
    const projects = await projectModel.getProjects(
      pool,
      filters,
      parsePagination(req.query),
      await resolveProjectScope(pool, userId),
    );
    res.status(200).json(projects);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching projects');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get a project by ID
export const getProjectById = async (
  req: Request<{ id: string }>,
  res: Response,
  pool: Pool,
): Promise<void> => {
  try {
    const { id } = req.params;
    const project = await projectModel.getProjectById(pool, id);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.status(200).json(project);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching project by ID');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get project details
export const getProjectDetails = async (
  req: Request<{ id: string }>,
  res: Response,
  pool: Pool,
): Promise<void> => {
  try {
    const { id } = req.params;
    const project = await projectModel.getProjectDetails(pool, id);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.status(200).json(project);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching project details');
    res.status(500).json({ error: 'Internal server error' });
  }
};

const MAX_PROJECT_NAME_LENGTH = 500;
const MAX_PROJECT_DESCRIPTION_LENGTH = 5000;

// Create a project
export const createProject = async (
  req: ProjectRequest,
  res: Response,
  pool: Pool,
): Promise<void> => {
  const { name, description, start_date, due_date, parent_id } = req.body ?? {};

  const created_by = req.session.user?.id;

  if (!created_by) {
    res.status(401).json({ error: 'User not authenticated' });
    return;
  }

  if (typeof name !== 'string' || !name.trim()) {
    res.status(400).json({
      error: 'Invalid request',
      message: 'name is required and must be a non-empty string',
    });
    return;
  }
  const trimmedName = name.trim();
  if (trimmedName.length > MAX_PROJECT_NAME_LENGTH) {
    res.status(400).json({
      error: 'Invalid request',
      message: `name must not exceed ${MAX_PROJECT_NAME_LENGTH} characters`,
    });
    return;
  }
  if (
    description !== undefined &&
    description !== null &&
    typeof description !== 'string'
  ) {
    res.status(400).json({
      error: 'Invalid request',
      message: 'description must be a string',
    });
    return;
  }
  const desc = typeof description === 'string' ? description : '';
  if (desc.length > MAX_PROJECT_DESCRIPTION_LENGTH) {
    res.status(400).json({
      error: 'Invalid request',
      message: `description must not exceed ${MAX_PROJECT_DESCRIPTION_LENGTH} characters`,
    });
    return;
  }

  try {
    const project = await projectModel.createProject(
      pool,
      trimmedName,
      desc,
      start_date ?? null,
      due_date ?? null,
      created_by,
      parent_id,
    );

    res.status(201).json(project);
  } catch (error) {
    logger.error({ err: error }, 'Error creating project');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Change project status
export const changeProjectStatus = async (
  req: Request<{ id: string }, {}, { status_id?: number; status?: number }>,
  res: Response,
  pool: Pool,
): Promise<void> => {
  const { id } = req.params;
  const statusId = Number(req.body.status_id ?? req.body.status);
  if (!Number.isInteger(statusId) || statusId < 1) {
    res.status(400).json({ error: 'status_id must be a positive integer' });
    return;
  }
  try {
    const result = await projectModel.changeProjectStatus(pool, id, statusId);
    if (!result) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    logger.error({ err: error }, 'Error changing project status');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a project
export const updateProject = async (
  req: Request<{ id: string }, {}, ProjectUpdateInput>,
  res: Response,
  pool: Pool,
): Promise<void> => {
  const { id } = req.params;
  const updates = {
    ...req.body,
    parent_id: req.body.parent_id ? Number(req.body.parent_id) : undefined,
  };
  try {
    const result = await projectModel.updateProject(pool, updates, id);
    if (!result) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    logger.error({ err: error }, 'Error updating project');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a project
export const deleteProject = async (
  req: Request<{ id: string }>,
  res: Response,
  pool: Pool,
): Promise<void> => {
  const { id } = req.params;
  try {
    const result = await projectModel.deleteProject(pool, id);
    if (!result) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    logger.error({ err: error }, 'Error deleting project');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get project members
export const getProjectMembers = async (
  req: Request<{ id: string }>,
  res: Response,
  pool: Pool,
): Promise<void> => {
  try {
    const { id } = req.params;
    const members = await projectModel.getProjectMembers(
      pool,
      id,
      parsePagination(req.query),
    );
    res.status(200).json(members);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching project members');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add project member
export const addProjectMember = async (
  req: Request<{ id: string }, {}, { userId: string }>,
  res: Response,
  pool: Pool,
): Promise<void> => {
  const { id } = req.params;
  const { userId } = req.body;
  try {
    // Membership and its notifications are one unit of work: a failed
    // notification must not leave a silently unannounced member behind.
    const result = await withTransaction(pool, async (client) => {
      const member = await projectModel.addProjectMember(client, id, userId);
      if (!member) {
        return null;
      }
      await notificationModel.createProjectMemberNotifications(client, {
        project_id: parseInt(id),
        action_user_id: parseInt(userId),
        type_id: NotificationType.ProjectMemberAdded,
      });
      return member;
    });

    if (!result) {
      res.status(404).json({ error: 'Project or user not found' });
      return;
    }
    res.status(201).json(result);
  } catch (error) {
    logger.error({ err: error }, 'Error adding project member');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete project member
export const deleteProjectMember = async (
  req: Request<{ id: string }, {}, { userId: string }>,
  res: Response,
  pool: Pool,
): Promise<void> => {
  const { id } = req.params;
  const { userId } = req.body;
  try {
    const result = await projectModel.deleteProjectMember(pool, id, userId);
    if (!result) {
      res.status(404).json({ error: 'Project member not found' });
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    logger.error({ err: error }, 'Error deleting project member');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get subprojects
export const getSubprojects = async (
  req: Request<{ id: string }>,
  res: Response,
  pool: Pool,
): Promise<void> => {
  try {
    const { id } = req.params;
    const subprojects = await projectModel.getSubprojects(
      pool,
      id,
      parsePagination(req.query),
    );
    res.status(200).json(subprojects);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching subprojects');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get tasks by project ID
export const getProjectTasks = async (
  req: Request<{ id: string }, {}, {}, ProjectTaskFilters>,
  res: Response,
  pool: Pool,
): Promise<void> => {
  try {
    const { id: projectId } = req.params;
    const { status, priority, assignee } = req.query;

    const filters: ProjectTaskFilters = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (assignee) filters.assignee = assignee;

    const tasks = await projectModel.getProjectTasks(
      pool,
      projectId,
      filters,
      parsePagination(req.query),
    );
    res.status(200).json(tasks);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching project tasks');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get project statuses
export const getProjectStatuses = async (
  req: Request,
  res: Response,
  pool: Pool,
): Promise<void> => {
  try {
    const statuses = await projectModel.getProjectStatuses(pool);
    res.status(200).json(statuses);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching project statuses');
    res.status(500).json({ error: 'Internal server error' });
  }
};
