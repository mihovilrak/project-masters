import { api } from '../api';
import { Tag } from '../../types/tag';
import {
  getTags,
  createTag,
  addTaskTags,
  removeTaskTag,
  getTaskTags,
} from '../tags';

// Mock the api module
jest.mock('../api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('Tags API', () => {
  // Mock data
  const mockTag: Tag = {
    id: 1,
    name: 'Test Tag',
    color: '#FF0000',
    description: 'Test Description',
    created_by: 1,
    active: true,
    created_on: '2023-01-01T00:00:00Z',
    creator_name: 'Test User',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTags', () => {
    it('should fetch tags successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [mockTag] });

      const result = await getTags();

      expect(mockedApi.get).toHaveBeenCalledWith('/tags', {
        signal: undefined,
      });
      expect(result).toEqual([mockTag]);
    });

    it('should throw error when fetch fails', async () => {
      const error = new Error('Network error');
      mockedApi.get.mockRejectedValueOnce(error);

      await expect(getTags()).rejects.toThrow(error);
    });
  });

  describe('createTag', () => {
    const newTagData = {
      name: 'New Tag',
      color: '#00FF00',
      description: 'New Description',
    };

    it('should create tag successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: mockTag });

      const result = await createTag(newTagData);

      expect(mockedApi.post).toHaveBeenCalledWith('/tags', newTagData);
      expect(result).toEqual(mockTag);
    });

    it('should throw error when creation fails', async () => {
      const error = new Error('Creation failed');
      mockedApi.post.mockRejectedValueOnce(error);

      await expect(createTag(newTagData)).rejects.toThrow(error);
    });
  });

  describe('addTaskTags', () => {
    it('should add tags to task successfully', async () => {
      const taskId = 1;
      const tagIds = [1, 2, 3];
      mockedApi.post.mockResolvedValueOnce({ data: [mockTag] });

      const result = await addTaskTags(taskId, tagIds);

      expect(mockedApi.post).toHaveBeenCalledWith(`/tasks/${taskId}/tags`, {
        tagIds,
      });
      expect(result).toEqual([mockTag]);
    });

    it('should throw error when adding tags fails', async () => {
      const error = new Error('Failed to add tags');
      mockedApi.post.mockRejectedValueOnce(error);

      await expect(addTaskTags(1, [1])).rejects.toThrow(error);
    });
  });

  describe('removeTaskTag', () => {
    it('should remove tag from task successfully', async () => {
      const taskId = 1;
      const tagId = 1;
      mockedApi.delete.mockResolvedValueOnce({ data: null });

      await removeTaskTag(taskId, tagId);

      expect(mockedApi.delete).toHaveBeenCalledWith(
        `/tasks/${taskId}/tags/${tagId}`,
      );
    });

    it('should throw error when removing tag fails', async () => {
      const error = new Error('Failed to remove tag');
      mockedApi.delete.mockRejectedValueOnce(error);

      await expect(removeTaskTag(1, 1)).rejects.toThrow(error);
    });
  });

  describe('getTaskTags', () => {
    it('should fetch task tags successfully', async () => {
      const taskId = 1;
      mockedApi.get.mockResolvedValueOnce({ data: [mockTag] });

      const result = await getTaskTags(taskId);

      expect(mockedApi.get).toHaveBeenCalledWith(`/tasks/${taskId}/tags`, {
        signal: undefined,
      });
      expect(result).toEqual([mockTag]);
    });

    it('should throw error when fetching task tags fails', async () => {
      const error = new Error('Failed to fetch task tags');
      mockedApi.get.mockRejectedValueOnce(error);

      await expect(getTaskTags(1)).rejects.toThrow(error);
    });
  });
});
