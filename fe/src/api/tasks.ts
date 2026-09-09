import { api } from './api';
import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskFilters,
  TaskFormState,
} from '../types/task';
import { Tag } from '../types/tag';
import { ApiResponse } from '../types/api';

const serializeTaskFilters = (filters: TaskFilters): string => {
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, String(value));
    }
  });
  return queryParams.toString();
};

// Get all tasks
export const getTasks = async (
  filters: TaskFilters = {},
  signal?: AbortSignal,
): Promise<Task[]> => {
  const queryParams = serializeTaskFilters(filters);
  const response = await api.get<Task[]>(
    `/tasks${queryParams ? `?${queryParams}` : ''}`,
    { signal },
  );
  return response.data;
};

// Get task by id
export const getTaskById = async (
  id: number,
  signal?: AbortSignal,
): Promise<Task> => {
  const response = await api.get<Task>(`/tasks/${id}`, { signal });
  return response.data;
};

// Create task
export const createTask = async (taskData: Partial<Task>): Promise<Task> => {
  const response = await api.post<Task>('/tasks', taskData);
  return response.data;
};

// Update task
export const updateTask = async (
  taskId: number,
  data: Partial<TaskFormState>,
): Promise<ApiResponse<Task>> => {
  const response = await api.put<ApiResponse<Task>>(`/tasks/${taskId}`, data);
  return response.data;
};

// Delete task
export const deleteTask = async (id: number): Promise<void> => {
  await api.delete<void>(`/tasks/${id}`);
};

// Get project tasks
export const getProjectTasks = async (
  projectId: number,
  filters: TaskFilters = {},
  signal?: AbortSignal,
): Promise<Task[]> => {
  const queryParams = serializeTaskFilters(filters);
  const url = `/projects/${projectId}/tasks${queryParams ? `?${queryParams}` : ''}`;
  const response = await api.get<Task[]>(url, { signal });
  return response.data;
};

// Get subtasks
export const getSubtasks = async (
  parentTaskId: number,
  signal?: AbortSignal,
): Promise<Task[]> => {
  const response = await api.get<Task[]>(`/tasks/${parentTaskId}/subtasks`, {
    signal,
  });
  return response.data;
};

// Get tasks by date range
export const getTasksByDateRange = async (
  startDate: Date,
  endDate: Date,
  signal?: AbortSignal,
): Promise<Task[]> => {
  const response = await api.get<Task[]>('/tasks/calendar', {
    params: {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
    },
    signal,
  });
  return response.data;
};

// Update task dates
export const updateTaskDates = async (
  taskId: number,
  dates: { start_date?: string; due_date?: string },
): Promise<Task> => {
  const response = await api.patch<Task>(`/tasks/${taskId}/dates`, dates);
  return response.data;
};

// Get active tasks
export const getActiveTasks = async (signal?: AbortSignal): Promise<Task[]> => {
  const response = await api.get<Task[]>('/tasks/active', { signal });
  return response.data;
};

// Change task status
export const changeTaskStatus = async (
  taskId: number,
  statusId: number,
): Promise<Task> => {
  const response = await api.patch<Task>(`/tasks/${taskId}/change-status`, {
    statusId,
  });
  return response.data;
};

// Get task statuses
export const getTaskStatuses = async (
  signal?: AbortSignal,
): Promise<TaskStatus[]> => {
  const response = await api.get<TaskStatus[]>('/tasks/statuses', { signal });
  return response.data;
};

// Get task priorities
export const getPriorities = async (
  signal?: AbortSignal,
): Promise<TaskPriority[]> => {
  const response = await api.get<TaskPriority[]>('/tasks/priorities', {
    signal,
  });
  return response.data;
};

// Update task tags
export const updateTaskTags = async (
  taskId: number,
  tags: Tag[],
): Promise<ApiResponse<void>> => {
  const response = await api.put<ApiResponse<void>>(`/tasks/${taskId}/tags`, {
    tags,
  });
  return response.data;
};
