import { renderHook, act, waitFor } from '@testing-library/react';
import { useTaskTimeLogs } from '../useTaskTimeLogs';
import {
  getTaskTimeLogs,
  createTimeLog,
  updateTimeLog,
  deleteTimeLog,
} from '../../../api/timeLogs';
import { TimeLog, TimeLogCreate } from '../../../types/timeLog';

// Mock API calls
jest.mock('../../../api/timeLogs');

// Mock the auth context
const mockCurrentUser = { id: 1, name: 'Test User' };
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: mockCurrentUser,
  }),
}));

describe('useTaskTimeLogs', () => {
  const mockTimeLogs: TimeLog[] = [
    {
      id: 1,
      task_id: 1,
      user_id: 1,
      activity_type_id: 1,
      log_date: '2024-01-25T00:00:00Z',
      spent_time: 2,
      description: 'Test time log 1',
      created_on: '2024-01-25T00:00:00Z',
      updated_on: null,
      task_name: 'Test Task',
      project_name: 'Test Project',
      user: 'Test User',
      activity_type_name: 'Development',
      activity_type_color: '#FF0000',
      activity_type_icon: 'code',
    },
    {
      id: 2,
      task_id: 1,
      user_id: 1,
      activity_type_id: 2,
      log_date: '2024-01-25T00:00:00Z',
      spent_time: 3,
      description: 'Test time log 2',
      created_on: '2024-01-25T00:00:00Z',
      updated_on: null,
      task_name: 'Test Task',
      project_name: 'Test Project',
      user: 'Test User',
      activity_type_name: 'Meeting',
      activity_type_color: '#00FF00',
      activity_type_icon: 'group',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (getTaskTimeLogs as jest.Mock).mockResolvedValue(mockTimeLogs);
  });

  it('should load time logs successfully', async () => {
    const { result } = renderHook(() => useTaskTimeLogs('1'));

    // await waitForNextUpdate();

    await waitFor(() => {
      expect(getTaskTimeLogs).toHaveBeenCalledWith(1, expect.any(AbortSignal));
    });
    await waitFor(() => {
      expect(result.current.timeLogs).toEqual(mockTimeLogs);
    });
  });

  it('should add time log successfully', async () => {
    const newTimeLog: TimeLog = {
      id: 3,
      task_id: 1,
      user_id: 1,
      activity_type_id: 1,
      log_date: '2024-01-25T00:00:00Z',
      spent_time: 4,
      description: 'New time log',
      created_on: '2024-01-25T00:00:00Z',
      updated_on: null,
      task_name: 'Test Task',
      project_name: 'Test Project',
      user: 'Test User',
      activity_type_name: 'Development',
      activity_type_color: '#FF0000',
      activity_type_icon: 'code',
    };

    const timeLogData: TimeLogCreate = {
      task_id: 1,
      activity_type_id: 1,
      log_date: '2024-01-25T00:00:00Z',
      spent_time: 4,
      description: 'New time log',
    };

    (createTimeLog as jest.Mock).mockResolvedValue(newTimeLog);
    (getTaskTimeLogs as jest.Mock).mockResolvedValue([
      ...mockTimeLogs,
      newTimeLog,
    ]);

    const { result } = renderHook(() => useTaskTimeLogs('1'));
    // await waitForNextUpdate();

    await act(async () => {
      await result.current.handleTimeLogSubmit(timeLogData);
    });

    await waitFor(() => {
      expect(createTimeLog).toHaveBeenCalledWith(1, timeLogData);
    });
    await waitFor(() => {
      expect(result.current.timeLogs).toEqual([...mockTimeLogs, newTimeLog]);
    });
  });

  it('should delete time log successfully', async () => {
    (deleteTimeLog as jest.Mock).mockResolvedValue(undefined);
    (getTaskTimeLogs as jest.Mock).mockResolvedValue([mockTimeLogs[1]]);

    const { result } = renderHook(() => useTaskTimeLogs('1'));
    // await waitForNextUpdate();

    await act(async () => {
      await result.current.deleteTimeLog(1);
    });

    await waitFor(() => {
      expect(deleteTimeLog).toHaveBeenCalledWith(1);
    });
    await waitFor(() => {
      expect(result.current.timeLogs).toEqual([mockTimeLogs[1]]);
    });
  });

  it('should handle time log submission error', async () => {
    const error = new Error('Failed to add time log');
    (createTimeLog as jest.Mock).mockRejectedValue(error);

    const timeLogData: TimeLogCreate = {
      task_id: 1,
      activity_type_id: 1,
      log_date: '2024-01-25T00:00:00Z',
      spent_time: 4,
      description: 'New time log',
    };

    const { result } = renderHook(() => useTaskTimeLogs('1'));
    await waitFor(() => {
      expect(result.current.timeLogs).toEqual(mockTimeLogs);
    });

    await expect(
      result.current.handleTimeLogSubmit(timeLogData),
    ).rejects.toThrow('Failed to add time log');
  });

  it('should handle time log deletion error', async () => {
    const error = new Error('Failed to delete time log');
    (deleteTimeLog as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useTaskTimeLogs('1'));
    await waitFor(() => {
      expect(result.current.timeLogs).toEqual(mockTimeLogs);
    });

    await expect(result.current.deleteTimeLog(1)).rejects.toThrow(
      'Failed to delete time log',
    );
  });

  it('should handle unauthenticated user', async () => {
    // Temporarily override the mock to simulate no user
    const authModule = require('../../../context/AuthContext');
    const originalUseAuth = authModule.useAuth;
    jest.spyOn(authModule, 'useAuth').mockImplementation(() => ({
      currentUser: null,
    }));

    const timeLogData: TimeLogCreate = {
      task_id: 1,
      activity_type_id: 1,
      log_date: '2024-01-25T00:00:00Z',
      spent_time: 4,
      description: 'New time log',
    };

    const { result } = renderHook(() => useTaskTimeLogs('1'));

    await expect(
      result.current.handleTimeLogSubmit(timeLogData),
    ).rejects.toThrow('User not authenticated');

    // Restore the original mock
    jest.spyOn(authModule, 'useAuth').mockImplementation(originalUseAuth);
  });

  it('should update existing time log when timeLogId is provided', async () => {
    // Ensure auth mock is restored
    const authModule = require('../../../context/AuthContext');
    jest.spyOn(authModule, 'useAuth').mockImplementation(() => ({
      currentUser: mockCurrentUser,
    }));

    const updatedTimeLog: TimeLog = {
      ...mockTimeLogs[0],
      spent_time: 6,
      description: 'Updated time log',
    };

    const timeLogData: TimeLogCreate = {
      task_id: 1,
      activity_type_id: 1,
      log_date: '2024-01-25T00:00:00Z',
      spent_time: 6,
      description: 'Updated time log',
    };

    (updateTimeLog as jest.Mock).mockResolvedValue(updatedTimeLog);
    (getTaskTimeLogs as jest.Mock)
      .mockResolvedValueOnce(mockTimeLogs) // Initial load
      .mockResolvedValueOnce([updatedTimeLog, mockTimeLogs[1]]); // After update

    const { result } = renderHook(() => useTaskTimeLogs('1'));

    await waitFor(() => {
      expect(result.current.timeLogs).toEqual(mockTimeLogs);
    });

    await act(async () => {
      await result.current.handleTimeLogSubmit(timeLogData, mockTimeLogs[0].id);
    });

    expect(updateTimeLog).toHaveBeenCalledWith(mockTimeLogs[0].id, timeLogData);
    expect(createTimeLog).not.toHaveBeenCalled();
  });
});
