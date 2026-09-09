import { api } from './api';
import { Permission } from '../types/admin';

// Get all permissions
export const getAllPermissions = async (
  signal?: AbortSignal,
): Promise<Permission[]> => {
  const response = await api.get<Permission[]>('/admin/permissions', {
    signal,
  });
  return response.data;
};
