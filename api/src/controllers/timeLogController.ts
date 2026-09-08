import { Request, Response } from 'express';
import { Pool } from 'pg';
import * as timeLogModel from '../models/timeLogModel';
import { CustomRequest } from '../types/express';
import {
  TimeLogCreateInput,
  TimeLogQueryFilters,
  TimeLogUpdateInput,
} from '../types/timeLog';
import logger from '../utils/logger';
import { parsePagination } from '../utils/pagination';

// Get all time logs
export const getAllTimeLogs = async (
  req: Request,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  try {
    const timeLogs = await timeLogModel.getAllTimeLogs(
      pool,
      parsePagination(req.query),
    );
    res.status(200).json(timeLogs);
  } catch (error) {
    logger.error({ err: error });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get task time logs
export const getTaskTimeLogs = async (
  req: Request,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  try {
    const { taskId } = req.params;
    const timeLogs = await timeLogModel.getTaskTimeLogs(
      pool,
      taskId,
      req.query as TimeLogQueryFilters,
    );
    res.status(200).json(timeLogs);
  } catch (error) {
    logger.error({ err: error });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get task spent time
export const getTaskSpentTime = async (
  req: Request,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  try {
    const { taskId } = req.params;
    const spentTime = await timeLogModel.getTaskSpentTime(pool, taskId);
    res.status(200).json(spentTime);
  } catch (error) {
    logger.error({ err: error });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get project time logs
export const getProjectTimeLogs = async (
  req: Request,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  try {
    const { projectId } = req.params;
    const params = req.query;
    const timeLogs = await timeLogModel.getProjectTimeLogs(
      pool,
      projectId,
      params,
    );
    res.status(200).json(timeLogs);
  } catch (error) {
    logger.error({ err: error });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get project spent time
export const getProjectSpentTime = async (
  req: Request,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  try {
    const { projectId } = req.params;
    const spentTime = await timeLogModel.getProjectSpentTime(pool, projectId);
    res.status(200).json(spentTime);
  } catch (error) {
    logger.error({ err: error });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create time log
export const createTimeLog = async (
  req: CustomRequest,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  try {
    const { taskId } = req.params;
    const userId = req.session?.user?.id;
    const { log_date, spent_time, description, activity_type_id } =
      req.body as TimeLogCreateInput;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (spent_time == null || !activity_type_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const timeLog = await timeLogModel.createTimeLog(pool, taskId, userId, {
      log_date,
      spent_time,
      description: description ?? '',
      activity_type_id,
    });
    res.status(201).json(timeLog);
  } catch (error) {
    logger.error({ err: error });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update time log
export const updateTimeLog = async (
  req: Request,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  try {
    const { timeLogId } = req.params;
    const body = (req.body ?? {}) as TimeLogUpdateInput;

    // Forward only the keys actually sent so a partial update leaves the rest
    // of the row intact.
    const updates: TimeLogUpdateInput = {};
    for (const key of [
      'log_date',
      'spent_time',
      'description',
      'activity_type_id',
    ] as const) {
      if (body[key] !== undefined) {
        (updates as Record<string, unknown>)[key] = body[key];
      }
    }

    const timeLog = await timeLogModel.updateTimeLog(pool, timeLogId, updates);
    if (!timeLog) {
      return res.status(404).json({ error: 'Time log not found' });
    }
    res.status(200).json(timeLog);
  } catch (error) {
    logger.error({ err: error });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete time log
export const deleteTimeLog = async (
  req: Request,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  try {
    const { timeLogId } = req.params;
    await timeLogModel.deleteTimeLog(pool, timeLogId);
    res.status(200).json({ message: 'Time log deleted successfully' });
  } catch (error) {
    logger.error({ err: error });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user time logs
export const getUserTimeLogs = async (
  req: CustomRequest,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  try {
    const userId = req.session?.user?.id;
    const params = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const timeLogs = await timeLogModel.getUserTimeLogs(pool, userId, params);
    res.status(200).json(timeLogs);
  } catch (error) {
    logger.error({ err: error });
    res.status(500).json({ error: 'Internal server error' });
  }
};
