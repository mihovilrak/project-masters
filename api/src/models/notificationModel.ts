import { Pool } from 'pg';
import { Queryable } from '../utils/transaction';
import {
  Notification,
  NotificationWithDetails,
  NotificationCreateInput,
  CreateWatcherNotificationsInput,
} from '../types/notification';
import {
  Pagination,
  defaultPagination,
  paginationClause,
} from '../utils/pagination';

// Get notifications by user ID
export const getNotificationsByUserId = async (
  pool: Pool,
  user_id: string,
  pagination: Pagination = defaultPagination(),
): Promise<NotificationWithDetails[]> => {
  // user_notifications() applies the soft-delete predicate and joins the type
  // name/icon/colour the client renders; querying the table directly returned
  // notifications the user had already dismissed.
  const page = paginationClause(pagination, 2);
  const result = await pool.query(
    `SELECT * FROM user_notifications($1)
     ORDER BY created_on DESC, id DESC
     ${page.clause}`,
    [user_id, ...page.values],
  );
  return result.rows;
};

// Mark all of a user's notifications as read
export const markNotificationsAsRead = async (
  pool: Pool,
  user_id: string,
): Promise<Notification[]> => {
  const result = await pool.query(
    `UPDATE notifications
    SET (is_read, read_on) = (true, current_timestamp)
    WHERE user_id = $1
    AND is_read = false
    AND active = true
    RETURNING *`,
    [user_id],
  );
  return result.rows;
};

export const markNotificationAsRead = async (
  pool: Pool,
  id: string,
  user_id: string,
): Promise<Notification[]> => {
  const result = await pool.query(
    `UPDATE notifications
    SET (is_read, read_on) = (true, current_timestamp)
    WHERE id = $1
    AND user_id = $2
    AND is_read = false
    AND active = true
    RETURNING *`,
    [id, user_id],
  );
  return result.rows;
};

// Delete notification. Scoped to the owner: returns false when the notification
// does not exist or belongs to another user.
export const deleteNotification = async (
  pool: Pool,
  id: string,
  user_id: string,
): Promise<boolean> => {
  const result = await pool.query(
    `UPDATE notifications
    SET active = false
    WHERE id = $1
    AND user_id = $2
    RETURNING id`,
    [id, user_id],
  );
  return (result.rowCount ?? 0) > 0;
};

// Create watcher notifications
export const createWatcherNotifications = async (
  pool: Queryable,
  { task_id, action_user_id, type_id }: CreateWatcherNotificationsInput,
): Promise<Notification[]> => {
  const result = await pool.query(
    `SELECT * FROM create_watcher_notifications($1, $2, $3)`,
    [task_id, action_user_id, type_id],
  );
  return result.rows;
};

// Create project member notifications
export const createProjectMemberNotifications = async (
  pool: Queryable,
  {
    project_id,
    action_user_id,
    type_id,
  }: { project_id: number; action_user_id: number; type_id: number },
): Promise<Notification[]> => {
  const result = await pool.query(
    `SELECT * FROM create_project_member_notifications($1, $2, $3)`,
    [project_id, action_user_id, type_id],
  );
  return result.rows;
};
