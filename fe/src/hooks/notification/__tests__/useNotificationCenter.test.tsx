import { renderHook, act, waitFor } from '@testing-library/react';
import { useNotificationCenter } from '../useNotificationCenter';
import {
  getNotifications,
  markAsRead,
  deleteNotification,
} from '../../../api/notifications';
import { MemoryRouter } from 'react-router-dom';
import { Notification } from '../../../types/notification';
import logger from '../../../utils/logger';

// Mock the API functions
jest.mock('../../../api/notifications', () => ({
  getNotifications: jest.fn(),
  markAsRead: jest.fn(),
  deleteNotification: jest.fn(),
}));

// Helper to flush all pending promises
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

// Mock data
const mockNotifications: Notification[] = [
  {
    id: 1,
    user_id: 1,
    type_id: 1,
    title: 'Test Notification 1',
    message: 'Test Message 1',
    link: '/test-link-1',
    is_read: false,
    read_on: null,
    active: true,
    created_on: '2025-01-25T16:29:14.000Z',
  },
  {
    id: 2,
    user_id: 1,
    type_id: 2,
    title: 'Test Notification 2',
    message: 'Test Message 2',
    link: null,
    is_read: true,
    read_on: '2025-01-25T16:29:14.000Z',
    active: true,
    created_on: '2025-01-25T16:29:14.000Z',
  },
];

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe('useNotificationCenter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useNotificationCenter(undefined, 0), {
      wrapper,
    });

    expect(result.current.notifications).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.anchorEl).toBe(null);
  });

  it('should fetch notifications when userId is provided', async () => {
    (getNotifications as jest.Mock).mockResolvedValue(mockNotifications);

    const { result, unmount } = renderHook(() => useNotificationCenter(1, 0), {
      wrapper,
    });

    await act(async () => {
      jest.advanceTimersByTime(1);
      await flushPromises();
    });
    await waitFor(() => {
      expect(getNotifications).toHaveBeenCalledWith(expect.any(AbortSignal));
      expect(result.current.notifications).toEqual(mockNotifications);
      expect(result.current.unreadCount).toBe(1); // Only one notification is unread
    });
    await act(async () => {
      await flushPromises();
    });
    unmount();
  });

  it('should handle notification click correctly', async () => {
    (getNotifications as jest.Mock).mockResolvedValue(mockNotifications);
    (markAsRead as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useNotificationCenter(1, 0), {
      wrapper,
    });

    await act(async () => {
      await result.current.handleNotificationClick(mockNotifications[0]);
    });

    expect(markAsRead).toHaveBeenCalledWith(1);
    expect(getNotifications).toHaveBeenCalledTimes(2); // Initial fetch + after marking as read
  });

  it('should handle notification deletion', async () => {
    (getNotifications as jest.Mock).mockResolvedValue(mockNotifications);
    (deleteNotification as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useNotificationCenter(1, 0), {
      wrapper,
    });

    const mockEvent = {
      stopPropagation: jest.fn(),
    } as unknown as React.MouseEvent;

    await act(async () => {
      await result.current.handleDeleteNotification(1, mockEvent);
    });

    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(deleteNotification).toHaveBeenCalledWith(1);
    expect(getNotifications).toHaveBeenCalledTimes(2); // Initial fetch + after deletion
  });

  it('should handle anchor element for notification menu', () => {
    const { result } = renderHook(() => useNotificationCenter(1, 0), {
      wrapper,
    });

    const mockEvent = {
      currentTarget: document.createElement('button'),
    } as React.MouseEvent<HTMLButtonElement>;

    act(() => {
      result.current.handleClick(mockEvent);
    });

    expect(result.current.anchorEl).toBe(mockEvent.currentTarget);

    act(() => {
      result.current.handleClose();
    });

    expect(result.current.anchorEl).toBe(null);
  });

  it('should poll for notifications every minute', async () => {
    (getNotifications as jest.Mock).mockResolvedValue(mockNotifications);

    const { unmount } = renderHook(() => useNotificationCenter(1, 100), {
      wrapper,
    });

    // Initial fetch
    expect(getNotifications).toHaveBeenCalledTimes(1);

    // Advance time by 1 minute (simulate polling)
    await act(async () => {
      jest.advanceTimersByTime(101);
      await flushPromises();
    });
    await flushPromises();
    await waitFor(() => {
      expect(getNotifications).toHaveBeenCalledTimes(2);
    });

    unmount();
  });

  it('should mark all as read when handleMarkAllAsRead is called', async () => {
    (getNotifications as jest.Mock).mockResolvedValue(mockNotifications);
    (markAsRead as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useNotificationCenter(1, 0), {
      wrapper,
    });

    await act(async () => {
      await result.current.handleMarkAllAsRead();
    });

    expect(markAsRead).toHaveBeenCalledWith();
    expect(getNotifications).toHaveBeenCalledTimes(2); // Initial fetch + after mark all read
  });

  it('should handle API errors gracefully', async () => {
    (getNotifications as jest.Mock).mockRejectedValue(new Error('API Error'));

    const { result, unmount } = renderHook(() => useNotificationCenter(1, 0), {
      wrapper,
    });

    await act(async () => {
      jest.advanceTimersByTime(1);
      await flushPromises();
    });
    unmount();
    await flushPromises();
    await waitFor(() => {
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to load notifications',
        expect.any(Error),
      );
      expect(result.current.notifications).toEqual([]);
      expect(result.current.loading).toBe(false);
    });
  });
});
