import { api } from '../api';
import { TaskWatcher } from '../../types/watcher';
import {
  getTaskWatchers,
  addTaskWatcher,
  removeTaskWatcher,
} from '../watchers';

// Mock the api module
jest.mock('../api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('Watchers API', () => {
  // Mock data
  const mockTaskWatcher: TaskWatcher = {
    task_id: 1,
    user_id: 1,
    user_name: 'John Doe',
    role: 'Developer',
  };

  const mockTaskWatchers: TaskWatcher[] = [mockTaskWatcher];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTaskWatchers', () => {
    it('should fetch task watchers successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: mockTaskWatchers });

      const result = await getTaskWatchers(1);

      expect(mockedApi.get).toHaveBeenCalledWith('/tasks/1/watchers', {
        signal: undefined,
      });
      expect(result).toEqual(mockTaskWatchers);
    });

    it('should throw error when fetch fails', async () => {
      const error = new Error('Network error');
      mockedApi.get.mockRejectedValueOnce(error);

      await expect(getTaskWatchers(1)).rejects.toThrow(error);
    });
  });

  describe('addTaskWatcher', () => {
    it('should add task watcher successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: mockTaskWatcher });

      const result = await addTaskWatcher(1, 1);

      expect(mockedApi.post).toHaveBeenCalledWith('/tasks/1/watchers', {
        userId: 1,
      });
      expect(result).toEqual(mockTaskWatcher);
    });

    it('should throw error when add fails', async () => {
      const error = new Error('Add failed');
      mockedApi.post.mockRejectedValueOnce(error);

      await expect(addTaskWatcher(1, 1)).rejects.toThrow(error);
    });
  });

  describe('removeTaskWatcher', () => {
    it('should remove task watcher successfully', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: null });

      await removeTaskWatcher(1, 1);

      expect(mockedApi.delete).toHaveBeenCalledWith('/tasks/1/watchers/1');
    });

    it('should throw error when remove fails', async () => {
      const error = new Error('Remove failed');
      mockedApi.delete.mockRejectedValueOnce(error);

      await expect(removeTaskWatcher(1, 1)).rejects.toThrow(error);
    });
  });
});
