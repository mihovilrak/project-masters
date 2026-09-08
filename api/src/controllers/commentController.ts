import { Request, Response } from 'express';
import { Pool } from 'pg';
import * as commentModel from '../models/commentModel';
import * as notificationModel from '../models/notificationModel';
import { CustomRequest } from '../types/express';
import {
  CommentCreateInput,
  CommentUpdateInput,
  TaskRequest,
} from '../types/comment';
import { NotificationType } from '../types/notification';
import logger from '../utils/logger';

// Get task comments
export const getTaskComments = async (
  req: TaskRequest,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  try {
    const taskId = req.taskId;
    const comments = await commentModel.getTaskComments(pool, taskId || '');
    res.status(200).json(comments);
  } catch (error) {
    logger.error({ err: error });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a comment
export const createComment = async (
  req: CustomRequest & TaskRequest,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  try {
    const taskId = req.taskId;
    const { comment } = req.body as CommentCreateInput;
    const userId = req.session?.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const newComment = await commentModel.createComment(
      pool,
      taskId || '',
      userId,
      comment,
    );

    // Create notifications for watchers
    await notificationModel.createWatcherNotifications(pool, {
      action_user_id: parseInt(userId),
      type_id: NotificationType.TaskComment, // Task Comment
      task_id: parseInt(taskId!),
    });

    res.status(201).json(newComment);
  } catch (error) {
    logger.error({ err: error });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Edit a comment
export const editComment = async (
  req: Request,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  const { id } = req.params;
  const { comment } = req.body as CommentUpdateInput;

  try {
    const editedComment = await commentModel.editComment(pool, id, comment);
    if (!editedComment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    res.status(200).json(editedComment);
  } catch (error) {
    logger.error({ err: error });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a comment
export const deleteComment = async (
  req: Request,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  const { id } = req.params;

  try {
    const deletedComment = await commentModel.deleteComment(pool, id);
    if (!deletedComment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    res.status(200).json(deletedComment);
  } catch (error) {
    logger.error({ err: error });
    res.status(500).json({ error: 'Internal server error' });
  }
};
