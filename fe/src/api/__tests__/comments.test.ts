import { api } from '../api';
import { Comment } from '../../types/comment';
import {
  getTaskComments,
  createComment,
  editComment,
  deleteComment,
} from '../comments';

jest.mock('../api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('Comments API', () => {
  const mockComment: Comment = {
    id: 1,
    task_id: 1,
    user_id: 1,
    comment: 'Test comment',
    active: true,
    created_on: '2023-01-01T00:00:00Z',
    updated_on: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTaskComments', () => {
    it('should fetch comments for a task', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [mockComment] });

      const comments = await getTaskComments(1);

      expect(mockedApi.get).toHaveBeenCalledWith('/tasks/1/comments', {
        signal: undefined,
      });
      expect(comments).toEqual([mockComment]);
    });

    it('should throw error when fetch fails', async () => {
      const error = new Error('Network error');
      mockedApi.get.mockRejectedValueOnce(error);

      await expect(getTaskComments(1)).rejects.toThrow(error);
    });
  });

  describe('createComment', () => {
    it('should create a new comment', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: mockComment });

      const comment = await createComment(1, { comment: 'Test comment' });

      expect(mockedApi.post).toHaveBeenCalledWith('/tasks/1/comments', {
        comment: 'Test comment',
      });
      expect(comment).toEqual(mockComment);
    });

    it('should throw error when creation fails', async () => {
      const error = new Error('Network error');
      mockedApi.post.mockRejectedValueOnce(error);

      await expect(
        createComment(1, { comment: 'Test comment' }),
      ).rejects.toThrow(error);
    });
  });

  describe('editComment', () => {
    it('should edit an existing comment', async () => {
      mockedApi.put.mockResolvedValueOnce({ data: mockComment });

      const comment = await editComment(1, 1, { comment: 'Updated comment' });

      expect(mockedApi.put).toHaveBeenCalledWith('/tasks/1/comments/1', {
        comment: 'Updated comment',
      });
      expect(comment).toEqual(mockComment);
    });

    it('should throw error when edit fails', async () => {
      const error = new Error('Network error');
      mockedApi.put.mockRejectedValueOnce(error);

      await expect(
        editComment(1, 1, { comment: 'Updated comment' }),
      ).rejects.toThrow(error);
    });
  });

  describe('deleteComment', () => {
    it('should delete a comment', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: undefined });

      await deleteComment(1, 1);

      expect(mockedApi.delete).toHaveBeenCalledWith('/tasks/1/comments/1');
    });

    it('should throw error when deletion fails', async () => {
      const error = new Error('Network error');
      mockedApi.delete.mockRejectedValueOnce(error);

      await expect(deleteComment(1, 1)).rejects.toThrow(error);
    });
  });
});
