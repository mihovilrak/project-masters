import { api } from './api';
import { Comment } from '../types/comment';

// Get task comments
export const getTaskComments = async (
  taskId: number,
  signal?: AbortSignal,
): Promise<Comment[]> => {
  const response = await api.get<Comment[]>(`/tasks/${taskId}/comments`, {
    signal,
  });
  return response.data;
};

// Create comment
export const createComment = async (
  taskId: number,
  data: { comment: string },
): Promise<Comment> => {
  const response = await api.post<Comment>(`/tasks/${taskId}/comments`, data);
  return response.data;
};

// Edit comment
export const editComment = async (
  id: number,
  taskId: number,
  data: { comment: string },
): Promise<Comment> => {
  const response = await api.put<Comment>(
    `/tasks/${taskId}/comments/${id}`,
    data,
  );
  return response.data;
};

// Delete comment
export const deleteComment = async (
  taskId: number,
  id: number,
): Promise<void> => {
  await api.delete<void>(`/tasks/${taskId}/comments/${id}`);
};
