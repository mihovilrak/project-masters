import { useAsyncResource } from '../common/useAsyncResource';
import { getProjectMembers } from '../../api/projects';
import { ProjectMember } from '../../types/project';

const EMPTY_MEMBERS: ProjectMember[] = [];

export const useAssigneeSelect = (projectId?: number | null) => {
  const { data: projectMembers, error } = useAsyncResource<ProjectMember[]>(
    (signal) => getProjectMembers(projectId as number, signal),
    [projectId],
    {
      initialData: EMPTY_MEMBERS,
      enabled: Boolean(projectId),
      errorMessage: 'Failed to load project members',
    },
  );

  return {
    projectMembers,
    error,
  };
};
