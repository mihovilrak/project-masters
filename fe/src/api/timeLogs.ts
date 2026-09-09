import { api } from './api';
import { TimeLog, TimeLogCreate, TimeSpent } from '../types/timeLog';

// Get all time logs (admin only)
export const getAllTimeLogs = async (): Promise<TimeLog[]> => {
  const response = await api.get<TimeLog[]>('/time-logs');
  return response.data;
};

// Get task time logs
export const getTaskTimeLogs = async (
  taskId: number,
  signal?: AbortSignal,
): Promise<TimeLog[]> => {
  const response = await api.get<TimeLog[]>(`/time-logs/tasks/${taskId}/logs`, {
    signal,
  });
  return response.data;
};

// Get task spent time
export const getTaskSpentTime = async (taskId: number): Promise<TimeSpent> => {
  const response = await api.get<TimeSpent>(
    `/time-logs/tasks/${taskId}/spent-time`,
  );
  return response.data;
};

// Get project time logs
export const getProjectTimeLogs = async (
  projectId: number,
  params?: Record<string, any>,
  signal?: AbortSignal,
): Promise<TimeLog[]> => {
  const response = await api.get<TimeLog[]>(
    `/time-logs/projects/${projectId}/logs`,
    { params, signal },
  );
  return response.data;
};

// Get project spent time
export const getProjectSpentTime = async (
  projectId: number,
): Promise<TimeSpent> => {
  const response = await api.get<TimeSpent>(
    `/time-logs/projects/${projectId}/spent-time`,
  );
  return response.data;
};

// Create time log
export const createTimeLog = async (
  taskId: number,
  timeLog: TimeLogCreate,
): Promise<TimeLog> => {
  const response = await api.post<TimeLog>(`/time-logs/tasks/${taskId}/logs`, {
    log_date: timeLog.log_date,
    spent_time: timeLog.spent_time,
    description: timeLog.description ?? '',
    activity_type_id: timeLog.activity_type_id,
  });
  return response.data;
};

// Get user time logs
export const getUserTimeLogs = async (
  params?: Record<string, any>,
  signal?: AbortSignal,
): Promise<TimeLog[]> => {
  const response = await api.get<TimeLog[]>('/time-logs/user/logs', {
    params,
    signal,
  });
  return response.data;
};

// Update time log
export const updateTimeLog = async (
  timeLogId: number,
  timeLog: TimeLogCreate,
): Promise<TimeLog> => {
  const response = await api.put<TimeLog>(`/time-logs/${timeLogId}`, {
    log_date: timeLog.log_date,
    spent_time: timeLog.spent_time,
    description: timeLog.description,
    activity_type_id: timeLog.activity_type_id,
  });
  return response.data;
};

// Delete time log
export const deleteTimeLog = async (timeLogId: number): Promise<void> => {
  await api.delete<void>(`/time-logs/${timeLogId}`);
};
