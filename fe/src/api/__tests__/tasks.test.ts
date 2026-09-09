import { api } from '../api';
import {
  Task,
  TaskStatus,
  TaskFilters,
  TaskFormState,
  TaskPriority,
} from '../../types/task';
import { Tag } from '../../types/tag';
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getProjectTasks,
  getSubtasks,
  getTasksByDateRange,
  updateTaskDates,
  getActiveTasks,
  changeTaskStatus,
  getTaskStatuses,
  getPriorities,
  updateTaskTags,
} from '../tasks';

jest.mock('../api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('Tasks API', () => {
  const mockTask: Task = {
    id: 1,
    name: 'Test Task',
    project_id: 1,
    project_name: 'Test Project',
    holder_id: 1,
    holder_name: 'Test Holder',
    assignee_id: 2,
    assignee_name: 'Test Assignee',
    parent_id: null,
    parent_name: null,
    description: 'Test Description',
    type_id: 1,
    type_name: 'Task',
    status_id: 1,
    status_name: 'New',
    priority_id: 1,
    priority_name: 'Normal',
    start_date: '2023-01-01',
    due_date: '2023-12-31',
    end_date: null,
    spent_time: 0,
    progress: 0,
    created_by: 1,
    created_by_name: 'Test Creator',
    created_on: '2023-01-01T00:00:00Z',
    estimated_time: 8,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTasks', () => {
    it('should fetch tasks with filters', async () => {
      const filters: TaskFilters = { status: 1, priority: 2 };
      mockedApi.get.mockResolvedValueOnce({ data: [mockTask] });

      const result = await getTasks(filters);

      expect(mockedApi.get).toHaveBeenCalledWith(`/tasks?status=1&priority=2`, {
        signal: undefined,
      });
      expect(result).toEqual([mockTask]);
    });

    it('should handle error when fetching tasks', async () => {
      const error = new Error('Network error');
      mockedApi.get.mockRejectedValueOnce(error);

      await expect(getTasks()).rejects.toThrow(error);
    });

    it('keeps numeric zero values and omits empty filters', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [] });

      await getTasks({ status_id: 0, search: '' });

      expect(mockedApi.get).toHaveBeenCalledWith('/tasks?status_id=0', {
        signal: undefined,
      });
    });
  });

  describe('getTaskById', () => {
    it('should fetch task by id', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: mockTask });

      const result = await getTaskById(1);

      expect(mockedApi.get).toHaveBeenCalledWith(`/tasks/1`, {
        signal: undefined,
      });
      expect(result).toEqual(mockTask);
    });

    it('should handle error when fetching task by id', async () => {
      const error = new Error('Task not found');
      mockedApi.get.mockRejectedValueOnce(error);

      await expect(getTaskById(1)).rejects.toThrow(error);
    });
  });

  describe('createTask', () => {
    it('should create new task', async () => {
      const taskData: Partial<Task> = {
        name: 'New Task',
        project_id: 1,
      };
      mockedApi.post.mockResolvedValueOnce({ data: mockTask });

      const result = await createTask(taskData);

      expect(mockedApi.post).toHaveBeenCalledWith('/tasks', taskData);
      expect(result).toEqual(mockTask);
    });
  });

  describe('updateTask', () => {
    it('should update existing task', async () => {
      // Setup
      const taskId = 1;
      const updateData = { name: 'Updated Task' };
      const mockResponse = { data: { ...mockTask, name: 'Updated Task' } };

      // Clear any previous calls and setup the mock
      jest.clearAllMocks();
      mockedApi.put.mockResolvedValue(mockResponse);

      // Execute the function
      const result = await updateTask(taskId, updateData);

      // Assertions
      expect(mockedApi.put).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockResponse.data);
    });
  });

  describe('getProjectTasks', () => {
    it('should fetch project tasks with filters', async () => {
      const projectId = 1;
      const filters = { status: 1 };
      mockedApi.get.mockResolvedValueOnce({ data: [mockTask] });

      const result = await getProjectTasks(projectId, filters);

      expect(mockedApi.get).toHaveBeenCalledWith(
        `/projects/${projectId}/tasks?status=1`,
        { signal: undefined },
      );
      expect(result).toEqual([mockTask]);
    });
  });

  describe('getTasksByDateRange', () => {
    it('should fetch tasks by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      mockedApi.get.mockResolvedValueOnce({ data: [mockTask] });

      const result = await getTasksByDateRange(startDate, endDate);

      expect(mockedApi.get).toHaveBeenCalledWith('/tasks/calendar', {
        params: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        },
      });
      expect(result).toEqual([mockTask]);
    });
  });

  describe('changeTaskStatus', () => {
    it('should change task status', async () => {
      const taskId = 1;
      const statusId = 2;
      mockedApi.patch.mockResolvedValueOnce({
        data: { ...mockTask, status_id: statusId },
      });

      const result = await changeTaskStatus(taskId, statusId);

      expect(mockedApi.patch).toHaveBeenCalledWith(
        `/tasks/${taskId}/change-status`,
        { statusId },
      );
      expect(result).toEqual({ ...mockTask, status_id: statusId });
    });
  });

  describe('getTaskStatuses', () => {
    it('should fetch task statuses', async () => {
      const mockStatuses: TaskStatus[] = [
        {
          id: 1,
          name: 'New',
          color: '#000000',
          description: null,
          active: true,
          created_on: '2023-01-01',
          updated_on: null,
        },
      ];
      mockedApi.get.mockResolvedValueOnce({ data: mockStatuses });

      const result = await getTaskStatuses();

      expect(mockedApi.get).toHaveBeenCalledWith('/tasks/statuses', {
        signal: undefined,
      });
      expect(result).toEqual(mockStatuses);
    });
  });

  describe('updateTaskTags', () => {
    it('should update task tags', async () => {
      const tags: Tag[] = [
        {
          id: 1,
          name: 'Frontend',
          color: '#e91e63',
          description: 'Frontend related tasks',
          created_by: 1,
          active: true,
          created_on: '2024-01-01',
        },
      ];
      mockedApi.put.mockResolvedValueOnce({ data: undefined });

      const result = await updateTaskTags(1, tags);

      expect(mockedApi.put).toHaveBeenCalledWith('/tasks/1/tags', { tags });
      expect(result).toEqual(undefined);
    });
  });

  describe('getSubtasks', () => {
    it('should fetch subtasks', async () => {
      const parentId = 1;
      mockedApi.get.mockResolvedValueOnce({ data: [mockTask] });

      const result = await getSubtasks(parentId);

      expect(mockedApi.get).toHaveBeenCalledWith(
        `/tasks/${parentId}/subtasks`,
        { signal: undefined },
      );
      expect(result).toEqual([mockTask]);
    });
  });

  describe('updateTaskDates', () => {
    it('should update task dates', async () => {
      const dates = {
        start_date: '2024-01-01',
        due_date: '2024-01-31',
      };
      mockedApi.patch.mockResolvedValueOnce({ data: mockTask });

      const result = await updateTaskDates(1, dates);

      expect(mockedApi.patch).toHaveBeenCalledWith(`/tasks/1/dates`, dates);
      expect(result).toEqual(mockTask);
    });
  });

  describe('getActiveTasks', () => {
    it('should fetch active tasks', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [mockTask] });

      const result = await getActiveTasks();

      expect(mockedApi.get).toHaveBeenCalledWith('/tasks/active', {
        signal: undefined,
      });
      expect(result).toEqual([mockTask]);
    });
  });

  describe('getPriorities', () => {
    it('should fetch task priorities', async () => {
      const mockPriorities: TaskPriority[] = [
        {
          id: 1,
          name: 'Low',
          color: '#000000',
          description: 'Low priority',
          active: true,
          created_on: '2024-01-01',
          updated_on: null,
        },
      ];
      mockedApi.get.mockResolvedValueOnce({ data: mockPriorities });

      const result = await getPriorities();

      expect(mockedApi.get).toHaveBeenCalledWith('/tasks/priorities', {
        signal: undefined,
      });
      expect(result).toEqual(mockPriorities);
    });

    it('should handle error when fetching priorities', async () => {
      const error = new Error('Failed to fetch priorities');
      mockedApi.get.mockRejectedValueOnce(error);

      await expect(getPriorities()).rejects.toThrow(error);
    });
  });

  describe('deleteTask', () => {
    it('should delete a task successfully', async () => {
      const taskId = 1;
      mockedApi.delete.mockResolvedValueOnce({ data: undefined });

      await deleteTask(taskId);

      expect(mockedApi.delete).toHaveBeenCalledWith(`/tasks/${taskId}`);
    });

    it('should handle error when deleting task', async () => {
      const taskId = 1;
      const error = new Error('Failed to delete task');
      mockedApi.delete.mockRejectedValueOnce(error);

      await expect(deleteTask(taskId)).rejects.toThrow(error);
    });
  });
});
