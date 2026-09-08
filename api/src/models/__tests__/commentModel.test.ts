import { Pool } from 'pg';
import * as commentModel from '../commentModel';

// Mock the pg module
jest.mock('pg', () => ({
  Pool: jest.fn(),
}));

describe('CommentModel', () => {
  let mockPool: jest.Mocked<Pool>;

  const mockQueryResult = (rows: any[]) => ({
    rows,
    rowCount: rows.length,
    command: '',
    oid: 0,
    fields: [],
  });

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    } as unknown as jest.Mocked<Pool>;
    jest.clearAllMocks();
  });

  describe('getTaskComments', () => {
    it('should return all comments for a task', async () => {
      const mockComments = [
        {
          id: 1,
          task_id: 1,
          user_id: 1,
          user_name: 'John Doe',
          user_login: 'johndoe',
          comment: 'First comment',
          created_on: new Date(),
          updated_on: new Date(),
        },
        {
          id: 2,
          task_id: 1,
          user_id: 2,
          user_name: 'Jane Doe',
          user_login: 'janedoe',
          comment: 'Second comment',
          created_on: new Date(),
          updated_on: new Date(),
        },
      ];
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult(mockComments),
      );

      const result = await commentModel.getTaskComments(mockPool, '1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('get_task_comments'),
        ['1'],
      );
      expect(result).toEqual(mockComments);
    });

    it('should return empty array when no comments exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      const result = await commentModel.getTaskComments(mockPool, '999');

      expect(result).toEqual([]);
    });
  });

  describe('createComment', () => {
    it('should create a new comment', async () => {
      const newComment = {
        id: 1,
        task_id: 1,
        user_id: 1,
        comment: 'New comment',
        created_on: new Date(),
        updated_on: new Date(),
      };
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult([newComment]),
      );

      const result = await commentModel.createComment(
        mockPool,
        '1',
        '1',
        'New comment',
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO comments'),
        ['1', '1', 'New comment'],
      );
      expect(result).toEqual(newComment);
    });
  });

  describe('commentWithUser', () => {
    it('should return comment with user details', async () => {
      const commentWithUser = {
        id: 1,
        task_id: 1,
        user_id: 1,
        user_name: 'John Doe',
        user_login: 'johndoe',
        comment: 'Test comment',
        created_on: new Date(),
        updated_on: new Date(),
      };
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult([commentWithUser]),
      );

      const result = await commentModel.commentWithUser(mockPool, '1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('get_comment_by_id'),
        ['1'],
      );
      expect(result).toEqual(commentWithUser);
    });

    it('should return null when comment not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      const result = await commentModel.commentWithUser(mockPool, '999');

      expect(result).toBeNull();
    });
  });

  describe('editComment', () => {
    it('should edit an existing comment', async () => {
      const editedComment = {
        id: 1,
        task_id: 1,
        user_id: 1,
        comment: 'Edited comment',
        created_on: new Date(),
        updated_on: new Date(),
      };
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult([editedComment]),
      );

      const result = await commentModel.editComment(
        mockPool,
        '1',
        'Edited comment',
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE comments'),
        ['1', 'Edited comment'],
      );
      expect(result).toEqual(editedComment);
    });

    it('should return null when comment not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      const result = await commentModel.editComment(
        mockPool,
        '999',
        'Non-existent',
      );

      expect(result).toBeNull();
    });

    it('should not re-read the comment when the update matched no rows', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      const result = await commentModel.editComment(mockPool, '999', 'Nope');

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });
  });

  describe('deleteComment', () => {
    it('should soft delete a comment', async () => {
      const deletedComment = {
        id: 1,
        task_id: 1,
        user_id: 1,
        comment: 'Deleted comment',
        active: false,
        created_on: new Date(),
        updated_on: new Date(),
      };
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult([deletedComment]),
      );

      const result = await commentModel.deleteComment(mockPool, '1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE comments'),
        ['1'],
      );
      expect(result).toEqual(deletedComment);
    });

    it('should return null when comment not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      const result = await commentModel.deleteComment(mockPool, '999');

      expect(result).toBeNull();
    });
  });
});
