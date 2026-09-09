import { api } from '../api';
import { TaskType } from '../../types/task';
import {
  getTaskTypes,
  getTaskTypeById,
  createTaskType,
  updateTaskType,
  deleteTaskType,
} from '../taskTypes';

// Mock the api module
jest.mock('../api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('Task Types API', () => {
  // Mock data
  const mockTaskType: TaskType = {
    id: 1,
    name: 'Test Task Type',
    description: 'Test Description',
    color: '#000000',
    icon: 'test-icon',
    created_on: new Date().toDateString(),
    updated_on: new Date().toDateString(),
    active: true,
  };

  const mockTaskTypes: TaskType[] = [mockTaskType];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTaskTypes', () => {
    it('should fetch all task types successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: mockTaskTypes });

      const result = await getTaskTypes();

      expect(mockedApi.get).toHaveBeenCalledWith('/admin/task-types', {
        signal: undefined,
      });
      expect(result).toEqual(mockTaskTypes);
    });

    it('should throw error when fetch fails', async () => {
      const error = new Error('Network error');
      mockedApi.get.mockRejectedValueOnce(error);

      await expect(getTaskTypes()).rejects.toThrow(error);
    });
  });

  describe('getTaskTypeById', () => {
    it('should fetch task type by id successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: mockTaskType });

      const result = await getTaskTypeById(1);

      expect(mockedApi.get).toHaveBeenCalledWith('/admin/task-types/1');
      expect(result).toEqual(mockTaskType);
    });

    it('should throw error when fetch fails', async () => {
      const error = new Error('Network error');
      mockedApi.get.mockRejectedValueOnce(error);

      await expect(getTaskTypeById(1)).rejects.toThrow(error);
    });
  });

  describe('createTaskType', () => {
    const newTaskType = {
      name: 'New Task Type',
      color: '#FFFFFF',
    };

    it('should create task type successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: mockTaskType });

      const result = await createTaskType(newTaskType);

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/admin/task-types',
        newTaskType,
      );
      expect(result).toEqual(mockTaskType);
    });

    it('should throw error when creation fails', async () => {
      const error = new Error('Creation failed');
      mockedApi.post.mockRejectedValueOnce(error);

      await expect(createTaskType(newTaskType)).rejects.toThrow(error);
    });
  });

  describe('updateTaskType', () => {
    const updateData = {
      name: 'Updated Task Type',
    };

    it('should update task type successfully', async () => {
      mockedApi.put.mockResolvedValueOnce({
        data: { ...mockTaskType, ...updateData },
      });

      const result = await updateTaskType(1, updateData);

      expect(mockedApi.put).toHaveBeenCalledWith(
        '/admin/task-types/1',
        updateData,
      );
      expect(result).toEqual({ ...mockTaskType, ...updateData });
    });

    it('should throw error when update fails', async () => {
      const error = new Error('Update failed');
      mockedApi.put.mockRejectedValueOnce(error);

      await expect(updateTaskType(1, updateData)).rejects.toThrow(error);
    });
  });

  describe('deleteTaskType', () => {
    it('should delete task type successfully', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: null });

      await deleteTaskType(1);

      expect(mockedApi.delete).toHaveBeenCalledWith('/admin/task-types/1');
    });

    it('should throw error when deletion fails', async () => {
      const error = new Error('Deletion failed');
      mockedApi.delete.mockRejectedValueOnce(error);

      await expect(deleteTaskType(1)).rejects.toThrow(error);
    });
  });
});
