import { renderHook, act } from '@testing-library/react';
import { useProjectDetails } from '../useProjectDetails';
import {
  getProjectById,
  getProjectDetails,
  updateProject,
  deleteProject,
} from '../../../api/projects';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Project } from '../../../types/project';

// Mock dependencies
jest.mock('../../../api/projects');
jest.mock('../../../context/AuthContext');
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));
jest.mock('../useProjectMembers', () => ({
  useProjectMembers: () => ({
    members: [],
    loadMembers: jest.fn(),
    handleMemberUpdate: jest.fn(),
    handleMemberRemove: jest.fn(),
  }),
}));
jest.mock('../useProjectTasks', () => ({
  useProjectTasks: () => ({
    tasks: [],
    loadTasks: jest.fn(),
  }),
}));
jest.mock('../useProjectTimeLogs', () => ({
  useProjectTimeLogs: () => ({
    timeLogs: [],
    loadTimeLogs: jest.fn(),
  }),
}));

describe('useProjectDetails', () => {
  const mockProject: Project = {
    id: 1,
    name: 'Test Project',
    description: 'Test Description',
    status_id: 1,
    status_name: 'Active',
    start_date: '2024-01-01',
    due_date: '2024-12-31',
    end_date: null,
    created_by: 1,
    created_by_name: 'Test User',
    created_on: '2024-01-01',
    updated_on: null,
    estimated_time: 100,
    spent_time: 50,
    progress: 50,
    parent_id: null,
    parent_name: null,
  };

  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    (useAuth as jest.Mock).mockReturnValue({
      currentUser: { id: 1 },
      hasPermission: () => true,
    });
    (getProjectById as jest.Mock).mockResolvedValue(mockProject);
    (getProjectDetails as jest.Mock).mockResolvedValue(mockProject);
  });

  it('should fetch project data on mount', async () => {
    const { result } = renderHook(() => useProjectDetails('1'));

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(getProjectById).toHaveBeenCalledWith(1, expect.any(AbortSignal));
    expect(getProjectDetails).toHaveBeenCalledWith(1, expect.any(AbortSignal));
    expect(result.current.project).toEqual(mockProject);
    expect(result.current.projectDetails).toEqual(mockProject);
    expect(result.current.loading).toBe(false);
  });

  it('should handle project update', async () => {
    const updatedProject = { ...mockProject, name: 'Updated Project' };
    (updateProject as jest.Mock).mockResolvedValue(updatedProject);

    const { result } = renderHook(() => useProjectDetails('1'));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.handleProjectUpdate(updatedProject);
    });

    expect(updateProject).toHaveBeenCalledWith(1, updatedProject);
    expect(result.current.project).toEqual(updatedProject);
  });

  it('should handle project deletion', async () => {
    (deleteProject as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useProjectDetails('1'));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.handleProjectDelete();
    });

    expect(deleteProject).toHaveBeenCalledWith(1);
    expect(mockNavigate).toHaveBeenCalledWith('/projects');
  });

  it('should handle error during project fetch', async () => {
    const error = new Error('Failed to fetch project');
    (getProjectById as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useProjectDetails('1'));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.error).toBe('Failed to fetch project');
    expect(result.current.loading).toBe(false);
  });

  it('should toggle dialog states correctly', async () => {
    const { result } = renderHook(() => useProjectDetails('1'));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Toggle edit dialog
    act(() => {
      result.current.setState((prev) => ({
        ...prev,
        editDialogOpen: true,
      }));
    });
    expect(result.current.editDialogOpen).toBe(true);

    act(() => {
      result.current.setState((prev) => ({
        ...prev,
        editDialogOpen: false,
      }));
    });
    expect(result.current.editDialogOpen).toBe(false);

    // Toggle delete dialog
    act(() => {
      result.current.setState((prev) => ({
        ...prev,
        deleteDialogOpen: true,
      }));
    });
    expect(result.current.deleteDialogOpen).toBe(true);

    act(() => {
      result.current.setState((prev) => ({
        ...prev,
        deleteDialogOpen: false,
      }));
    });
    expect(result.current.deleteDialogOpen).toBe(false);
  });
});
