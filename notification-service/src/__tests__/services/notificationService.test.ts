jest.mock('../../db', () => ({
  pool: {
    query: jest.fn(),
  },
}));

jest.mock('../../config', () => ({
  config: { appBaseUrl: 'https://app.example.com' },
  reloadEmailConfig: jest.fn(),
}));

jest.mock('../../services/emailService', () => ({
  emailService: {
    sendEmailWithRetry: jest.fn(),
    refreshTransport: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../../metrics', () => ({
  metrics: {
    increment: jest.fn(),
    setProcessingTime: jest.fn(),
  },
}));

import { notificationService } from '../../services/notificationService';
import { pool } from '../../db';
import { reloadEmailConfig } from '../../config';
import { emailService } from '../../services/emailService';
import { metrics } from '../../metrics';
import { DatabaseNotification } from '../../types/notification-service.types';

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getEmailTemplate', () => {
    it('should return taskDueSoon for type_id 1', () => {
      expect(notificationService.getEmailTemplate(1)).toBe('taskDueSoon');
    });

    it('should return taskAssigned for type_id 2', () => {
      expect(notificationService.getEmailTemplate(2)).toBe('taskAssigned');
    });

    it('should return taskUpdated for type_id 3', () => {
      expect(notificationService.getEmailTemplate(3)).toBe('taskUpdated');
    });

    it('should return taskComment for type_id 4', () => {
      expect(notificationService.getEmailTemplate(4)).toBe('taskComment');
    });

    it('should return taskCompleted for type_id 5', () => {
      expect(notificationService.getEmailTemplate(5)).toBe('taskCompleted');
    });

    it('should return projectUpdate for type_id 6', () => {
      expect(notificationService.getEmailTemplate(6)).toBe('projectUpdate');
    });

    it('should return default for unknown type_id', () => {
      expect(notificationService.getEmailTemplate(99)).toBe('default');
    });

    it('should return default for type_id 0', () => {
      expect(notificationService.getEmailTemplate(0)).toBe('default');
    });
  });

  describe('processNewNotifications', () => {
    const mockNotifications: DatabaseNotification[] = [
      {
        id: '1',
        user_id: '100',
        type_id: 1,
        type_name: 'Task due soon',
        title: 'Task Due Soon',
        message: 'Your task is due soon',
        link: '/tasks/1',
        data: null,
        email_attempts: 1,
        created_on: new Date(),
        email: 'user@test.com',
        login: 'testuser',
      },
    ];

    it('should claim a bounded batch through the claim function', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await notificationService.processNewNotifications();

      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM get_notifications_for_service($1, $2)',
        [100, 5],
      );
    });

    it('should rebuild the transport when SMTP settings changed', async () => {
      (reloadEmailConfig as jest.Mock).mockReturnValueOnce(true);
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await notificationService.processNewNotifications();

      expect(emailService.refreshTransport).toHaveBeenCalled();
    });

    it('should keep the transport when SMTP settings are unchanged', async () => {
      (reloadEmailConfig as jest.Mock).mockReturnValueOnce(false);
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await notificationService.processNewNotifications();

      expect(emailService.refreshTransport).not.toHaveBeenCalled();
    });

    it('should send an email for each claimed notification', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: mockNotifications })
        .mockResolvedValueOnce({ rows: [] });

      await notificationService.processNewNotifications();

      expect(emailService.sendEmailWithRetry).toHaveBeenCalledWith(
        'user@test.com',
        'Task Due Soon',
        'taskDueSoon',
        {
          userName: 'testuser',
          taskUrl: 'https://app.example.com/tasks/1',
          title: 'Task Due Soon',
          message: 'Your task is due soon',
          typeName: 'Task due soon',
        },
      );
    });

    it('should count sends and record processing time', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: mockNotifications })
        .mockResolvedValueOnce({ rows: [] });

      await notificationService.processNewNotifications();

      expect(metrics.increment).toHaveBeenCalledWith('notificationsSent');
      expect(metrics.setProcessingTime).toHaveBeenCalled();
    });

    it('should mark the sent notifications in a single statement', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: mockNotifications })
        .mockResolvedValueOnce({ rows: [] });

      await notificationService.processNewNotifications();

      expect(pool.query).toHaveBeenLastCalledWith(
        expect.stringContaining('SET emailed_on = NOW()'),
        [['1']],
      );
    });

    it('should not count a failed send as sent', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: mockNotifications,
      });
      (emailService.sendEmailWithRetry as jest.Mock).mockRejectedValueOnce(
        new Error('SMTP down'),
      );

      await notificationService.processNewNotifications();

      expect(metrics.increment).toHaveBeenCalledWith('emailErrors');
      expect(metrics.increment).not.toHaveBeenCalledWith('notificationsSent');
      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('should dead-letter a notification on its final attempt', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ ...mockNotifications[0], email_attempts: 5 }],
      });
      (emailService.sendEmailWithRetry as jest.Mock).mockRejectedValueOnce(
        new Error('SMTP down'),
      );

      await notificationService.processNewNotifications();

      expect(metrics.increment).toHaveBeenCalledWith(
        'notificationsDeadLettered',
      );
    });

    it('should not dead-letter while attempts remain', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: mockNotifications,
      });
      (emailService.sendEmailWithRetry as jest.Mock).mockRejectedValueOnce(
        new Error('SMTP down'),
      );

      await notificationService.processNewNotifications();

      expect(metrics.increment).not.toHaveBeenCalledWith(
        'notificationsDeadLettered',
      );
    });

    it('should handle a claim failure gracefully', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(
        new Error('Database error'),
      );

      await notificationService.processNewNotifications();

      expect(metrics.increment).toHaveBeenCalledWith('notificationErrors');
    });

    it('should process multiple notifications', async () => {
      const multipleNotifications: DatabaseNotification[] = [
        { ...mockNotifications[0], id: '1' },
        {
          ...mockNotifications[0],
          id: '2',
          email: 'user2@test.com',
          login: 'testuser2',
        },
      ];

      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: multipleNotifications })
        .mockResolvedValue({ rows: [] });

      await notificationService.processNewNotifications();

      expect(emailService.sendEmailWithRetry).toHaveBeenCalledTimes(2);
      expect(pool.query).toHaveBeenLastCalledWith(expect.any(String), [
        ['1', '2'],
      ]);
    });
  });

  describe('markEmailed', () => {
    it('should not query when there is nothing to mark', async () => {
      await notificationService.markEmailed([]);

      expect(pool.query).not.toHaveBeenCalled();
    });

    it('should count a failed update as a notification error', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

      await notificationService.markEmailed(['1']);

      expect(metrics.increment).toHaveBeenCalledWith('notificationErrors');
    });
  });

  describe('sendNotificationEmail', () => {
    const mockNotification: DatabaseNotification = {
      id: '1',
      user_id: '100',
      type_id: 2,
      type_name: 'Task assigned',
      title: 'Task Assigned',
      message: 'A task was assigned to you',
      link: '/tasks/5',
      data: null,
      email_attempts: 1,
      created_on: new Date(),
      email: 'assignee@test.com',
      login: 'assigneeuser',
    };

    it('should send the notification with an absolute link', async () => {
      const sent =
        await notificationService.sendNotificationEmail(mockNotification);

      expect(sent).toBe(true);
      expect(emailService.sendEmailWithRetry).toHaveBeenCalledWith(
        'assignee@test.com',
        'Task Assigned',
        'taskAssigned',
        {
          userName: 'assigneeuser',
          taskUrl: 'https://app.example.com/tasks/5',
          title: 'Task Assigned',
          message: 'A task was assigned to you',
          typeName: 'Task assigned',
        },
      );
    });

    it('should fall back to the base url when there is no link', async () => {
      await notificationService.sendNotificationEmail({
        ...mockNotification,
        link: '',
      });

      expect(emailService.sendEmailWithRetry).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ taskUrl: 'https://app.example.com' }),
      );
    });

    it('should expose the data payload to the template', async () => {
      await notificationService.sendNotificationEmail({
        ...mockNotification,
        data: { taskName: 'Write report', priority: 'High' },
      });

      expect(emailService.sendEmailWithRetry).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ taskName: 'Write report', priority: 'High' }),
      );
    });

    it('should let named fields win over the data payload', async () => {
      await notificationService.sendNotificationEmail({
        ...mockNotification,
        data: { title: 'from data', userName: 'from data' },
      });

      expect(emailService.sendEmailWithRetry).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          title: 'Task Assigned',
          userName: 'assigneeuser',
        }),
      );
    });

    it('should not touch the database', async () => {
      await notificationService.sendNotificationEmail(mockNotification);

      expect(pool.query).not.toHaveBeenCalled();
    });

    it('should report failure and count an email error', async () => {
      (emailService.sendEmailWithRetry as jest.Mock).mockRejectedValueOnce(
        new Error('Email failed'),
      );

      const sent =
        await notificationService.sendNotificationEmail(mockNotification);

      expect(sent).toBe(false);
      expect(metrics.increment).toHaveBeenCalledWith('emailErrors');
    });
  });
});
