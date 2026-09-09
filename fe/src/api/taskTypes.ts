import { api } from './api';
import { TaskType } from '../types/task';

// Get all task types
export const getTaskTypes = async (
  signal?: AbortSignal,
): Promise<TaskType[]> => {
  const response = await api.get<TaskType[]>('/admin/task-types', { signal });
  return response.data;
};

// Get task type by id
export const getTaskTypeById = async (id: number): Promise<TaskType> => {
  const response = await api.get<TaskType>(`/admin/task-types/${id}`);
  return response.data;
};

// Create task type
export const createTaskType = async (
  taskTypeData: Partial<TaskType>,
): Promise<TaskType> => {
  const response = await api.post<TaskType>('/admin/task-types', taskTypeData);
  return response.data;
};

// Update task type
export const updateTaskType = async (
  id: number,
  taskTypeData: Partial<TaskType>,
): Promise<TaskType> => {
  const response = await api.put<TaskType>(
    `/admin/task-types/${id}`,
    taskTypeData,
  );
  return response.data;
};

// Delete task type
export const deleteTaskType = async (id: number): Promise<void> => {
  await api.delete<void>(`/admin/task-types/${id}`);
};

// Get available icons
export const getAvailableIcons = async (
  signal?: AbortSignal,
): Promise<string[]> => {
  const response = await api.get<string[]>('/admin/task-types/icons', {
    signal,
  });
  return response.data;
};
