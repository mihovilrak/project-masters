import { api } from '../api';
import { Project, ProjectMember, ProjectStatus } from '../../types/project';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectMembers,
  getProjectStatuses,
  getProjectDetails,
  changeProjectStatus,
  addProjectMember,
  removeProjectMember,
  updateProjectMember,
  getSubprojects,
  getProjectSpentTime,
} from '../projects';

// Mock the api module
jest.mock('../api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('Projects API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock data
  const mockProject: Project = {
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
  };

  const mockProjectMember: ProjectMember = {
    project_id: 1,
    user_id: 1,
    created_on: '2023-01-01T00:00:00Z',
    name: 'Test',
    surname: 'User',
    role: 'Developer',
  };

  const mockProjectStatus: ProjectStatus = {
    id: 1,
    name: 'Active',
  };

  describe('getProjects', () => {
    it('should fetch projects', async () => {
      const mockProjects = [mockProject];
      mockedApi.get.mockResolvedValueOnce({ data: mockProjects });

      const result = await getProjects();

      expect(mockedApi.get).toHaveBeenCalledWith('/projects', {
        params: undefined,
      });
      expect(result).toEqual(mockProjects);
    });
  });

  describe('getProjectDetails', () => {
    it('should fetch project details with members', async () => {
      const projectWithMembers = {
        ...mockProject,
        members: [mockProjectMember],
      };
      mockedApi.get.mockResolvedValueOnce({ data: projectWithMembers });

      const result = await getProjectDetails(1);

      expect(mockedApi.get).toHaveBeenCalledWith('/projects/1/details', {
        signal: undefined,
      });
      expect(result).toEqual(projectWithMembers);
    });

    it('should handle project not found', async () => {
      const notFoundError = new Error('Project not found');
      notFoundError.name = 'NotFoundError';
      mockedApi.get.mockRejectedValueOnce(notFoundError);

      await expect(getProjectDetails(999)).rejects.toThrow('Project not found');
    });
  });

  describe('getProjectById', () => {
    it('should fetch project by id successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: mockProject });

      const result = await getProjectById(1);

      expect(mockedApi.get).toHaveBeenCalledWith('/projects/1', {
        signal: undefined,
      });
      expect(result).toEqual(mockProject);
    });

    it('should throw error when fetch fails', async () => {
      const error = new Error('Network error');
      mockedApi.get.mockRejectedValueOnce(error);

      await expect(getProjectById(1)).rejects.toThrow(error);
    });
  });

  describe('createProject', () => {
    const newProject = { name: 'New Project', description: 'New Description' };

    it('should create project successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: mockProject });

      const result = await createProject(newProject);

      expect(mockedApi.post).toHaveBeenCalledWith('/projects', newProject);
      expect(result).toEqual(mockProject);
    });

    it('should throw error when creation fails', async () => {
      const error = new Error('Creation failed');
      mockedApi.post.mockRejectedValueOnce(error);

      await expect(createProject(newProject)).rejects.toThrow(error);
    });
  });

  describe('updateProject', () => {
    it('should update project with partial data', async () => {
      const partialUpdate: Partial<Project> = { name: 'Updated Name' };
      const updatedProject = { ...mockProject, ...partialUpdate };
      mockedApi.put.mockResolvedValueOnce({ data: updatedProject });

      const result = await updateProject(1, partialUpdate);

      expect(mockedApi.put).toHaveBeenCalledWith('/projects/1', partialUpdate);
      expect(result).toEqual(updatedProject);
    });

    it('should validate required fields', async () => {
      const invalidUpdate: Partial<Project> = { name: 'test' };
      const validationError = new Error('Validation failed');
      mockedApi.put.mockRejectedValueOnce(validationError);

      await expect(updateProject(1, invalidUpdate)).rejects.toThrow(
        'Validation failed',
      );
    });
  });

  describe('deleteProject', () => {
    it('should delete project successfully', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: null });

      await deleteProject(1);

      expect(mockedApi.delete).toHaveBeenCalledWith('/projects/1');
    });

    it('should throw error when deletion fails', async () => {
      const error = new Error('Deletion failed');
      mockedApi.delete.mockRejectedValueOnce(error);

      await expect(deleteProject(1)).rejects.toThrow(error);
    });
  });

  describe('getProjectSpentTime', () => {
    it('should return zero for new project', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: 0 });

      const result = await getProjectSpentTime(1);

      expect(mockedApi.get).toHaveBeenCalledWith('/projects/1/spent-time');
      expect(result).toBe(0);
    });

    it('should handle invalid project id', async () => {
      const error = new Error('Invalid project ID');
      mockedApi.get.mockRejectedValueOnce(error);

      await expect(getProjectSpentTime(-1)).rejects.toThrow(
        'Invalid project ID',
      );
    });
  });

  describe('changeProjectStatus', () => {
    it('should handle invalid status transition', async () => {
      const error = new Error('Invalid status transition');
      mockedApi.patch.mockRejectedValueOnce(error);

      await expect(changeProjectStatus(1, 2)).rejects.toThrow(
        'Invalid status transition',
      );
    });

    it('should send the numeric status id', async () => {
      mockedApi.patch.mockResolvedValueOnce({
        data: { message: 'Project status changed to inactive.' },
      });

      const result = await changeProjectStatus(1, 2);

      expect(mockedApi.patch).toHaveBeenCalledWith('/projects/1/status', {
        status_id: 2,
      });
      expect(result).toEqual({
        message: 'Project status changed to inactive.',
      });
    });
  });

  describe('getProjectMembers', () => {
    it('should fetch members successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [mockProjectMember] });
      const result = await getProjectMembers(1);
      expect(mockedApi.get).toHaveBeenCalledWith('/projects/1/members', {
        signal: undefined,
      });
      expect(result).toEqual([mockProjectMember]);
    });
  });

  describe('getProjectStatuses', () => {
    it('should fetch statuses successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [mockProjectStatus] });
      const result = await getProjectStatuses();
      expect(mockedApi.get).toHaveBeenCalledWith('/projects/statuses', {
        signal: undefined,
      });
      expect(result).toEqual([mockProjectStatus]);
    });
  });

  describe('addProjectMember', () => {
    it('should add member successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: mockProjectMember });

      const result = await addProjectMember(1, 1);

      expect(mockedApi.post).toHaveBeenCalledWith('/projects/1/members', {
        userId: 1,
      });
      expect(result).toEqual(mockProjectMember);
    });

    it('should throw error when adding member fails', async () => {
      const error = new Error('Add member failed');
      mockedApi.post.mockRejectedValueOnce(error);

      await expect(addProjectMember(1, 1)).rejects.toThrow(error);
    });
  });

  describe('removeProjectMember', () => {
    it('should remove member successfully', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: null });

      await removeProjectMember(1, 1);

      expect(mockedApi.delete).toHaveBeenCalledWith('/projects/1/members', {
        data: { userId: 1 },
      });
    });

    it('should throw error when removing member fails', async () => {
      const error = new Error('Remove member failed');
      mockedApi.delete.mockRejectedValueOnce(error);

      await expect(removeProjectMember(1, 1)).rejects.toThrow(error);
    });
  });

  describe('updateProjectMember', () => {
    it('should update member successfully', async () => {
      mockedApi.put.mockResolvedValueOnce({ data: mockProjectMember });

      const result = await updateProjectMember(1, 1, 'Manager');

      expect(mockedApi.put).toHaveBeenLastCalledWith('/projects/1/members/1', {
        role: 'Manager',
      });
      expect(result).toEqual(mockProjectMember);
    });

    it('should throw error when updating member fails', async () => {
      const error = new Error('Update member failed');
      mockedApi.put.mockRejectedValueOnce(error);

      await expect(updateProjectMember(1, 1, 'Manager')).rejects.toThrow(error);
    });
  });

  describe('getSubprojects', () => {
    it('should fetch subprojects successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [mockProject] });

      const result = await getSubprojects(1);

      expect(mockedApi.get).toHaveBeenCalledWith('/projects/1/subprojects', {
        signal: undefined,
      });
      expect(result).toEqual([mockProject]);
    });

    it('should throw error when fetch fails', async () => {
      const error = new Error('Network error');
      mockedApi.get.mockRejectedValueOnce(error);

      await expect(getSubprojects(1)).rejects.toThrow(error);
    });
  });
});
