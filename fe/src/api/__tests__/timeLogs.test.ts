import { api } from '../api';
import { TimeLog, TimeLogCreate } from '../../types/timeLog';
import {
  getAllTimeLogs,
  getTaskTimeLogs,
  getTaskSpentTime,
  getProjectTimeLogs,
  getProjectSpentTime,
  createTimeLog,
  getUserTimeLogs,
  updateTimeLog,
  deleteTimeLog,
} from '../timeLogs';

jest.mock('../api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('TimeLogs API', () => {
  const mockTimeLog: TimeLog = {
    id: 1,
    task_id: 1,
    user_id: 1,
    activity_type_id: 1,
    log_date: '2024-01-01',
    spent_time: 8,
    description: 'Test time log',
    created_on: '2024-01-01T00:00:00Z',
    updated_on: null,
    task_name: 'Test Task',
    project_name: 'Test Project',
    user: 'Test User',
    activity_type_name: 'Development',
    activity_type_color: '#000000',
    activity_type_icon: 'code',
  };

  const mockTimeLogCreate: TimeLogCreate = {
    task_id: 1,
    activity_type_id: 1,
    log_date: '2024-01-01',
    spent_time: 8,
    description: 'Test time log',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllTimeLogs', () => {
    it('should fetch all time logs', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [mockTimeLog] });

      const result = await getAllTimeLogs();

      expect(mockedApi.get).toHaveBeenCalledWith('/time-logs');
      expect(result).toEqual([mockTimeLog]);
    });

    it('should handle error when fetching all time logs', async () => {
      const error = new Error('Failed to fetch time logs');
      mockedApi.get.mockRejectedValueOnce(error);

      await expect(getAllTimeLogs()).rejects.toThrow(error);
    });
  });

  describe('getTaskTimeLogs', () => {
    it('should fetch task time logs', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [mockTimeLog] });

      const result = await getTaskTimeLogs(1);

      expect(mockedApi.get).toHaveBeenCalledWith('/time-logs/tasks/1/logs', {
        signal: undefined,
      });
      expect(result).toEqual([mockTimeLog]);
    });

    it('should handle error when fetching task time logs', async () => {
      const error = new Error('Failed to fetch task time logs');
      mockedApi.get.mockRejectedValueOnce(error);

      await expect(getTaskTimeLogs(1)).rejects.toThrow(error);
    });
  });

  describe('getTaskSpentTime', () => {
    it('should fetch task spent time', async () => {
      const mockSpentTime = { task_id: 1, spent_time: 8 };
      mockedApi.get.mockResolvedValueOnce({ data: mockSpentTime });

      const result = await getTaskSpentTime(1);

      expect(mockedApi.get).toHaveBeenCalledWith(
        '/time-logs/tasks/1/spent-time',
      );
      expect(result).toEqual(mockSpentTime);
    });
  });

  describe('getProjectTimeLogs', () => {
    it('should fetch project time logs with params', async () => {
      const params = { date: '2024-01-01' };
      mockedApi.get.mockResolvedValueOnce({ data: [mockTimeLog] });

      const result = await getProjectTimeLogs(1, params);

      expect(mockedApi.get).toHaveBeenCalledWith('/time-logs/projects/1/logs', {
        params,
      });
      expect(result).toEqual([mockTimeLog]);
    });
  });

  describe('getProjectSpentTime', () => {
    it('should fetch project spent time', async () => {
      const mockSpentTime = { task_id: 1, spent_time: 16 };
      mockedApi.get.mockResolvedValueOnce({ data: mockSpentTime });

      const result = await getProjectSpentTime(1);

      expect(mockedApi.get).toHaveBeenCalledWith(
        '/time-logs/projects/1/spent-time',
      );
      expect(result).toEqual(mockSpentTime);
    });
  });

  describe('createTimeLog', () => {
    it('should create new time log', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: mockTimeLog });

      const result = await createTimeLog(1, mockTimeLogCreate);

      expect(mockedApi.post).toHaveBeenCalledWith('/time-logs/tasks/1/logs', {
        log_date: mockTimeLogCreate.log_date,
        spent_time: mockTimeLogCreate.spent_time,
        description: mockTimeLogCreate.description,
        activity_type_id: mockTimeLogCreate.activity_type_id,
      });
      expect(result).toEqual(mockTimeLog);
    });
  });

  describe('getUserTimeLogs', () => {
    it('should fetch user time logs with params', async () => {
      const params = { date: '2024-01-01' };
      mockedApi.get.mockResolvedValueOnce({ data: [mockTimeLog] });

      const result = await getUserTimeLogs(params);

      expect(mockedApi.get).toHaveBeenCalledWith('/time-logs/user/logs', {
        params,
      });
      expect(result).toEqual([mockTimeLog]);
    });
  });

  describe('updateTimeLog', () => {
    it('should update existing time log', async () => {
      const updatedTimeLog = { ...mockTimeLog, spent_time: 4 };
      mockedApi.put.mockResolvedValueOnce({ data: updatedTimeLog });

      const result = await updateTimeLog(1, mockTimeLogCreate);

      expect(mockedApi.put).toHaveBeenCalledWith('/time-logs/1', {
        log_date: mockTimeLogCreate.log_date,
        spent_time: mockTimeLogCreate.spent_time,
        description: mockTimeLogCreate.description,
        activity_type_id: mockTimeLogCreate.activity_type_id,
      });
      expect(result).toEqual(updatedTimeLog);
    });
  });

  describe('deleteTimeLog', () => {
    it('should delete time log', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: undefined });

      await deleteTimeLog(1);

      expect(mockedApi.delete).toHaveBeenCalledWith('/time-logs/1');
    });

    it('should handle error when deleting time log', async () => {
      const error = new Error('Failed to delete time log');
      mockedApi.delete.mockRejectedValueOnce(error);

      await expect(deleteTimeLog(1)).rejects.toThrow(error);
    });
  });
});
