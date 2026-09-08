import { Request, Response } from 'express';
import { Pool } from 'pg';
import { CustomRequest } from '../../types/express';
import * as taskController from '../taskController';
import * as taskModel from '../../models/taskModel';
import * as notificationModel from '../../models/notificationModel';
import {
  TaskCreateInput,
  TaskUpdateInput,
  TaskStatus,
  TaskPriority,
} from '../../types/task';
import { Session } from 'express-session';

// Mock the models
jest.mock('../../models/taskModel');
jest.mock('../../models/notificationModel');
jest.mock('../../models/accessModel', () => ({
  resolveProjectScope: jest.fn(async (_pool: unknown, userId: string) => userId),
}));

describe('TaskController', () => {
  let mockReq: Partial<Request & CustomRequest>;
  let mockRes: Partial<Response>;
  let mockPool: Partial<Pool>;
  let mockClient: { query: jest.Mock; release: jest.Mock };

  beforeEach(() => {
    // Create a partial mock Session object with required properties
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
      regenerate: (callback: (err: any) => void) => callback(null),
      destroy: (callback: (err: any) => void) => callback(null),
      reload: (callback: (err: any) => void) => callback(null),
      resetMaxAge: () => {},
      touch: (callback: (err: any) => void) => callback(null),
      save: (callback: (err: any) => void) => callback(null),
      user: {
        id: '1',
        login: 'test',
        role_id: 1,
      },
    } as Session &
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
    // Handlers that write run inside withTransaction, so the models receive the
    // pooled client rather than the pool itself.
    mockClient = { query: jest.fn().mockResolvedValue({ rows: [] }), release: jest.fn() };
    mockPool = { connect: jest.fn().mockResolvedValue(mockClient) } as unknown as Partial<Pool>;
    jest.clearAllMocks();
  });

  describe('getTasks', () => {
    it('should return all tasks when no filters are provided', async () => {
      const taskId = '123';
      const mockTask = {
        id: taskId,
        name: 'Test Task',
        description: 'Test Description',
        start_date: new Date(),
        due_date: new Date(),
        priority_id: '1',
        status_id: '1',
        type_id: '1',
        project_id: '1',
        holder_id: '1',
        assignee_id: '2',
        created_by: '1',
        created_on: new Date(),
        updated_on: new Date(),
      };
      (taskModel.getTasks as jest.Mock).mockResolvedValue([mockTask]);

      await taskController.getTasks(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(taskModel.getTasks).toHaveBeenCalledWith(
        mockPool,
        undefined,
        { limit: 500, offset: 0 },
        '1',
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith([mockTask]);
    });

    it('should return project tasks when project_id is provided', async () => {
      const projectId = '123';
      const mockTasks = [
        {
          id: '1',
          name: 'Project Task',
          description: 'Test Description',
          start_date: new Date(),
          due_date: new Date(),
          priority_id: '1',
          status_id: '1',
          type_id: '1',
          project_id: projectId,
          holder_id: '1',
          assignee_id: '2',
          created_by: '1',
          created_on: new Date(),
          updated_on: new Date(),
        },
      ];
      mockReq.query = { project_id: projectId };
      (taskModel.getTasksByProject as jest.Mock).mockResolvedValue(mockTasks);

      await taskController.getTasks(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(taskModel.getTasksByProject).toHaveBeenCalledWith(
        mockPool,
        projectId,
        { limit: 500, offset: 0 },
        '1',
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockTasks);
    });

    it('should return tasks filtered by assignee_id when provided', async () => {
      const assigneeId = '123';
      const mockTasks = [
        {
          id: '1',
          name: 'Assigned Task',
          description: 'Test Description',
          start_date: new Date(),
          due_date: new Date(),
          priority_id: '1',
          status_id: '1',
          type_id: '1',
          project_id: '1',
          holder_id: '1',
          assignee_id: assigneeId,
          created_by: '1',
          created_on: new Date(),
          updated_on: new Date(),
        },
      ];
      mockReq.query = { assignee_id: assigneeId };
      (taskModel.getTasks as jest.Mock).mockResolvedValue(mockTasks);

      await taskController.getTasks(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(taskModel.getTasks).toHaveBeenCalledWith(
        mockPool,
        { assignee_id: Number(assigneeId) },
        { limit: 500, offset: 0 },
        '1',
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockTasks);
    });

    it('should return tasks filtered by holder_id when provided', async () => {
      const holderId = '123';
      const mockTasks = [
        {
          id: '1',
          name: 'Held Task',
          description: 'Test Description',
          start_date: new Date(),
          due_date: new Date(),
          priority_id: '1',
          status_id: '1',
          type_id: '1',
          project_id: '1',
          holder_id: holderId,
          assignee_id: '2',
          created_by: '1',
          created_on: new Date(),
          updated_on: new Date(),
        },
      ];
      mockReq.query = { holder_id: holderId };
      (taskModel.getTasks as jest.Mock).mockResolvedValue(mockTasks);

      await taskController.getTasks(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(taskModel.getTasks).toHaveBeenCalledWith(
        mockPool,
        { holder_id: Number(holderId) },
        { limit: 500, offset: 0 },
        '1',
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockTasks);
    });

    it('should pass array filter when status_id is comma-separated', async () => {
      const mockTasks: any[] = [];
      mockReq.query = { status_id: '1,2' };
      (taskModel.getTasks as jest.Mock).mockResolvedValue(mockTasks);

      await taskController.getTasks(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(taskModel.getTasks).toHaveBeenCalledWith(
        mockPool,
        expect.objectContaining({ status_id: [1, 2] }),
        { limit: 500, offset: 0 },
        '1',
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should not set priority_id when value is invalid (no 500)', async () => {
      mockReq.query = { priority_id: 'abc' };
      (taskModel.getTasks as jest.Mock).mockResolvedValue([]);

      await taskController.getTasks(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(taskModel.getTasks).toHaveBeenCalledWith(
        mockPool,
        undefined,
        { limit: 500, offset: 0 },
        '1',
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle errors appropriately', async () => {
      (taskModel.getTasks as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await taskController.getTasks(
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

  describe('getTaskById', () => {
    it('should return a task when it exists', async () => {
      const taskId = '123';
      const mockTask = {
        id: taskId,
        name: 'Test Task',
        description: 'Test Description',
        start_date: new Date(),
        due_date: new Date(),
        priority_id: '1',
        status_id: '1',
        type_id: '1',
        project_id: '1',
        holder_id: '1',
        assignee_id: '2',
        created_by: '1',
        created_on: new Date(),
        updated_on: new Date(),
      };
      mockReq.params = { id: taskId };
      (taskModel.getTaskById as jest.Mock).mockResolvedValue(mockTask);

      await taskController.getTaskById(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(taskModel.getTaskById).toHaveBeenCalledWith(mockPool, taskId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockTask);
    });

    it('should return 404 when task does not exist', async () => {
      const taskId = '123';
      mockReq.params = { id: taskId };
      (taskModel.getTaskById as jest.Mock).mockResolvedValue(null);

      await taskController.getTaskById(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Task not found' });
    });
  });

  describe('getTaskByAssignee', () => {
    it('should return tasks for a given assignee', async () => {
      const assigneeId = '123';
      const mockTasks = [
        {
          id: '1',
          name: 'Test Task',
          description: 'Test Description',
          start_date: new Date(),
          due_date: new Date(),
          priority_id: '1',
          status_id: '1',
          type_id: '1',
          project_id: '1',
          holder_id: '1',
          assignee_id: assigneeId,
          created_by: '1',
          created_on: new Date(),
          updated_on: new Date(),
        },
      ];
      mockReq.query = { assignee_id: assigneeId };
      (taskModel.getTasks as jest.Mock).mockResolvedValue(mockTasks);

      await taskController.getTaskByAssignee(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(taskModel.getTasks).toHaveBeenCalledWith(mockPool, {
        whereParams: { assignee_id: Number(assigneeId) },
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockTasks);
    });

    it('should return 404 when no tasks are found', async () => {
      mockReq.query = { assignee_id: '123' };
      (taskModel.getTasks as jest.Mock).mockResolvedValue([]);

      await taskController.getTaskByAssignee(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No tasks assigned',
      });
    });
  });

  describe('getTaskByHolder', () => {
    it('should return tasks for a given holder', async () => {
      const holderId = '123';
      const mockTasks = [
        {
          id: '1',
          name: 'Test Task',
          description: 'Test Description',
          start_date: new Date(),
          due_date: new Date(),
          priority_id: '1',
          status_id: '1',
          type_id: '1',
          project_id: '1',
          holder_id: holderId,
          assignee_id: '2',
          created_by: '1',
          created_on: new Date(),
          updated_on: new Date(),
        },
      ];
      mockReq.query = { holder_id: holderId };
      (taskModel.getTasks as jest.Mock).mockResolvedValue(mockTasks);

      await taskController.getTaskByHolder(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(taskModel.getTasks).toHaveBeenCalledWith(mockPool, {
        whereParams: { holder_id: Number(holderId) },
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockTasks);
    });

    it('should return 404 when no tasks are found', async () => {
      mockReq.query = { holder_id: '123' };
      (taskModel.getTasks as jest.Mock).mockResolvedValue([]);

      await taskController.getTaskByHolder(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No tasks assigned',
      });
    });
  });

  describe('createTask', () => {
    const mockTaskData: TaskCreateInput = {
      name: 'Test Task',
      description: 'Test Description',
      start_date: new Date(),
      due_date: new Date(),
      priority_id: 1,
      status_id: 1,
      type_id: 1,
      project_id: 1,
      holder_id: 1,
      assignee_id: 2,
      created_by: 1,
      estimated_time: 2,
      tags: [
        {
          id: 1,
          name: 'Test Tag',
          color: '#000000',
          icon: 'Label',
          active: true,
          created_on: new Date(),
          updated_on: new Date(),
        },
      ],
    };

    it('should create a task successfully', async () => {
      mockReq.body = mockTaskData;
      const createdTask = { task_id: '1', ...mockTaskData };
      (taskModel.createTask as jest.Mock).mockResolvedValue(createdTask);

      await taskController.createTask(
        mockReq as CustomRequest,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(taskModel.createTask).toHaveBeenCalled();
      expect(notificationModel.createWatcherNotifications).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(createdTask);
    });

    it('should return 400 when required fields are missing', async () => {
      mockReq.body = { name: 'Test Task' }; // Missing required fields

      await taskController.createTask(
        mockReq as CustomRequest,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Missing required fields',
          missingFields: expect.any(Array),
        }),
      );
    });
  });

  describe('updateTask', () => {
    const mockUpdateData: TaskUpdateInput = {
      name: 'Updated Task',
      status_id: 2,
    };

    it('should update a task successfully', async () => {
      const taskId = '123';
      mockReq.params = { id: taskId };
      mockReq.body = mockUpdateData;
      const updatedTask = {
        id: taskId,
        name: 'Updated Task',
        description: 'Test Description',
        start_date: new Date(),
        due_date: new Date(),
        priority_id: '1',
        status_id: '2',
        type_id: '1',
        project_id: '1',
        holder_id: '1',
        assignee_id: '2',
        created_by: '1',
        created_on: new Date(),
        updated_on: new Date(),
      };
      (taskModel.updateTask as jest.Mock).mockResolvedValue(updatedTask);

      await taskController.updateTask(
        mockReq as CustomRequest,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(taskModel.updateTask).toHaveBeenCalledWith(
        mockClient,
        taskId,
        mockUpdateData,
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(updatedTask);
    });

    it('should return 404 when task is not found', async () => {
      mockReq.params = { id: '123' };
      mockReq.body = mockUpdateData;
      (taskModel.updateTask as jest.Mock).mockResolvedValue(null);

      await taskController.updateTask(
        mockReq as CustomRequest,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Task not found' });
    });
  });

  describe('changeTaskStatus', () => {
    it('should change task status successfully', async () => {
      const taskId = '123';
      const newStatusId = 2;
      mockReq.params = { id: taskId };
      mockReq.body = { statusId: newStatusId };
      const updatedTask = {
        id: taskId,
        name: 'Test Task',
        description: 'Test Description',
        start_date: new Date(),
        due_date: new Date(),
        priority_id: '1',
        status_id: newStatusId,
        type_id: '1',
        project_id: '1',
        holder_id: '1',
        assignee_id: '2',
        created_by: '1',
        created_on: new Date(),
        updated_on: new Date(),
      };
      (taskModel.changeTaskStatus as jest.Mock).mockResolvedValue(updatedTask);

      await taskController.changeTaskStatus(
        mockReq as CustomRequest,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(taskModel.changeTaskStatus).toHaveBeenCalledWith(
        mockClient,
        Number(taskId),
        newStatusId,
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(updatedTask);
    });

    it('should return 404 when task is not found', async () => {
      mockReq.params = { id: '123' };
      mockReq.body = { statusId: 2 };
      (taskModel.changeTaskStatus as jest.Mock).mockResolvedValue(null);

      await taskController.changeTaskStatus(
        mockReq as CustomRequest,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unable to update task status',
      });
    });
  });

  describe('deleteTask', () => {
    it('should delete a task successfully', async () => {
      const taskId = '123';
      mockReq.params = { id: taskId };
      (taskModel.deleteTask as jest.Mock).mockResolvedValue({ success: true });

      await taskController.deleteTask(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(taskModel.deleteTask).toHaveBeenCalledWith(mockPool, taskId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
    });

    it('should handle errors appropriately', async () => {
      mockReq.params = { id: '123' };
      (taskModel.deleteTask as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await taskController.deleteTask(
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

  describe('getTaskStatuses', () => {
    it('should return all task statuses', async () => {
      const mockStatuses: TaskStatus[] = [
        {
          id: 1,
          name: 'To Do',
          color: '#ff0000',
          active: true,
          created_on: new Date(),
          updated_on: null,
        },
        {
          id: 2,
          name: 'In Progress',
          color: '#00ff00',
          active: true,
          created_on: new Date(),
          updated_on: null,
        },
      ];
      (taskModel.getTaskStatuses as jest.Mock).mockResolvedValue(mockStatuses);

      await taskController.getTaskStatuses(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(taskModel.getTaskStatuses).toHaveBeenCalledWith(mockPool);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockStatuses);
    });
  });

  describe('getPriorities', () => {
    it('should return all priorities', async () => {
      const mockPriorities: TaskPriority[] = [
        {
          id: 1,
          name: 'High',
          color: '#ff0000',
          active: true,
          created_on: new Date(),
          updated_on: null,
        },
        {
          id: 2,
          name: 'Low',
          color: '#00ff00',
          active: true,
          created_on: new Date(),
          updated_on: null,
        },
      ];
      (taskModel.getPriorities as jest.Mock).mockResolvedValue(mockPriorities);

      await taskController.getPriorities(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(taskModel.getPriorities).toHaveBeenCalledWith(mockPool);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockPriorities);
    });
  });

  describe('getActiveTasks', () => {
    it('should return active tasks for a user', async () => {
      const userId = '1';
      const mockTasks = [
        {
          id: '1',
          name: 'Active Task',
          description: 'Test Description',
          start_date: new Date(),
          due_date: new Date(),
          priority_id: '1',
          status_id: '1',
          type_id: '1',
          project_id: '1',
          holder_id: '1',
          assignee_id: '1',
          created_by: '1',
          created_on: new Date(),
          updated_on: new Date(),
        },
      ];

      if (mockReq.session) {
        mockReq.session.user = {
          id: userId,
          login: 'test',
          role_id: 1,
        };
      }

      (taskModel.getActiveTasks as jest.Mock).mockResolvedValue(mockTasks);

      await taskController.getActiveTasks(
        mockReq as CustomRequest,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(taskModel.getActiveTasks).toHaveBeenCalledWith(mockPool, userId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockTasks);
    });
  });

  describe('getSubtasks', () => {
    it('should return subtasks for a task', async () => {
      const taskId = '123';
      const mockSubtasks = [
        {
          id: '1',
          name: 'Test Subtask',
          description: 'Test Description',
          start_date: new Date(),
          due_date: new Date(),
          priority_id: '1',
          status_id: '1',
          type_id: '1',
          project_id: '1',
          holder_id: '1',
          assignee_id: '2',
          created_by: '1',
          created_on: new Date(),
          updated_on: new Date(),
          parent_id: taskId,
        },
      ];
      mockReq.params = { id: taskId };
      (taskModel.getSubtasks as jest.Mock).mockResolvedValue(mockSubtasks);

      await taskController.getSubtasks(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(taskModel.getSubtasks).toHaveBeenCalledWith(mockPool, taskId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockSubtasks);
    });

    it('should handle case when no subtasks exist', async () => {
      mockReq.params = { id: '123' };
      (taskModel.getSubtasks as jest.Mock).mockResolvedValue([]);

      await taskController.getSubtasks(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith([]);
    });
  });
});
