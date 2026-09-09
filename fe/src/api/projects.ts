import { api } from './api';
import { Project, ProjectMember, ProjectStatus } from '../types/project';

// Get all projects
export const getProjects = async (
  params?: {
    status_id?: number;
    created_by?: number;
    parent_id?: number;
    start_date_from?: string;
    start_date_to?: string;
    due_date_from?: string;
    due_date_to?: string;
  },
  signal?: AbortSignal,
): Promise<Project[]> => {
  const response = await api.get<Project[]>('/projects', {
    params,
    signal,
  });
  return response.data;
};

// Get project by id
export const getProjectById = async (
  id: number,
  signal?: AbortSignal,
): Promise<Project> => {
  const response = await api.get<Project>(`/projects/${id}`, { signal });
  return response.data;
};

// Get project details
export const getProjectDetails = async (
  id: number,
  signal?: AbortSignal,
): Promise<Project | null> => {
  try {
    const response = await api.get<Project>(`/projects/${id}/details`, {
      signal,
    });
    return response.data || null;
  } catch (error: unknown) {
    const err = error as { response?: { status?: number } };
    if (err?.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

// Create project
export const createProject = async (
  values: Partial<Project>,
): Promise<Project> => {
  const response = await api.post<Project>('/projects', values);
  return response.data;
};

// Change project status
export const changeProjectStatus = async (
  id: number,
  statusId: number,
): Promise<{ message: string }> => {
  const response = await api.patch<{ message: string }>(
    `/projects/${id}/status`,
    {
      status_id: statusId,
    },
  );
  return response.data;
};

// Update project
export const updateProject = async (
  id: number,
  updates: Partial<Project>,
): Promise<Project> => {
  const response = await api.put<Project>(`/projects/${id}`, updates);
  return response.data;
};

// Delete project
export const deleteProject = async (id: number): Promise<void> => {
  await api.delete<void>(`/projects/${id}`);
};

// Get project members
export const getProjectMembers = async (
  id: number,
  signal?: AbortSignal,
): Promise<ProjectMember[]> => {
  const response = await api.get<ProjectMember[]>(`/projects/${id}/members`, {
    signal,
  });
  return response.data || [];
};

// Add project member
export const addProjectMember = async (
  projectId: number,
  userId: number,
): Promise<ProjectMember> => {
  const response = await api.post<ProjectMember>(
    `/projects/${projectId}/members`,
    {
      userId,
    },
  );
  return response.data;
};

// Remove project member
export const removeProjectMember = async (
  projectId: number,
  userId: number,
): Promise<void> => {
  await api.delete<void>(`/projects/${projectId}/members`, {
    data: { userId },
  });
};

// Update project member
export const updateProjectMember = async (
  projectId: number,
  userId: number,
  role: string,
): Promise<ProjectMember> => {
  const response = await api.put<ProjectMember>(
    `/projects/${projectId}/members/${userId}`,
    { role },
  );
  return response.data;
};

// Get subprojects
export const getSubprojects = async (
  projectId: number,
  signal?: AbortSignal,
): Promise<Project[]> => {
  const response = await api.get<Project[]>(
    `/projects/${projectId}/subprojects`,
    { signal },
  );
  return response.data;
};

// Get project spent time
export const getProjectSpentTime = async (
  projectId: number,
): Promise<number> => {
  const response = await api.get<number>(`/projects/${projectId}/spent-time`);
  return response.data;
};

// Get project statuses
export const getProjectStatuses = async (
  signal?: AbortSignal,
): Promise<ProjectStatus[]> => {
  const response = await api.get<ProjectStatus[]>('/projects/statuses', {
    signal,
  });
  return response.data;
};
