import { api } from '../api';
import { Notification } from '../../types/notification';
import {
  getNotifications,
  markAsRead,
  deleteNotification,
} from '../notifications';

jest.mock('../api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('Notifications API', () => {
  const mockNotification: Notification = {
    id: 1,
    user_id: 1,
    type_id: 1,
    title: 'Test Notification',
    message: 'This is a test notification',
    link: null,
    is_read: false,
    read_on: null,
    active: true,
    created_on: '2023-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getNotifications', () => {
    it('should fetch notifications for a user', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [mockNotification] });

      const notifications = await getNotifications();

      expect(mockedApi.get).toHaveBeenCalledWith('/notifications', {
        signal: undefined,
      });
      expect(notifications).toEqual([mockNotification]);
    });

    it('should throw error when fetch fails', async () => {
      const error = new Error('Network error');
      mockedApi.get.mockRejectedValueOnce(error);

      await expect(getNotifications()).rejects.toThrow(error);
      expect(mockedApi.get).toHaveBeenCalledWith('/notifications', {
        signal: undefined,
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark notifications as read', async () => {
      mockedApi.patch.mockResolvedValueOnce({ data: undefined });

      await markAsRead(1);

      expect(mockedApi.patch).toHaveBeenCalledWith('/notifications', {
        notification_id: 1,
      });
    });

    it('should throw error when marking as read fails', async () => {
      const error = new Error('Update failed');
      mockedApi.patch.mockRejectedValueOnce(error);

      await expect(markAsRead(1)).rejects.toThrow(error);
      expect(mockedApi.patch).toHaveBeenCalledWith('/notifications', {
        notification_id: 1,
      });
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: undefined });

      await deleteNotification(1);

      expect(mockedApi.delete).toHaveBeenCalledWith('/notifications/1');
    });

    it('should throw error when deletion fails', async () => {
      const error = new Error('Delete failed');
      mockedApi.delete.mockRejectedValueOnce(error);

      await expect(deleteNotification(1)).rejects.toThrow(error);
      expect(mockedApi.delete).toHaveBeenCalledWith('/notifications/1');
    });
  });
});
