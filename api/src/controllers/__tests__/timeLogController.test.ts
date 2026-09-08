import { Request, Response } from 'express';
import { Pool } from 'pg';
import * as timeLogController from '../timeLogController';
import * as timeLogModel from '../../models/timeLogModel';
import { Session } from 'express-session';
import { CustomRequest } from '../../types/express';

// Mock the model
jest.mock('../../models/timeLogModel');

describe('TimeLogController', () => {
  let mockReq: any;
  let mockRes: Partial<Response>;
  let mockPool: Partial<Pool>;

  beforeEach(() => {
    const mockSession = {
      id: 'test-session-id',
      cookie: {
        originalMaxAge: null,
        expires: undefined,
        secure: false,
        httpOnly: true,
        path: '/',
        domain: undefined,
        sameSite: 'strict',
      },
      regenerate: jest.fn((callback: (err: any) => void) => {
        callback(null);
        return mockSession as unknown as Session;
      }),
      destroy: jest.fn((callback: (err: any) => void) => {
        callback(null);
        return mockSession as unknown as Session;
      }),
      reload: jest.fn((callback: (err: any) => void) => {
        callback(null);
        return mockSession as unknown as Session;
      }),
      resetMaxAge: jest.fn().mockReturnThis(),
      touch: jest.fn(),
      save: jest.fn((callback?: (err: any) => void) => {
        if (callback) callback(null);
        return mockSession as unknown as Session;
      }),
      user: {
        id: '1',
        login: 'test',
        role_id: 1,
      },
    } as unknown as Session &
      Partial<{ user: { id: string; login: string; role_id: number } }>;

    mockReq = {
      params: {},
      query: {},
      body: {},
      session: mockSession,
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockPool = {};
    jest.clearAllMocks();
  });

  describe('getAllTimeLogs', () => {
    it('should return all time logs', async () => {
      const mockTimeLogs = [
        { id: '1', task_id: '1', spent_time: 2.5 },
        { id: '2', task_id: '2', spent_time: 3.0 },
      ];
      (timeLogModel.getAllTimeLogs as jest.Mock).mockResolvedValue(
        mockTimeLogs,
      );

      await timeLogController.getAllTimeLogs(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(timeLogModel.getAllTimeLogs).toHaveBeenCalledWith(
        mockPool,
        { limit: 500, offset: 0 },
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockTimeLogs);
    });

    it('should handle errors', async () => {
      (timeLogModel.getAllTimeLogs as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await timeLogController.getAllTimeLogs(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
      });
    });
  });

  describe('getTaskTimeLogs', () => {
    it('should return time logs for a task', async () => {
      const mockTimeLogs = [{ id: '1', task_id: '1', spent_time: 2.5 }];
      mockReq.params = { taskId: '1' };
      mockReq.query = { startDate: '2024-01-01' };
      (timeLogModel.getTaskTimeLogs as jest.Mock).mockResolvedValue(
        mockTimeLogs,
      );

      await timeLogController.getTaskTimeLogs(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(timeLogModel.getTaskTimeLogs).toHaveBeenCalledWith(mockPool, '1', {
        startDate: '2024-01-01',
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockTimeLogs);
    });

    it('should handle errors', async () => {
      mockReq.params = { taskId: '1' };
      (timeLogModel.getTaskTimeLogs as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await timeLogController.getTaskTimeLogs(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
      });
    });
  });

  describe('getTaskSpentTime', () => {
    it('should return task spent time', async () => {
      const mockSpentTime = { total_spent: 5.5 };
      mockReq.params = { taskId: '1' };
      (timeLogModel.getTaskSpentTime as jest.Mock).mockResolvedValue(
        mockSpentTime,
      );

      await timeLogController.getTaskSpentTime(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(timeLogModel.getTaskSpentTime).toHaveBeenCalledWith(mockPool, '1');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockSpentTime);
    });

    it('should handle errors', async () => {
      mockReq.params = { taskId: '1' };
      (timeLogModel.getTaskSpentTime as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await timeLogController.getTaskSpentTime(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
      });
    });
  });

  describe('getProjectTimeLogs', () => {
    it('should return project time logs', async () => {
      const mockTimeLogs = [
        { id: '1', task_id: '1', project_id: '1', spent_time: 2.5 },
      ];
      mockReq.params = { projectId: '1' };
      (timeLogModel.getProjectTimeLogs as jest.Mock).mockResolvedValue(
        mockTimeLogs,
      );

      await timeLogController.getProjectTimeLogs(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(timeLogModel.getProjectTimeLogs).toHaveBeenCalledWith(
        mockPool,
        '1',
        {},
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockTimeLogs);
    });

    it('should handle errors', async () => {
      mockReq.params = { projectId: '1' };
      (timeLogModel.getProjectTimeLogs as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await timeLogController.getProjectTimeLogs(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
      });
    });
  });

  describe('getProjectSpentTime', () => {
    it('should return project spent time', async () => {
      const mockSpentTime = { total_spent: 15.5 };
      mockReq.params = { projectId: '1' };
      (timeLogModel.getProjectSpentTime as jest.Mock).mockResolvedValue(
        mockSpentTime,
      );

      await timeLogController.getProjectSpentTime(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(timeLogModel.getProjectSpentTime).toHaveBeenCalledWith(
        mockPool,
        '1',
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockSpentTime);
    });

    it('should handle errors', async () => {
      mockReq.params = { projectId: '1' };
      (timeLogModel.getProjectSpentTime as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await timeLogController.getProjectSpentTime(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
      });
    });
  });

  describe('createTimeLog', () => {
    it('should create a time log successfully', async () => {
      const mockTimeLogData = {
        log_date: new Date(),
        spent_time: 2.5,
        description: 'Test time log',
        activity_type_id: 1,
      };
      const createdTimeLog = {
        id: '1',
        task_id: '1',
        user_id: '1',
        ...mockTimeLogData,
      };
      mockReq.params = { taskId: '1' };
      mockReq.body = mockTimeLogData;
      (timeLogModel.createTimeLog as jest.Mock).mockResolvedValue(
        createdTimeLog,
      );

      await timeLogController.createTimeLog(
        mockReq as CustomRequest,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(timeLogModel.createTimeLog).toHaveBeenCalledWith(
        mockPool,
        '1',
        '1',
        mockTimeLogData,
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(createdTimeLog);
    });

    it('should return 401 when user not authenticated', async () => {
      mockReq.session.user = undefined;
      mockReq.params = { taskId: '1' };
      mockReq.body = {
        spent_time: 2.5,
        description: 'Test',
        activity_type_id: 1,
      };

      await timeLogController.createTimeLog(
        mockReq as CustomRequest,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'User not authenticated',
      });
    });

    it('should return 400 when required fields missing', async () => {
      mockReq.params = { taskId: '1' };
      mockReq.body = { description: 'Test' }; // Missing spent_time and activity_type_id

      await timeLogController.createTimeLog(
        mockReq as CustomRequest,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Missing required fields',
      });
    });

    it('should handle errors', async () => {
      mockReq.params = { taskId: '1' };
      mockReq.body = {
        spent_time: 2.5,
        description: 'Test',
        activity_type_id: 1,
      };
      (timeLogModel.createTimeLog as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await timeLogController.createTimeLog(
        mockReq as CustomRequest,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
      });
    });
  });

  describe('updateTimeLog', () => {
    it('should update a time log successfully', async () => {
      const mockUpdateData = {
        log_date: new Date(),
        spent_time: 3.0,
        description: 'Updated description',
        activity_type_id: 2,
      };
      const updatedTimeLog = { id: '1', ...mockUpdateData };
      mockReq.params = { timeLogId: '1' };
      mockReq.body = mockUpdateData;
      (timeLogModel.updateTimeLog as jest.Mock).mockResolvedValue(
        updatedTimeLog,
      );

      await timeLogController.updateTimeLog(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(timeLogModel.updateTimeLog).toHaveBeenCalledWith(
        mockPool,
        '1',
        mockUpdateData,
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(updatedTimeLog);
    });

    it('should not forward fields the request body omitted', async () => {
      mockReq.params = { timeLogId: '1' };
      mockReq.body = { spent_time: 4.5 };
      (timeLogModel.updateTimeLog as jest.Mock).mockResolvedValue({ id: '1' });

      await timeLogController.updateTimeLog(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(timeLogModel.updateTimeLog).toHaveBeenCalledWith(mockPool, '1', {
        spent_time: 4.5,
      });
    });

    it('should return 404 when the time log does not exist', async () => {
      mockReq.params = { timeLogId: '99' };
      mockReq.body = { spent_time: 1 };
      (timeLogModel.updateTimeLog as jest.Mock).mockResolvedValue(null);

      await timeLogController.updateTimeLog(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Time log not found',
      });
    });

    it('should handle errors', async () => {
      mockReq.params = { timeLogId: '1' };
      mockReq.body = { spent_time: 3.0 };
      (timeLogModel.updateTimeLog as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await timeLogController.updateTimeLog(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
      });
    });
  });

  describe('deleteTimeLog', () => {
    it('should delete a time log successfully', async () => {
      mockReq.params = { timeLogId: '1' };
      (timeLogModel.deleteTimeLog as jest.Mock).mockResolvedValue(undefined);

      await timeLogController.deleteTimeLog(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(timeLogModel.deleteTimeLog).toHaveBeenCalledWith(mockPool, '1');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Time log deleted successfully',
      });
    });

    it('should handle errors', async () => {
      mockReq.params = { timeLogId: '1' };
      (timeLogModel.deleteTimeLog as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await timeLogController.deleteTimeLog(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
      });
    });
  });

  describe('getUserTimeLogs', () => {
    it('should return user time logs', async () => {
      const mockTimeLogs = [{ id: '1', user_id: '1', spent_time: 2.5 }];
      (timeLogModel.getUserTimeLogs as jest.Mock).mockResolvedValue(
        mockTimeLogs,
      );

      await timeLogController.getUserTimeLogs(
        mockReq as CustomRequest,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(timeLogModel.getUserTimeLogs).toHaveBeenCalledWith(
        mockPool,
        '1',
        {},
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockTimeLogs);
    });

    it('should return 401 when user not authenticated', async () => {
      mockReq.session.user = undefined;

      await timeLogController.getUserTimeLogs(
        mockReq as CustomRequest,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'User not authenticated',
      });
    });

    it('should handle errors', async () => {
      (timeLogModel.getUserTimeLogs as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await timeLogController.getUserTimeLogs(
        mockReq as CustomRequest,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
      });
    });
  });
});
