import { api } from './api';
import { ActivityType } from '../types/setting';

// Get activity types
export const getActivityTypes = async (
  signal?: AbortSignal,
): Promise<ActivityType[]> => {
  const response = await api.get<ActivityType[]>('/admin/activity-types', {
    signal,
  });
  return response.data;
};

// Create activity type
export const createActivityType = async (
  data: Partial<ActivityType>,
): Promise<ActivityType> => {
  const response = await api.post<ActivityType>('/admin/activity-types', data);
  return response.data;
};

// Update activity type
export const updateActivityType = async (
  id: number,
  data: Partial<ActivityType>,
): Promise<ActivityType> => {
  const response = await api.put<ActivityType>(
    `/admin/activity-types/${id}`,
    data,
  );
  return response.data;
};

// Delete activity type
export const deleteActivityType = async (id: number): Promise<void> => {
  await api.delete<void>(`/admin/activity-types/${id}`);
};

// Get available icons
export const getAvailableIcons = async (
  signal?: AbortSignal,
): Promise<string[]> => {
  const response = await api.get<string[]>('/admin/activity-types/icons', {
    signal,
  });
  return response.data;
};
