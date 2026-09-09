import { useAsyncResource } from '../common/useAsyncResource';
import { getProjects, getProjectMembers } from '../../api/projects';
import { getProjectTasks } from '../../api/tasks';
import { Project, ProjectMember } from '../../types/project';
import { Task } from '../../types/task';
import logger from '../../utils/logger';
import getApiErrorMessage from '../../utils/getApiErrorMessage';

interface ProjectSelectData {
  members: ProjectMember[];
  tasks: Task[];
  error: string | null;
}

const EMPTY_PROJECTS: Project[] = [];
const EMPTY_SELECT_DATA: ProjectSelectData = {
  members: [],
  tasks: [],
  error: null,
};

export const useProjectSelect = (
  projectId?: number | null,
  taskId?: string | null,
) => {
  const { data: projects, error: projectsError } = useAsyncResource<Project[]>(
    (signal) => getProjects(undefined, signal),
    [],
    { initialData: EMPTY_PROJECTS, errorMessage: 'Failed to load projects' },
  );

  const { data: selectData } = useAsyncResource<ProjectSelectData>(
    async (signal) => {
      if (!projectId) return EMPTY_SELECT_DATA;

      // Members and tasks degrade independently: one failing must not blank the other
      const errors: string[] = [];
      const [members, tasks] = await Promise.all([
        getProjectMembers(projectId, signal).catch((err: unknown) => {
          logger.error('Failed to load project members', err);
          errors.push(
            getApiErrorMessage(err, 'Failed to load project members'),
          );
          return [] as ProjectMember[];
        }),
        getProjectTasks(projectId, {}, signal).catch((err: unknown) => {
          logger.error('Failed to load project tasks', err);
          errors.push(getApiErrorMessage(err, 'Failed to load project tasks'));
          return [] as Task[];
        }),
      ]);

      return {
        members,
        tasks: tasks.filter((task) => task.id !== Number(taskId)),
        error: errors[0] ?? null,
      };
    },
    [projectId, taskId],
    {
      initialData: EMPTY_SELECT_DATA,
      errorMessage: 'Failed to load project data',
    },
  );

  return {
    projects,
    projectMembers: selectData.members,
    projectTasks: selectData.tasks,
    selectError: projectsError ?? selectData.error,
  };
};
