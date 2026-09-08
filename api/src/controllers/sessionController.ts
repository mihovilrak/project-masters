import { Response } from 'express';
import { Pool } from 'pg';
import { CustomRequest } from '../types/express';
import * as permissionModel from '../models/permissionModel';
import logger from '../utils/logger';

// Get session user and permissions (single round-trip)
export const session = async (
  req: CustomRequest,
  res: Response,
  pool: Pool,
): Promise<void> => {
  try {
    if (req.session.user) {
      const permissions = await permissionModel.getUserPermissions(
        pool,
        String(req.session.user.id),
      );
      res.status(200).json({ user: req.session.user, permissions });
    } else {
      res.status(401).json({ error: 'Not authenticated' });
    }
  } catch (error) {
    logger.error({ err: error });
    res.status(500).json({
      error: 'Internal server error',
    });
  }
};
