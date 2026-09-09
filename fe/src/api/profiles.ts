import { api } from './api';
import { User } from '../types/user';
import { Task } from '../types/task';
import { Project } from '../types/project';
import {
  ProfileData,
  ProfileUpdateData,
  PasswordChange,
} from '../types/profile';

// Get user profile
export const getProfile = async (
  signal?: AbortSignal,
): Promise<ProfileData> => {
  const response = await api.get<ProfileData>('/profile', { signal });
  return response.data;
};

// Update user profile
export const updateProfile = async (
  profileData: ProfileUpdateData,
): Promise<User> => {
  const response = await api.put<User>('/profile', profileData);
  return response.data;
};

// Change user password
export const changePassword = async (
  passwordData: PasswordChange,
): Promise<void> => {
  await api.put<void>('/profile/password', passwordData);
};

// Get recent tasks
export const getRecentTasks = async (signal?: AbortSignal): Promise<Task[]> => {
  const response = await api.get<Task[]>('/profile/tasks', { signal });
  return response.data;
};

// Get recent projects
export const getRecentProjects = async (
  signal?: AbortSignal,
): Promise<Project[]> => {
  const response = await api.get<Project[]>('/profile/projects', { signal });
  return response.data;
};
