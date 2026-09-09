import { renderHook, act, waitFor } from '@testing-library/react';
import { useTaskComments } from '../useTaskComments';
import {
  getTaskComments,
  createComment,
  editComment,
  deleteComment,
} from '../../../api/comments';
import { Comment } from '../../../types/comment';

// Mock the API calls
jest.mock('../../../api/comments');

// Mock the auth context
const mockCurrentUser = { id: 1, name: 'Test User' };
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: mockCurrentUser,
  }),
}));

describe('useTaskComments', () => {
  const mockComments: Comment[] = [
    {
      id: 1,
      task_id: 1,
      user_id: 1,
      comment: 'Test comment 1',
      active: true,
      created_on: '2024-01-25T00:00:00Z',
      updated_on: null,
      user_name: 'Test User',
    },
    {
      id: 2,
      task_id: 1,
      user_id: 1,
      comment: 'Test comment 2',
      active: true,
      created_on: '2024-01-25T00:00:00Z',
      updated_on: null,
      user_name: 'Test User',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (getTaskComments as jest.Mock).mockResolvedValue(mockComments);
  });

  it('should load comments successfully', async () => {
    const { result } = renderHook(() => useTaskComments('1'));
    await waitFor(() => {
      expect(result.current.comments).toEqual(mockComments);
    });
    expect(getTaskComments).toHaveBeenCalledWith(1, expect.any(AbortSignal));
    expect(result.current.comments).toEqual(mockComments);
  });

  it('should add new comment successfully', async () => {
    const newComment: Comment = {
      id: 3,
      task_id: 1,
      user_id: 1,
      comment: 'New comment',
      active: true,
      created_on: '2024-01-25T00:00:00Z',
      updated_on: null,
      user_name: 'Test User',
    };

    (createComment as jest.Mock).mockResolvedValue(newComment);

    const { result } = renderHook(() => useTaskComments('1'));
    await waitFor(() => {
      expect(result.current.comments).toEqual(mockComments);
    });

    await act(async () => {
      await result.current.handleCommentSubmit('New comment');
    });

    expect(createComment).toHaveBeenCalledWith(1, { comment: 'New comment' });
    expect(result.current.comments).toEqual([...mockComments, newComment]);
  });

  it('should prevent duplicate comments', async () => {
    const duplicateComment: Comment = {
      id: 1, // Same ID as first comment
      task_id: 1,
      user_id: 1,
      comment: 'Duplicate comment',
      active: true,
      created_on: '2024-01-25T00:00:00Z',
      updated_on: null,
      user_name: 'Test User',
    };

    (createComment as jest.Mock).mockResolvedValue(duplicateComment);

    const { result } = renderHook(() => useTaskComments('1'));
    await waitFor(() => {
      expect(result.current.comments).toEqual(mockComments);
    });

    await act(async () => {
      await result.current.handleCommentSubmit('Duplicate comment');
    });

    // Should update existing comment instead of adding duplicate
    expect(result.current.comments).toHaveLength(2);
    expect(result.current.comments[0].id).toBe(1);
  });

  it('should update comment successfully', async () => {
    const updatedComment: Comment = {
      ...mockComments[0],
      comment: 'Updated comment',
      updated_on: '2024-01-25T01:00:00Z',
    };

    (editComment as jest.Mock).mockResolvedValue(updatedComment);

    const { result } = renderHook(() => useTaskComments('1'));
    await waitFor(() => {
      expect(result.current.comments).toEqual(mockComments);
    });

    await act(async () => {
      await result.current.handleCommentUpdate(1, 'Updated comment');
    });

    expect(editComment).toHaveBeenCalledWith(1, 1, {
      comment: 'Updated comment',
    });
    expect(result.current.comments[0]).toEqual(updatedComment);
  });

  it('should delete comment successfully', async () => {
    (deleteComment as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useTaskComments('1'));
    await waitFor(
      () => {
        expect(result.current.comments).toEqual(mockComments);
      },
      { timeout: 10000 },
    );

    await act(async () => {
      await result.current.handleCommentDelete(1);
    });

    expect(deleteComment).toHaveBeenCalledWith(1, 1);
    expect(result.current.comments).toEqual([mockComments[1]]);
  }, 15000);

  it('should handle error when adding comment', async () => {
    const error = new Error('Failed to add comment');
    (createComment as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useTaskComments('1'));
    await waitFor(() => {
      expect(result.current.comments).toEqual(mockComments);
    });

    await expect(
      result.current.handleCommentSubmit('New comment'),
    ).rejects.toThrow('Failed to add comment');
  });
});
