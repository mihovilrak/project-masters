import { api } from './api';
import { Tag } from '../types/tag';

// Get all tags
export const getTags = async (signal?: AbortSignal): Promise<Tag[]> => {
  const response = await api.get<Tag[]>('/tags', { signal });
  return response.data;
};

// Create tag
export const createTag = async (tagData: Partial<Tag>): Promise<Tag> => {
  const response = await api.post<Tag>('/tags', tagData);
  return response.data;
};

// Add tags to task
export const addTaskTags = async (
  taskId: number,
  tagIds: number[],
): Promise<Tag[]> => {
  const response = await api.post<Tag[]>(`/tasks/${taskId}/tags`, { tagIds });
  return response.data;
};

// Remove tag from task
export const removeTaskTag = async (
  taskId: number,
  tagId: number,
): Promise<void> => {
  await api.delete<void>(`/tasks/${taskId}/tags/${tagId}`);
};

// Get task tags
export const getTaskTags = async (
  taskId: number,
  signal?: AbortSignal,
): Promise<Tag[]> => {
  const response = await api.get<Tag[]>(`/tasks/${taskId}/tags`, { signal });
  return response.data;
};
