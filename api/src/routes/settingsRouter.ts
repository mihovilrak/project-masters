import { Router } from 'express';
import { Pool } from 'pg';
import checkPermission from '../middleware/permissionMiddleware';
import * as settingsController from '../controllers/settingsController';
import { withPool } from '../utils/withPool';

export default (pool: Pool): Router => {
  const router = Router();

  router.get(
    '/app_settings',
    checkPermission(pool, 'Admin'),
    withPool(pool, settingsController.getSystemSettings),
  );
  router.put(
    '/app_settings',
    checkPermission(pool, 'Admin'),
    withPool(pool, settingsController.updateSystemSettings),
  );
  router.get('/app_theme', withPool(pool, settingsController.getAppTheme));
  router.get('/timezones', withPool(pool, settingsController.getTimezones));
  router.get(
    '/user_settings',
    withPool(pool, settingsController.getUserSettings),
  );
  router.put(
    '/user_settings',
    withPool(pool, settingsController.updateUserSettings),
  );
  router.post(
    '/test-smtp',
    checkPermission(pool, 'Admin'),
    withPool(pool, settingsController.testSmtpConnection),
  );

  return router;
};
