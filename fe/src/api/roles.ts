import { api } from './api';
import { Role } from '../types/role';

// Get roles with permissions
export const getRoles = async (signal?: AbortSignal): Promise<Role[]> => {
  const response = await api.get<Role[]>('/roles', { signal });
  return response.data;
};

// Create role
export const createRole = async (roleData: Partial<Role>): Promise<Role> => {
  const response = await api.post<Role>('/roles', roleData);
  return response.data;
};

// Update role
export const updateRole = async (
  id: number,
  roleData: Partial<Role>,
): Promise<Role> => {
  const response = await api.put<Role>(`/roles/${id}`, roleData);
  return response.data;
};

// Delete role
export const deleteRole = async (id: number): Promise<void> => {
  await api.delete<void>(`/roles/${id}`);
};
