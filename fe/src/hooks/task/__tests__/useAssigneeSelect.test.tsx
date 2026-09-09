import { renderHook, waitFor } from '@testing-library/react';
import { useAssigneeSelect } from '../useAssigneeSelect';
import { getProjectMembers } from '../../../api/projects';
import { ProjectMember } from '../../../types/project';
import logger from '../../../utils/logger';

// Mock API calls
jest.mock('../../../api/projects');

describe('useAssigneeSelect', () => {
  const mockProjectMembers: ProjectMember[] = [
    {
      user_id: 1,
      name: 'John',
      surname: 'Doe',
      project_id: 1,
      role: 'Admin',
      created_on: '2024-01-25T00:00:00Z',
    },
    {
      user_id: 2,
      name: 'Jane',
      surname: 'Smith',
      project_id: 1,
      role: 'Developer',
      created_on: '2024-01-25T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (getProjectMembers as jest.Mock).mockResolvedValue(mockProjectMembers);
  });

  it('should load project members when projectId is provided', async () => {
    const { result } = renderHook(() => useAssigneeSelect(1));

    await waitFor(() => {
      expect(getProjectMembers).toHaveBeenCalledWith(
        1,
        expect.any(AbortSignal),
      );
      expect(result.current.projectMembers).toEqual(mockProjectMembers);
    });
  });

  it('should not load project members when projectId is null', async () => {
    const { result } = renderHook(() => useAssigneeSelect(null));

    expect(getProjectMembers).not.toHaveBeenCalled();
    expect(result.current.projectMembers).toEqual([]);
  });

  it('should handle error when loading project members fails', async () => {
    const error = new Error('Failed to fetch project members');
    (getProjectMembers as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useAssigneeSelect(1));

    await waitFor(() => {
      expect(getProjectMembers).toHaveBeenCalledWith(
        1,
        expect.any(AbortSignal),
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to load project members',
        error,
      );
      expect(result.current.projectMembers).toEqual([]);
    });
  });

  it('should update project members when projectId changes', async () => {
    const { result, rerender } = renderHook(
      (props) => useAssigneeSelect(props),
      { initialProps: 1 },
    );

    await waitFor(() => {
      expect(result.current.projectMembers).toEqual(mockProjectMembers);
    });

    (getProjectMembers as jest.Mock).mockResolvedValue([mockProjectMembers[1]]);

    rerender(2);
    await waitFor(() => {
      expect(getProjectMembers).toHaveBeenCalledWith(
        2,
        expect.any(AbortSignal),
      );
      expect(result.current.projectMembers).toEqual([mockProjectMembers[1]]);
    });
  });
});
