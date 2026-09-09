import { Router, RequestHandler } from 'express';
import { Pool } from 'pg';
import checkPermission from '../middleware/permissionMiddleware';
import {
  requireProjectAccess,
  requireTaskAccess,
} from '../middleware/projectAccessMiddleware';
import * as taskController from '../controllers/taskController';
import commentRouter from './commentRouter';
import fileRouter from './fileRouter';
import {
  getTaskTags,
  addTaskTags,
  removeTaskTag,
} from '../controllers/tagController';
import * as watcherController from '../controllers/watcherController';
import { withPool } from '../utils/withPool';

export default (pool: Pool): Router => {
  const router = Router();
  // A task is only reachable through the project it belongs to.
  const taskAccess = requireTaskAccess(pool);

  // Literal paths are registered before '/:id' so a typo 404s instead of being
  // swallowed by the id route and reaching getTaskById with a non-numeric id.
  router.get('/', withPool(pool, taskController.getTasks));
  router.get('/statuses', withPool(pool, taskController.getTaskStatuses));
  router.get('/priorities', withPool(pool, taskController.getPriorities));
  router.get('/active', withPool(pool, taskController.getActiveTasks));
  router.get('/calendar', withPool(pool, taskController.getTasksByDateRange));
  router.post(
    '/',
    checkPermission(pool, 'Create tasks'),
    requireProjectAccess(pool, 'project_id'),
    withPool(pool, taskController.createTask),
  );

  router.use(
    '/:id/comments',
    taskAccess,
    ((req, res, next) => {
      (req as any).taskId = req.params.id;
      next();
    }) as RequestHandler,
    commentRouter(pool),
  );

  router.use(
    '/:id/files',
    taskAccess,
    ((req, res, next) => {
      (req as any).taskId = req.params.id;
      next();
    }) as RequestHandler,
    fileRouter(pool),
  );

  router.get(
    '/:id/subtasks',
    taskAccess,
    withPool(pool, taskController.getSubtasks),
  );
  router.get('/:id/tags', taskAccess, withPool(pool, getTaskTags));
  router.post('/:id/tags', taskAccess, withPool(pool, addTaskTags));
  router.delete('/:id/tags/:tagId', taskAccess, withPool(pool, removeTaskTag));
  router.get(
    '/:id/watchers',
    taskAccess,
    withPool(pool, watcherController.getTaskWatchers),
  );
  router.post(
    '/:id/watchers',
    taskAccess,
    withPool(pool, watcherController.addTaskWatcher),
  );
  router.delete(
    '/:id/watchers/:userId',
    taskAccess,
    withPool(pool, watcherController.removeTaskWatcher),
  );
  router.patch(
    '/:id/dates',
    checkPermission(pool, 'Edit tasks'),
    taskAccess,
    withPool(pool, taskController.updateTaskDates),
  );
  router.patch(
    '/:id/change-status',
    taskAccess,
    withPool(pool, taskController.changeTaskStatus),
  );

  router.get('/:id', taskAccess, withPool(pool, taskController.getTaskById));
  router.put(
    '/:id',
    checkPermission(pool, 'Edit tasks'),
    taskAccess,
    withPool(pool, taskController.updateTask),
  );
  router.patch(
    '/:id',
    checkPermission(pool, 'Edit tasks'),
    taskAccess,
    withPool(pool, taskController.updateTask),
  );
  router.delete(
    '/:id',
    checkPermission(pool, 'Delete tasks'),
    taskAccess,
    withPool(pool, taskController.deleteTask),
  );

  return router;
};
