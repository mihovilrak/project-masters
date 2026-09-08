import { Router } from 'express';
import { Pool } from 'pg';
import * as taskTypeRouter from './taskTypeRouter';
import * as activityTypeRouter from './activityTypeRouter';
import * as adminController from '../controllers/adminController';
import checkPermission from '../middleware/permissionMiddleware';
import { withPool } from '../utils/withPool';

export default (pool: Pool): Router => {
  const router = Router();

  router.get('/access', withPool(pool, adminController.checkAdminAccess));
  router.get(
    '/stats',
    checkPermission(pool, 'Admin'),
    withPool(pool, adminController.getSystemStats),
  );
  router.get(
    '/logs',
    checkPermission(pool, 'Admin'),
    withPool(pool, adminController.getSystemLogs),
  );
  router.use('/task-types', taskTypeRouter.default(pool));
  router.use('/activity-types', activityTypeRouter.default(pool));
  router.get(
    '/permissions',
    checkPermission(pool, 'Admin'),
    withPool(pool, adminController.getAllPermissions),
  );

  return router;
};
