import { useAuth } from '../../context/AuthContext';
import { useAsyncResource } from '../common/useAsyncResource';
import { Comment } from '../../types/comment';
import {
  getTaskComments,
  createComment,
  editComment,
  deleteComment,
} from '../../api/comments';
import logger from '../../utils/logger';
import getApiErrorMessage from '../../utils/getApiErrorMessage';

const EMPTY_COMMENTS: Comment[] = [];

export const useTaskComments = (taskId: string) => {
  const { currentUser } = useAuth();
  const {
    data: comments,
    setData: setComments,
    refetch: fetchComments,
  } = useAsyncResource<Comment[]>(
    async (signal) => (await getTaskComments(Number(taskId), signal)) || [],
    [taskId],
    {
      initialData: EMPTY_COMMENTS,
      enabled: Boolean(taskId),
      errorMessage: 'Failed to fetch comments',
    },
  );

  const handleCommentSubmit = async (content: string) => {
    try {
      if (!currentUser?.id) throw new Error('User not authenticated');
      if (!taskId) throw new Error('Task ID is required');

      const newComment = await createComment(Number(taskId), {
        comment: content,
      });

      if (!newComment) {
        throw new Error('Failed to create comment');
      }

      setComments((prev) => {
        const exists = prev.some((c) => c?.id === newComment.id);
        if (exists) {
          return prev.map((c) => (c?.id === newComment.id ? newComment : c));
        }
        return [...prev, newComment];
      });
      return newComment;
    } catch (error: unknown) {
      logger.error('Failed to add comment:', error);
      throw new Error(getApiErrorMessage(error, 'Failed to add comment'));
    }
  };

  const handleCommentUpdate = async (commentId: number, newText: string) => {
    try {
      if (!taskId) throw new Error('Task ID is required');

      const updatedComment = await editComment(commentId, Number(taskId), {
        comment: newText,
      });

      if (!updatedComment) {
        throw new Error('Failed to update comment');
      }

      setComments((prev) =>
        prev.map((c) => (c?.id === commentId ? updatedComment : c)),
      );
      return updatedComment;
    } catch (error: unknown) {
      logger.error('Failed to update comment:', error);
      throw new Error(getApiErrorMessage(error, 'Failed to update comment'));
    }
  };

  const handleCommentDelete = async (commentId: number) => {
    try {
      if (!taskId) throw new Error('Task ID is required');

      await deleteComment(Number(taskId), commentId);
      setComments((prev) => prev.filter((c) => c?.id !== commentId));
    } catch (error: unknown) {
      logger.error('Failed to delete comment:', error);
      throw new Error(getApiErrorMessage(error, 'Failed to delete comment'));
    }
  };

  return {
    comments,
    setComments,
    handleCommentSubmit,
    handleCommentUpdate,
    handleCommentDelete,
    fetchComments,
  };
};
