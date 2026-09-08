import { Request, Response } from 'express';
import { Pool } from 'pg';
import * as activityTypeModel from '../models/activityTypeModel';
import { CustomRequest } from '../types/express';
import {
  ActivityTypeCreateInput,
  ActivityTypeUpdateInput,
} from '../types/activityType';
import { AVAILABLE_ICONS } from '../utils/iconConstants';
import logger from '../utils/logger';

// Get all activity types
export const getActivityTypes = async (
  req: Request,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  try {
    const activityTypes = await activityTypeModel.getActivityTypes(pool);
    res.status(200).json(activityTypes);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching activity types');
    res.status(500).json({ error: 'Failed to fetch activity types' });
  }
};

// Create a new activity type
export const createActivityType = async (
  req: CustomRequest,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  try {
    const { name, description, color, icon } =
      req.body as ActivityTypeCreateInput;
    const userId = req.session?.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!color || !color.match(/^#[0-9A-Fa-f]{6}$/)) {
      return res.status(400).json({ error: 'Invalid color format' });
    }

    const activityType = await activityTypeModel.createActivityType(
      pool,
      name,
      description || null,
      color,
      icon || null,
    );
    res.status(201).json(activityType);
  } catch (error) {
    logger.error({ err: error }, 'Error creating activity type');
    res.status(500).json({ error: 'Failed to create activity type' });
  }
};

// Update an activity type
export const updateActivityType = async (
  req: Request,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const body = (req.body ?? {}) as ActivityTypeUpdateInput;

    // Validate color format when provided (must be hex #RRGGBB for DB varchar(7))
    if (
      body.color != null &&
      body.color !== '' &&
      !body.color.match(/^#[0-9A-Fa-f]{6}$/)
    ) {
      return res.status(400).json({ error: 'Invalid color format' });
    }

    // Only forward the keys the client actually sent so a partial update never
    // blanks the fields it left out.
    const updates: ActivityTypeUpdateInput = {};
    for (const key of ['name', 'description', 'color', 'icon'] as const) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    const activityType = await activityTypeModel.updateActivityType(
      pool,
      id || '',
      updates,
    );

    if (!activityType) {
      return res.status(404).json({ error: 'Activity type not found' });
    }

    res.status(200).json(activityType);
  } catch (error) {
    logger.error({ err: error }, 'Error updating activity type');
    res.status(500).json({ error: 'Failed to update activity type' });
  }
};

// Delete an activity type
export const deleteActivityType = async (
  req: Request,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const result = await activityTypeModel.deleteActivityType(pool, id);

    if (!result) {
      return res.status(404).json({ error: 'Activity type not found' });
    }

    res.status(200).json({ message: 'Activity type deleted successfully' });
  } catch (error) {
    logger.error({ err: error }, 'Error deleting activity type');
    res.status(500).json({ error: 'Failed to delete activity type' });
  }
};

// Get available icons
export const getAvailableIcons = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    res.status(200).json(AVAILABLE_ICONS);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching icons');
    res.status(500).json({ error: 'Failed to fetch icons' });
  }
};
