import { api } from './api';
import { TaskWatcher } from '../types/watcher';

// Get task watchers
export const getTaskWatchers = async (
  taskId: number,
  signal?: AbortSignal,
): Promise<TaskWatcher[]> => {
  const response = await api.get<TaskWatcher[]>(`/tasks/${taskId}/watchers`, {
    signal,
  });
  return response.data;
};

// Add task watcher
export const addTaskWatcher = async (
  taskId: number,
  userId: number,
): Promise<TaskWatcher> => {
  const response = await api.post<TaskWatcher>(`/tasks/${taskId}/watchers`, {
    userId,
  });
  return response.data;
};

// Remove task watcher
export const removeTaskWatcher = async (
  taskId: number,
  userId: number,
): Promise<void> => {
  await api.delete<void>(`/tasks/${taskId}/watchers/${userId}`);
};
