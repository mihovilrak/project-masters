import { Request, Response } from 'express';
import { Pool } from 'pg';
import { jest } from '@jest/globals';
import * as commentModel from '../../models/commentModel';
import * as notificationModel from '../../models/notificationModel';
import {
  getTaskComments,
  createComment,
  editComment,
  deleteComment,
} from '../commentController';
import {
  CommentCreateInput,
  CommentUpdateInput,
  Comment,
  CommentWithUser,
  TaskRequest,
} from '../../types/comment';
import { NotificationType } from '../../types/notification';
import { Session, SessionData } from 'express-session';
import { CustomRequest } from '../../types/express';

// Mocks
jest.mock('../../models/commentModel');
jest.mock('../../models/notificationModel');

describe('Comment Controller', () => {
  let mockPool: Pool;
  let mockRequest: Partial<Request & TaskRequest>;
  let mockResponse: Response;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock pool
    mockPool = {} as Pool;

    // Create mock response
    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnThis();
    mockResponse = {
      status: mockStatus,
      json: mockJson,
    } as unknown as Response;
  });

  describe('getTaskComments', () => {
    const mockComments: CommentWithUser[] = [
      {
        id: 1,
        task_id: 1,
        user_id: 1,
        comment: 'Test comment',
        created_on: new Date(),
        updated_on: new Date(),
        active: true,
        user_name: 'John',
      },
    ];

    it('should return comments successfully', async () => {
      mockRequest = {
        taskId: '1',
      };

      jest
        .spyOn(commentModel, 'getTaskComments')
        .mockResolvedValueOnce(mockComments);

      await getTaskComments(mockRequest as TaskRequest, mockResponse, mockPool);

      expect(commentModel.getTaskComments).toHaveBeenCalledWith(mockPool, '1');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(mockComments);
    });

    it('should handle errors', async () => {
      mockRequest = {
        taskId: '1',
      };

      const error = new Error('Database error');
      jest.spyOn(commentModel, 'getTaskComments').mockRejectedValueOnce(error);

      await getTaskComments(mockRequest as TaskRequest, mockResponse, mockPool);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('createComment', () => {
    const mockNewComment: Comment = {
      id: 1,
      task_id: 1,
      user_id: 1,
      comment: 'New comment',
      created_on: new Date(),
      updated_on: new Date(),
      active: true,
    };

    const createMockSession = (
      withUser = true,
    ): Session & Partial<SessionData> => {
      const session = {
        id: 'test-session',
        cookie: {
          originalMaxAge: null,
        },
        ...(withUser && {
          user: {
            id: '1',
            login: 'testuser',
            role_id: 1,
          },
        }),
      } as Session & Partial<SessionData>;

      // Add session methods that return the session object for chaining
      session.regenerate = (callback: (err: any) => void) => {
        callback(null);
        return session;
      };
      session.destroy = (callback: (err: any) => void) => {
        callback(null);
        return session;
      };
      session.reload = (callback: (err: any) => void) => {
        callback(null);
        return session;
      };
      session.resetMaxAge = () => {
        return session;
      };
      session.save = (callback?: (err: any) => void) => {
        if (callback) callback(null);
        return session;
      };
      session.touch = () => {
        return session;
      };

      return session;
    };

    it('should create comment successfully', async () => {
      mockRequest = {
        taskId: '1',
        body: { comment: 'New comment' } as CommentCreateInput,
        session: createMockSession(),
      };

      jest
        .spyOn(commentModel, 'createComment')
        .mockResolvedValueOnce(mockNewComment);
      jest
        .spyOn(notificationModel, 'createWatcherNotifications')
        .mockResolvedValueOnce([]);

      await createComment(
        mockRequest as CustomRequest & TaskRequest,
        mockResponse,
        mockPool,
      );

      expect(commentModel.createComment).toHaveBeenCalledWith(
        mockPool,
        '1',
        '1',
        'New comment',
      );
      expect(notificationModel.createWatcherNotifications).toHaveBeenCalledWith(
        mockPool,
        {
          task_id: 1,
          action_user_id: 1,
          type_id: NotificationType.TaskComment,
        },
      );
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(mockNewComment);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest = {
        taskId: '1',
        body: { comment: 'New comment' } as CommentCreateInput,
        session: createMockSession(false),
      };

      await createComment(
        mockRequest as CustomRequest & TaskRequest,
        mockResponse,
        mockPool,
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'User not authenticated',
      });
    });

    it('should handle errors', async () => {
      mockRequest = {
        taskId: '1',
        body: { comment: 'New comment' } as CommentCreateInput,
        session: createMockSession(),
      };

      const error = new Error('Database error');
      jest.spyOn(commentModel, 'createComment').mockRejectedValueOnce(error);

      await createComment(
        mockRequest as CustomRequest & TaskRequest,
        mockResponse,
        mockPool,
      );

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('editComment', () => {
    const mockEditedComment: CommentWithUser = {
      id: 1,
      task_id: 1,
      user_id: 1,
      comment: 'Updated comment',
      created_on: new Date(),
      updated_on: new Date(),
      active: true,
      user_name: 'Test User',
    };

    it('should edit comment successfully', async () => {
      mockRequest = {
        params: { id: '1' },
        body: { comment: 'Updated comment' } as CommentUpdateInput,
      };

      jest
        .spyOn(commentModel, 'editComment')
        .mockResolvedValueOnce(mockEditedComment);

      await editComment(mockRequest as Request, mockResponse, mockPool);

      expect(commentModel.editComment).toHaveBeenCalledWith(
        mockPool,
        '1',
        'Updated comment',
      );
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(mockEditedComment);
    });

    it('should return 404 when the comment does not exist', async () => {
      mockRequest = {
        params: { id: '999' },
        body: { comment: 'Updated comment' } as CommentUpdateInput,
      };

      jest.spyOn(commentModel, 'editComment').mockResolvedValueOnce(null);

      await editComment(mockRequest as Request, mockResponse, mockPool);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Comment not found' });
    });

    it('should handle errors', async () => {
      mockRequest = {
        params: { id: '1' },
        body: { comment: 'Updated comment' } as CommentUpdateInput,
      };

      const error = new Error('Database error');
      jest.spyOn(commentModel, 'editComment').mockRejectedValueOnce(error);

      await editComment(mockRequest as Request, mockResponse, mockPool);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('deleteComment', () => {
    const mockDeletedComment: Comment = {
      id: 1,
      task_id: 1,
      user_id: 1,
      comment: 'Deleted comment',
      created_on: new Date(),
      updated_on: new Date(),
      active: false,
    };

    it('should delete comment successfully', async () => {
      mockRequest = {
        params: { id: '1' },
      };

      jest
        .spyOn(commentModel, 'deleteComment')
        .mockResolvedValueOnce(mockDeletedComment);

      await deleteComment(mockRequest as Request, mockResponse, mockPool);

      expect(commentModel.deleteComment).toHaveBeenCalledWith(mockPool, '1');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(mockDeletedComment);
    });

    it('should handle errors', async () => {
      mockRequest = {
        params: { id: '1' },
      };

      const error = new Error('Database error');
      jest.spyOn(commentModel, 'deleteComment').mockRejectedValueOnce(error);

      await deleteComment(mockRequest as Request, mockResponse, mockPool);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });
});
