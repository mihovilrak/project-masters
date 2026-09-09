import { renderHook, act, waitFor } from '@testing-library/react';
import { useTimeLogData } from '../useTimeLogData';
import { getProjects } from '../../../api/projects';
import { getProjectTasks } from '../../../api/tasks';
import { getUsers } from '../../../api/users';
import { getActivityTypes } from '../../../api/activityTypes';
import logger from '../../../utils/logger';
import { Project } from '../../../types/project';
import { Task } from '../../../types/task';
import { User } from '../../../types/user';
import { ActivityType } from '../../../types/timeLog';

// Mock the API calls
jest.mock('../../../api/projects');
jest.mock('../../../api/tasks');
jest.mock('../../../api/users');
jest.mock('../../../api/activityTypes');

const mockProjects: Project[] = [
  {
    id: 1,
    name: 'Project 1',
    description: 'Test project 1',
    start_date: '2025-02-01',
    due_date: '2025-03-01',
    parent_id: null,
    parent_name: null,
    status_id: 1,
    status_name: 'Active',
    created_by: 1,
    created_by_name: 'Test User',
    created_on: '2025-02-01',
    estimated_time: 0,
    spent_time: 0,
    progress: 0,
  },
  {
    id: 2,
    name: 'Project 2',
    description: 'Test project 2',
    start_date: '2025-02-01',
    due_date: '2025-03-01',
    parent_id: null,
    parent_name: null,
    status_id: 1,
    status_name: 'Active',
    created_by: 1,
    created_by_name: 'Test User',
    created_on: '2025-02-01',
    estimated_time: 0,
    spent_time: 0,
    progress: 0,
  },
];

const mockTasks: Task[] = [
  {
    id: 1,
    name: 'Task 1',
    project_id: 1,
    project_name: 'Project 1',
    parent_id: null,
    parent_name: null,
    description: 'Test task 1',
    type_id: 1,
    type_name: 'Task',
    status_id: 1,
    status_name: 'Active',
    priority_id: 1,
    priority_name: 'Normal',
    start_date: '2025-02-01',
    due_date: '2025-03-01',
    spent_time: 0,
    created_by: 1,
    created_by_name: 'User 1',
    created_on: '2025-02-01',
    estimated_time: 10,
    progress: 0,
  },
  {
    id: 2,
    name: 'Task 2',
    project_id: 1,
    project_name: 'Project 1',
    parent_id: null,
    parent_name: null,
    description: 'Test task 2',
    type_id: 1,
    type_name: 'Task',
    status_id: 1,
    status_name: 'Active',
    priority_id: 1,
    priority_name: 'Normal',
    start_date: '2025-02-01',
    due_date: '2025-03-01',
    spent_time: 0,
    created_by: 2,
    created_by_name: 'User 21',
    created_on: '2025-02-01',
    estimated_time: 20,
    progress: 0,
  },
];

const mockUsers: User[] = [
  {
    id: 1,
    name: 'User 1',
    login: 'user1',
    surname: 'Test',
    email: 'user1@test.com',
    role_id: 1,
    role_name: 'User',
    status_id: 1,
    status_name: 'Active',
    created_on: '2025-02-01',
    updated_on: null,
  },
  {
    id: 2,
    name: 'User 2',
    login: 'user2',
    surname: 'Test',
    email: 'user2@test.com',
    role_id: 1,
    role_name: 'User',
    status_id: 1,
    status_name: 'Active',
    created_on: '2025-02-01',
    updated_on: null,
  },
];

const mockActivityTypes: ActivityType[] = [
  {
    id: 1,
    name: 'Activity 1',
    description: 'Test activity 1',
    color: '#000',
    icon: 'icon1',
    active: true,
    created_on: '2025-02-01',
    updated_on: null,
  },
  {
    id: 2,
    name: 'Activity 2',
    description: 'Test activity 2',
    color: '#fff',
    icon: 'icon2',
    active: true,
    created_on: '2025-02-01',
    updated_on: null,
  },
];

describe('useTimeLogData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getProjects as jest.Mock).mockResolvedValue(mockProjects);
    (getProjectTasks as jest.Mock).mockResolvedValue(mockTasks);
    (getUsers as jest.Mock).mockResolvedValue(mockUsers);
    (getActivityTypes as jest.Mock).mockResolvedValue(mockActivityTypes);
  });

  it('should load initial data when opened', async () => {
    const { result } = renderHook(() =>
      useTimeLogData({
        open: true,
        projectId: undefined,
        hasAdminPermission: false,
      }),
    );

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getActivityTypes).toHaveBeenCalled();
    expect(result.current.activityTypes).toEqual(mockActivityTypes);
    expect(result.current.isLoading).toBe(false);
  });

  it('does not fetch data while closed', () => {
    const { result } = renderHook(() =>
      useTimeLogData({
        open: false,
        projectId: 1,
        hasAdminPermission: true,
      }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(getActivityTypes).not.toHaveBeenCalled();
    expect(getProjects).not.toHaveBeenCalled();
    expect(getUsers).not.toHaveBeenCalled();
    expect(getProjectTasks).not.toHaveBeenCalled();
  });

  it('should load projects and tasks on mount', async () => {
    const { result } = renderHook(() =>
      useTimeLogData({
        open: true,
        projectId: 1,
        hasAdminPermission: false,
      }),
    );

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getProjects).toHaveBeenCalled();
    expect(getProjectTasks).toHaveBeenCalledWith(1);
    expect(result.current.projects).toEqual(mockProjects);
    expect(result.current.tasks).toEqual(mockTasks);
    expect(result.current.isLoading).toBe(false);
  });

  it('should load users when has admin permission', async () => {
    const { result } = renderHook(() =>
      useTimeLogData({
        open: true,
        projectId: undefined,
        hasAdminPermission: true,
      }),
    );

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getUsers).toHaveBeenCalled();
    expect(result.current.users).toEqual(mockUsers);
  });

  it('should handle project selection', async () => {
    const { result } = renderHook(() =>
      useTimeLogData({
        open: true,
        projectId: undefined,
        hasAdminPermission: false,
      }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.handleProjectSelect(1);
    });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getProjectTasks).toHaveBeenCalledWith(1);
    expect(result.current.tasks).toEqual(mockTasks);
  });

  it('should clear tasks when project is deselected', async () => {
    const { result } = renderHook(() =>
      useTimeLogData({
        open: true,
        projectId: 1,
        hasAdminPermission: false,
      }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.handleProjectSelect(null);
    });

    expect(result.current.tasks).toEqual([]);
  });

  it('should handle API errors gracefully', async () => {
    (getProjects as jest.Mock).mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() =>
      useTimeLogData({
        open: true,
        projectId: undefined,
        hasAdminPermission: false,
      }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(logger.error).toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });
});
