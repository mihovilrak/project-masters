import { Pool } from 'pg';
import * as notificationModel from '../notificationModel';

// Mock the pg module
jest.mock('pg', () => ({
  Pool: jest.fn(),
}));

describe('NotificationModel', () => {
  let mockPool: jest.Mocked<Pool>;

  const mockQueryResult = (rows: any[]) => ({
    rows,
    rowCount: rows.length,
    command: '',
    oid: 0,
    fields: [],
  });

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    } as unknown as jest.Mocked<Pool>;
    jest.clearAllMocks();
  });

  describe('getNotificationsByUserId', () => {
    it('should return all notifications for a user', async () => {
      const mockNotifications = [
        {
          id: 1,
          user_id: 1,
          type_id: 1,
          task_id: 1,
          is_read: false,
          read_on: null,
          created_on: new Date(),
        },
        {
          id: 2,
          user_id: 1,
          type_id: 2,
          task_id: 2,
          is_read: true,
          read_on: new Date(),
          created_on: new Date(),
        },
      ];
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult(mockNotifications),
      );

      const result = await notificationModel.getNotificationsByUserId(
        mockPool,
        '1',
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('user_notifications($1)'),
        ['1', 500, 0],
      );
      expect(result).toEqual(mockNotifications);
    });

    it('should return empty array when no notifications exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      const result = await notificationModel.getNotificationsByUserId(
        mockPool,
        '999',
      );

      expect(result).toEqual([]);
    });
  });

  describe('markNotificationsAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      const updatedNotifications = [
        {
          id: 1,
          user_id: 1,
          type_id: 1,
          task_id: 1,
          is_read: true,
          read_on: new Date(),
          created_on: new Date(),
        },
        {
          id: 3,
          user_id: 1,
          type_id: 3,
          task_id: 3,
          is_read: true,
          read_on: new Date(),
          created_on: new Date(),
        },
      ];
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult(updatedNotifications),
      );

      const result = await notificationModel.markNotificationsAsRead(
        mockPool,
        '1',
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        ['1'],
      );
      expect(result).toEqual(updatedNotifications);
    });

    it('should return empty array when no unread notifications', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      const result = await notificationModel.markNotificationsAsRead(
        mockPool,
        '1',
      );

      expect(result).toEqual([]);
    });
  });

  describe('deleteNotification', () => {
    it('should soft delete a notification', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      await notificationModel.deleteNotification(mockPool, '1', '2');

      // The owner is part of the WHERE clause, so a delete cannot reach another
      // user's notification.
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        ['1', '2'],
      );
    });

    it('should report failure when nothing was deleted', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      const deleted = await notificationModel.deleteNotification(
        mockPool,
        '1',
        '2',
      );

      expect(deleted).toBe(false);
    });
  });

  describe('createWatcherNotifications', () => {
    it('should create notifications for task watchers', async () => {
      const createdNotifications = [
        {
          id: 1,
          user_id: 2,
          type_id: 1,
          task_id: 1,
          is_read: false,
          read_on: null,
          created_on: new Date(),
        },
        {
          id: 2,
          user_id: 3,
          type_id: 1,
          task_id: 1,
          is_read: false,
          read_on: null,
          created_on: new Date(),
        },
      ];
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult(createdNotifications),
      );

      const result = await notificationModel.createWatcherNotifications(
        mockPool,
        {
          task_id: 1,
          action_user_id: 1,
          type_id: 1,
        },
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM create_watcher_notifications($1, $2, $3)',
        [1, 1, 1],
      );
      expect(result).toEqual(createdNotifications);
    });
  });

  describe('createProjectMemberNotifications', () => {
    it('should create notifications for project members', async () => {
      const createdNotifications = [
        {
          id: 3,
          user_id: 2,
          type_id: 2,
          project_id: 1,
          is_read: false,
          read_on: null,
          created_on: new Date(),
        },
        {
          id: 4,
          user_id: 3,
          type_id: 2,
          project_id: 1,
          is_read: false,
          read_on: null,
          created_on: new Date(),
        },
      ];
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult(createdNotifications),
      );

      const result = await notificationModel.createProjectMemberNotifications(
        mockPool,
        {
          project_id: 1,
          action_user_id: 1,
          type_id: 2,
        },
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM create_project_member_notifications($1, $2, $3)',
        [1, 1, 2],
      );
      expect(result).toEqual(createdNotifications);
    });
  });
});
