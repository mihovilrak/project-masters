import { Pool } from 'pg';
import * as taskModel from '../taskModel';

// Mock the pg module
jest.mock('pg', () => ({
  Pool: jest.fn(),
}));

describe('TaskModel', () => {
  let mockPool: jest.Mocked<Pool>;

  const mockQueryResult = (rows: any[]) => ({
    rows,
    rowCount: rows.length,
    command: '',
    oid: 0,
    fields: [],
  });

  const mockTask = {
    id: 1,
    name: 'Test Task',
    description: 'Test Description',
    estimated_time: 8,
    start_date: new Date(),
    due_date: new Date(),
    priority_id: 1,
    status_id: 1,
    type_id: 1,
    project_id: 1,
    holder_id: 1,
    assignee_id: 2,
    created_by: 1,
    created_on: new Date(),
    updated_on: new Date(),
  };

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    } as unknown as jest.Mocked<Pool>;
    jest.clearAllMocks();
  });

  describe('getTasks', () => {
    it('should return active tasks only when no filters (default)', async () => {
      const mockTasks = [mockTask, { ...mockTask, id: 2, name: 'Task 2' }];
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult(mockTasks),
      );

      const result = await taskModel.getTasks(mockPool);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('get_tasks(p_active_statuses_only => $1)'),
        [true, 500, 0],
      );
      expect(result).toEqual(mockTasks);
    });

    it('should return tasks with filters', async () => {
      const mockTasks = [mockTask];
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult(mockTasks),
      );

      const result = await taskModel.getTasks(mockPool, {
        whereParams: { project_id: 1, status_id: 1 },
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining(
          'get_tasks(p_project_ids => $1, p_status_ids => $2)',
        ),
        [[1], [1], 500, 0],
      );
      expect(result).toEqual(mockTasks);
    });

    it('should return empty array when no tasks exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      const result = await taskModel.getTasks(mockPool);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('get_tasks(p_active_statuses_only => $1)'),
        [true, 500, 0],
      );
      expect(result).toEqual([]);
    });

    it('should pass array params when filter is array', async () => {
      const mockTasks = [mockTask];
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult(mockTasks),
      );

      const result = await taskModel.getTasks(mockPool, {
        status_id: [1, 2],
        priority_id: [2, 3],
      });

      const [sql, args] = (mockPool.query as jest.Mock).mock.calls[0];
      expect(sql).toContain('get_tasks(p_status_ids => $1, p_priority_ids => $2)');
      expect(args).toEqual([[1, 2], [2, 3], 500, 0]);
      expect(result).toEqual(mockTasks);
    });
  });

  describe('getTaskById', () => {
    it('should return a task by ID', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult([mockTask]),
      );

      const result = await taskModel.getTaskById(mockPool, '1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('get_tasks'),
        ['1'],
      );
      expect(result).toEqual(mockTask);
    });

    it('should return null when task not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      const result = await taskModel.getTaskById(mockPool, '999');

      expect(result).toBeNull();
    });
  });

  describe('createTask', () => {
    it('should create a new task', async () => {
      const taskData = {
        name: 'New Task',
        description: 'New task description',
        estimated_time: 4,
        start_date: new Date(),
        due_date: new Date(),
        priority_id: 1,
        status_id: 1,
        type_id: 1,
        project_id: 1,
        holder_id: 1,
        assignee_id: 2,
        created_by: 1,
        tag_ids: [1, 2],
      };
      const watchers = [1, 2];
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult([{ task_id: 1 }]),
      );

      const result = await taskModel.createTask(mockPool, taskData, watchers);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM create_task'),
        expect.arrayContaining([taskData.name, taskData.description]),
      );
      expect(result).toEqual({ task_id: 1 });
    });

    it('should throw error when task creation fails', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      await expect(
        taskModel.createTask(
          mockPool,
          {
            name: 'Test',
            start_date: new Date(),
            due_date: new Date(),
            priority_id: 1,
            status_id: 1,
            type_id: 1,
            project_id: 1,
            holder_id: 1,
            assignee_id: 2,
            created_by: 1,
          },
          [1],
        ),
      ).rejects.toThrow('Task creation failed - no task ID returned');
    });
  });

  describe('updateTask', () => {
    it('should update a task', async () => {
      const updatedTask = { ...mockTask, name: 'Updated Task' };
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult([updatedTask]),
      );

      const result = await taskModel.updateTask(mockPool, '1', {
        name: 'Updated Task',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tasks'),
        ['Updated Task', '1'],
      );
      expect(result).toEqual(updatedTask);
    });

    it('should return null when no fields to update', async () => {
      const result = await taskModel.updateTask(mockPool, '1', {});

      expect(result).toBeNull();
    });

    it('should return null when task not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      const result = await taskModel.updateTask(mockPool, '999', {
        name: 'Test',
      });

      expect(result).toBeNull();
    });
  });

  describe('changeTaskStatus', () => {
    it('should change task status', async () => {
      const updatedTask = { ...mockTask, status_id: 2 };
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult([updatedTask]),
      );

      const result = await taskModel.changeTaskStatus(mockPool, 1, 2);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tasks'),
        [2, 1],
      );
      expect(result).toEqual(updatedTask);
    });

    it('should return null when task not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      const result = await taskModel.changeTaskStatus(mockPool, 999, 2);

      expect(result).toBeNull();
    });
  });

  describe('deleteTask', () => {
    it('should soft delete a task', async () => {
      const deletedTask = { ...mockTask, status_id: 7 };
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult([deletedTask]),
      );

      const result = await taskModel.deleteTask(mockPool, '1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tasks'),
        ['1'],
      );
      expect((mockPool.query as jest.Mock).mock.calls[0][0]).toContain(
        "task_status_id('deleted')",
      );
      expect(result).toEqual(deletedTask);
    });

    it('should return null when task not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      const result = await taskModel.deleteTask(mockPool, '999');

      expect(result).toBeNull();
    });
  });

  describe('getTaskStatuses', () => {
    it('should return all task statuses', async () => {
      const mockStatuses = [
        { id: 1, name: 'To Do', color: '#2196F3' },
        { id: 2, name: 'In Progress', color: '#FF9800' },
        { id: 3, name: 'Done', color: '#4CAF50' },
      ];
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult(mockStatuses),
      );

      const result = await taskModel.getTaskStatuses(mockPool);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, name, color'),
      );
      expect(result).toEqual(mockStatuses);
    });
  });

  describe('getPriorities', () => {
    it('should return all priorities', async () => {
      const mockPriorities = [
        { id: 1, name: 'Low', color: '#4CAF50' },
        { id: 2, name: 'Medium', color: '#2196F3' },
        { id: 3, name: 'High', color: '#FFA726' },
      ];
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult(mockPriorities),
      );

      const result = await taskModel.getPriorities(mockPool);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, name, color'),
      );
      expect(result).toEqual(mockPriorities);
    });
  });

  describe('getActiveTasks', () => {
    it('should return active tasks for a user', async () => {
      const activeTasks = [mockTask, { ...mockTask, id: 2 }];
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult(activeTasks),
      );

      const result = await taskModel.getActiveTasks(mockPool, '1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('get_tasks'),
        ['1'],
      );
      expect(result).toEqual(activeTasks);
    });

    it('should return empty array when no active tasks', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      const result = await taskModel.getActiveTasks(mockPool, '1');

      expect(result).toEqual([]);
    });
  });

  describe('getTasks scoping', () => {
    it('appends the access filter after the get_tasks arguments', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      await taskModel.getTasks(mockPool, undefined, undefined, '7');

      const [sql, params] = (mockPool.query as jest.Mock).mock.calls[0];
      expect(sql).toContain('WHERE project_id IN');
      expect(sql).toContain('$2');
      expect(sql).toContain('LIMIT $3 OFFSET $4');
      expect(params).toEqual([true, '7', 500, 0]);
    });

    it('leaves the query unscoped when no user is given', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      await taskModel.getTasks(mockPool);

      expect((mockPool.query as jest.Mock).mock.calls[0][0]).not.toContain(
        'WHERE project_id IN',
      );
    });
  });

  describe('getTasksByProject', () => {
    it('should return tasks for a project', async () => {
      const projectTasks = [mockTask, { ...mockTask, id: 2 }];
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult(projectTasks),
      );

      const result = await taskModel.getTasksByProject(mockPool, '1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('get_tasks'),
        ['1', 500, 0],
      );
      expect(mockPool.query.mock.calls[0][0]).not.toContain('project_users');
      expect(result).toEqual(projectTasks);
    });

    it('restricts the query to the projects a scoped user may see', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      await taskModel.getTasksByProject(mockPool, '1', undefined, '7');

      const [sql, params] = (mockPool.query as jest.Mock).mock.calls[0];
      expect(sql).toContain('WHERE project_id IN');
      expect(sql).toContain('LIMIT $3 OFFSET $4');
      expect(params).toEqual(['1', '7', 500, 0]);
    });
  });

  describe('getSubtasks', () => {
    it('should return subtasks for a parent task', async () => {
      const subtasks = [
        { ...mockTask, id: 2, parent_id: 1 },
        { ...mockTask, id: 3, parent_id: 1 },
      ];
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult(subtasks),
      );

      const result = await taskModel.getSubtasks(mockPool, '1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('get_tasks'),
        ['1'],
      );
      expect(result).toEqual(subtasks);
    });

    it('should return empty array when no subtasks exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      const result = await taskModel.getSubtasks(mockPool, '1');

      expect(result).toEqual([]);
    });
  });
});
