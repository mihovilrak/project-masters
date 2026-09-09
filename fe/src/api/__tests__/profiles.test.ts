import { api } from '../api';
import {
  ProfileData,
  ProfileUpdateData,
  PasswordChange,
} from '../../types/profile';
import {
  getProfile,
  updateProfile,
  changePassword,
  getRecentTasks,
  getRecentProjects,
} from '../profiles';
import { Task } from '../../types/task';

// Mock the api module
jest.mock('../api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('Profile API', () => {
  // Mock data
  const mockProfileData: ProfileData = {
    id: 1,
    login: 'testuser',
    name: 'Test',
    surname: 'User',
    email: 'test@example.com',
    role_id: 1,
    status_id: 1,
    created_on: '2023-01-01T00:00:00Z',
    updated_on: null,
    last_login: null,
    total_tasks: 10,
    completed_tasks: 5,
    active_projects: 3,
    total_hours: 40,
  };

  const mockUpdateData: ProfileUpdateData = {
    name: 'Updated',
    surname: 'Name',
    email: 'updated@example.com',
  };

  const mockPasswordData: PasswordChange = {
    current_password: 'oldpass',
    new_password: 'newpass',
    confirm_password: 'newpass',
  };

  const mockTasks: Task[] = [
    {
      id: 1,
      name: 'Test Task',
      project_id: 1,
      project_name: 'Test Project',
      holder_id: 1,
      holder_name: 'Test Holder',
      assignee_id: 1,
      assignee_name: 'Test Assignee',
      parent_id: null,
      parent_name: null,
      estimated_time: 8,
      description: 'Test Description',
      type_id: 1,
      type_name: 'Test Type',
      status_id: 1,
      status_name: 'In Progress',
      priority_id: 1,
      priority_name: 'High',
      start_date: '2023-01-01',
      due_date: '2023-01-31',
      spent_time: 0,
      progress: 0,
      created_by: 1,
      created_by_name: 'Test Creator',
      created_on: '2023-01-01T00:00:00Z',
    },
  ];

  const mockProjects = [
    {
      id: 1,
      name: 'Test Project',
      description: 'Test Description',
      parent_id: null,
      parent_name: null,
      status_id: 1,
      status_name: 'Active',
      start_date: '2023-01-01',
      due_date: '2023-12-31',
      created_by: 1,
      created_by_name: 'Test Creator',
      created_on: '2023-01-01T00:00:00Z',
      estimated_time: 100,
      spent_time: 40,
      progress: 40,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should fetch profile data successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: mockProfileData });

      const result = await getProfile();

      expect(mockedApi.get).toHaveBeenCalledWith('/profile', {
        signal: undefined,
      });
      expect(result).toEqual(mockProfileData);
    });

    it('should throw error when fetch fails', async () => {
      const error = new Error('Network error');
      mockedApi.get.mockRejectedValueOnce(error);

      await expect(getProfile()).rejects.toThrow(error);
      expect(mockedApi.get).toHaveBeenCalledWith('/profile', {
        signal: undefined,
      });
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      mockedApi.put.mockResolvedValueOnce({ data: mockProfileData });

      const result = await updateProfile(mockUpdateData);

      expect(mockedApi.put).toHaveBeenCalledWith('/profile', mockUpdateData);
      expect(result).toEqual(mockProfileData);
    });

    it('should throw error when update fails', async () => {
      const error = new Error('Update failed');
      mockedApi.put.mockRejectedValueOnce(error);

      await expect(updateProfile(mockUpdateData)).rejects.toThrow(error);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      mockedApi.put.mockResolvedValueOnce({ data: null });

      await changePassword(mockPasswordData);

      expect(mockedApi.put).toHaveBeenCalledWith(
        '/profile/password',
        mockPasswordData,
      );
    });

    it('should throw error when password change fails', async () => {
      const error = new Error('Password change failed');
      mockedApi.put.mockRejectedValueOnce(error);

      await expect(changePassword(mockPasswordData)).rejects.toThrow(error);
    });
  });

  describe('getRecentTasks', () => {
    it('should fetch recent tasks successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: mockTasks });

      const result = await getRecentTasks();

      expect(mockedApi.get).toHaveBeenCalledWith('/profile/tasks', {
        signal: undefined,
      });
      expect(result).toEqual(mockTasks);
    });

    it('should throw error when fetch fails', async () => {
      const error = new Error('Network error');
      mockedApi.get.mockRejectedValueOnce(error);

      await expect(getRecentTasks()).rejects.toThrow(error);
    });
  });

  describe('getRecentProjects', () => {
    it('should fetch recent projects successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: mockProjects });

      const result = await getRecentProjects();

      expect(mockedApi.get).toHaveBeenCalledWith('/profile/projects', {
        signal: undefined,
      });
      expect(result).toEqual(mockProjects);
    });

    it('should throw error when fetch fails', async () => {
      const error = new Error('Network error');
      mockedApi.get.mockRejectedValueOnce(error);

      await expect(getRecentProjects()).rejects.toThrow(error);
    });
  });
});
