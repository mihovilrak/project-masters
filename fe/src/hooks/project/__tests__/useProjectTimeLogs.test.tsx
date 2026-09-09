import { renderHook, act } from '@testing-library/react';
import { useProjectTimeLogs } from '../useProjectTimeLogs';
import {
  getProjectTimeLogs,
  getTaskTimeLogs,
  createTimeLog,
  updateTimeLog,
  deleteTimeLog,
} from '../../../api/timeLogs';
import { TimeLog, TimeLogCreate } from '../../../types/timeLog';
import logger from '../../../utils/logger';

// Mock dependencies
jest.mock('../../../api/timeLogs');
jest.mock('../../../api/tasks');

import { getProjectTasks, getSubtasks } from '../../../api/tasks';

describe('useProjectTimeLogs', () => {
  const mockTimeLogs: TimeLog[] = [
    {
      id: 1,
      task_id: 1,
      user_id: 1,
      log_date: '2024-01-01',
      spent_time: 4,
      activity_type_id: 1,
      description: 'Work on feature',
      created_on: '2024-01-01',
      task_name: 'Task 1',
    },
    {
      id: 2,
      task_id: 2,
      user_id: 1,
      log_date: '2024-01-02',
      spent_time: 6,
      activity_type_id: 1,
      description: 'Bug fixing',
      created_on: '2024-01-02',
      task_name: 'Task 2',
    },
  ];

  const mockTimeLogCreate: TimeLogCreate = {
    task_id: 3,
    log_date: '2024-01-03',
    spent_time: 2,
    activity_type_id: 1,
    description: 'New work',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock getProjectTasks to return tasks with IDs 1 and 2 (matching mockTimeLogs)
    (getProjectTasks as jest.Mock).mockResolvedValue([
      { id: 1, name: 'Task 1' },
      { id: 2, name: 'Task 2' },
    ]);
    // Mock getTaskTimeLogs to return logs for each task
    (getTaskTimeLogs as jest.Mock).mockImplementation((taskId: number) => {
      return Promise.resolve(
        mockTimeLogs.filter((log) => log.task_id === taskId),
      );
    });
    // Keep the original mock for getProjectTimeLogs if needed elsewhere
    (getProjectTimeLogs as jest.Mock).mockResolvedValue(mockTimeLogs);
    // Mock getSubtasks to return an empty array by default
    (getSubtasks as jest.Mock).mockResolvedValue([]);
  });

  it('should fetch project time logs on mount', async () => {
    const { result } = renderHook(() => useProjectTimeLogs('1'));

    await act(async () => {
      await result.current.loadTimeLogs();
    });

    expect(getProjectTasks).toHaveBeenCalledWith(1);
    expect(getTaskTimeLogs).toHaveBeenCalledTimes(2);
    expect(getTaskTimeLogs).toHaveBeenCalledWith(1);
    expect(getTaskTimeLogs).toHaveBeenCalledWith(2);
    expect(result.current.timeLogs).toEqual(
      expect.arrayContaining(mockTimeLogs),
    );
    expect(mockTimeLogs).toEqual(
      expect.arrayContaining(result.current.timeLogs),
    );
    expect(result.current.timeLogs).toHaveLength(mockTimeLogs.length);
  });

  it('loads task time logs in parallel', async () => {
    let activeRequests = 0;
    let maxActiveRequests = 0;
    (getTaskTimeLogs as jest.Mock).mockImplementation(
      async (taskId: number) => {
        activeRequests += 1;
        maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
        await new Promise((resolve) => setTimeout(resolve, 0));
        activeRequests -= 1;
        return mockTimeLogs.filter((log) => log.task_id === taskId);
      },
    );
    const { result } = renderHook(() => useProjectTimeLogs('1'));

    await act(async () => {
      await result.current.loadTimeLogs();
    });

    expect(maxActiveRequests).toBe(2);
    expect(result.current.timeLogs).toEqual(mockTimeLogs);
  });

  it('should handle time log creation', async () => {
    // Mock getProjectTasks to include the new task
    (getProjectTasks as jest.Mock).mockResolvedValue([
      { id: 1, name: 'Task 1' },
      { id: 2, name: 'Task 2' },
      { id: 3, name: 'Task 3' },
    ]);
    const { result } = renderHook(() => useProjectTimeLogs('1'));
    const newTimeLog = {
      ...mockTimeLogCreate,
      id: 3,
      user_id: 1,
      created_on: '2024-01-03',
      task_name: 'Task 3',
    };
    (createTimeLog as jest.Mock).mockResolvedValue(newTimeLog);
    (getTaskTimeLogs as jest.Mock).mockImplementation((taskId: number) => {
      if (taskId === 3) return Promise.resolve([newTimeLog]);
      return Promise.resolve(
        mockTimeLogs.filter((log) => log.task_id === taskId),
      );
    });

    await act(async () => {
      await result.current.handleTimeLogSubmit(mockTimeLogCreate);
    });

    expect(createTimeLog).toHaveBeenCalledWith(
      mockTimeLogCreate.task_id,
      mockTimeLogCreate,
    );
    expect(result.current.timeLogs).toEqual([...mockTimeLogs, newTimeLog]);
  });

  it('should handle time log update', async () => {
    const { result } = renderHook(() => useProjectTimeLogs('1'));

    // Set selected time log for editing
    act(() => {
      result.current.setSelectedTimeLog(mockTimeLogs[0]);
    });

    const updatedTimeLog = {
      ...mockTimeLogs[0],
      spent_time: 8,
      description: 'Updated description',
    };

    (updateTimeLog as jest.Mock).mockResolvedValue(updatedTimeLog);
    (getTaskTimeLogs as jest.Mock).mockImplementation((taskId: number) => {
      if (taskId === 1) return Promise.resolve([updatedTimeLog]);
      return Promise.resolve(
        mockTimeLogs.filter((log) => log.task_id === taskId),
      );
    });

    await act(async () => {
      await result.current.handleTimeLogSubmit({
        task_id: 1,
        log_date: '2024-01-01',
        spent_time: 8,
        activity_type_id: 1,
        description: 'Updated description',
      });
    });

    expect(updateTimeLog).toHaveBeenCalledWith(
      mockTimeLogs[0].id,
      expect.objectContaining({
        spent_time: 8,
        description: 'Updated description',
      }),
    );
    expect(createTimeLog).not.toHaveBeenCalled();
  });

  it('should handle time log deletion', async () => {
    const { result } = renderHook(() => useProjectTimeLogs('1'));
    (deleteTimeLog as jest.Mock).mockResolvedValue(undefined);
    // Remove the deleted log from mockTimeLogs for this test
    (getTaskTimeLogs as jest.Mock).mockImplementation((taskId: number) => {
      if (taskId === 2) return Promise.resolve([mockTimeLogs[1]]);
      return Promise.resolve([]);
    });

    await act(async () => {
      await result.current.handleTimeLogDelete(1);
    });

    expect(deleteTimeLog).toHaveBeenCalledWith(1);
    expect(result.current.timeLogs).toEqual([mockTimeLogs[1]]);
  });

  it('should handle error during time log operations', async () => {
    // Ensure the mock is resolved for initialization
    (createTimeLog as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useProjectTimeLogs('1'));

    // Only the next call should reject
    (createTimeLog as jest.Mock).mockImplementationOnce(() =>
      Promise.reject(new Error('Failed to create time log')),
    );

    await act(async () => {
      try {
        await result.current.handleTimeLogSubmit(mockTimeLogCreate);
      } catch (error) {
        // Error is expected to be thrown after logging
        expect(error).toBeInstanceOf(Error);
      }
    });
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to submit time log:',
      expect.any(Error),
    );
    // Restore the resolved mock for other tests
    (createTimeLog as jest.Mock).mockResolvedValue(undefined);
  });

  it('should manage time log dialog state', () => {
    const { result } = renderHook(() => useProjectTimeLogs('1'));

    act(() => {
      result.current.setTimeLogDialogOpen(true);
    });
    expect(result.current.timeLogDialogOpen).toBe(true);

    act(() => {
      result.current.setTimeLogDialogOpen(false);
    });
    expect(result.current.timeLogDialogOpen).toBe(false);
  });

  it('should manage selected time log', () => {
    const { result } = renderHook(() => useProjectTimeLogs('1'));

    act(() => {
      result.current.setSelectedTimeLog(mockTimeLogs[0]);
    });
    expect(result.current.selectedTimeLog).toEqual(mockTimeLogs[0]);

    act(() => {
      result.current.setSelectedTimeLog(null);
    });
    expect(result.current.selectedTimeLog).toBeNull();
  });
});
