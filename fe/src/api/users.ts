import { api } from './api';
import { User, UserCreate, UserUpdate, UserStatus } from '../types/user';

// Get user statuses
export const getUserStatuses = async (
  signal?: AbortSignal,
): Promise<UserStatus[]> => {
  const response = await api.get<UserStatus[]>('/users/statuses', { signal });
  return response.data;
};

// Get all users. Pass { all: true } to include inactive and deleted (e.g. Settings).
export const getUsers = async (
  whereParams?: Record<string, any>,
  options?: { all?: boolean },
  signal?: AbortSignal,
): Promise<User[]> => {
  const params: Record<string, any> = {};

  if (whereParams && Object.keys(whereParams).length > 0) {
    params.whereParams = JSON.stringify(whereParams);
  }
  if (options?.all) {
    params.all = '1';
  }

  const response = await api.get<User[]>('/users', { params, signal });
  return response.data;
};

// Get user by id
export const getUserById = async (id: number): Promise<User> => {
  const response = await api.get<User>(`/users/${id}`);
  return response.data;
};

// Create user
export const createUser = async (userData: UserCreate): Promise<User> => {
  const response = await api.post<User>('/users', userData);
  return response.data;
};

// Update user
export const updateUser = async (
  id: number,
  userData: UserUpdate,
): Promise<User> => {
  const response = await api.put<User>(`/users/${id}`, userData);
  return response.data;
};

// Delete user
export const deleteUser = async (id: number): Promise<void> => {
  await api.delete<void>(`/users/${id}`);
};

// Change user status
export const changeUserStatus = async (id: number): Promise<User> => {
  const response = await api.patch<User>(`/users/${id}/status`);
  return response.data;
};
