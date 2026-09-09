import { useState, useEffect } from 'react';
import { Project } from '../../types/project';
import { Task } from '../../types/task';
import { User } from '../../types/user';
import { ActivityType, UseTimeLogDataProps } from '../../types/timeLog';
import { getProjects } from '../../api/projects';
import { getProjectTasks } from '../../api/tasks';
import { getUsers } from '../../api/users';
import { getActivityTypes } from '../../api/activityTypes';
import logger from '../../utils/logger';
import getApiErrorMessage from '../../utils/getApiErrorMessage';

export const useTimeLogData = ({
  open,
  projectId,
  hasAdminPermission,
}: UseTimeLogDataProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setIsLoading(false);
      return;
    }

    let active = true;
    const loadData = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const [activityTypesData, projectsData, usersData, projectTasks] =
          await Promise.all([
            getActivityTypes(),
            getProjects(),
            hasAdminPermission ? getUsers() : Promise.resolve([]),
            projectId ? getProjectTasks(projectId) : Promise.resolve([]),
          ]);
        if (!active) return;

        setActivityTypes(activityTypesData);
        setProjects(projectsData);
        setUsers(usersData);
        setTasks(projectTasks);
      } catch (err) {
        if (!active) return;
        logger.error('Error loading time log data:', err);
        setLoadError(getApiErrorMessage(err, 'Failed to load time log data'));
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, [open, projectId, hasAdminPermission]);

  const handleProjectSelect = async (projectId: number | null) => {
    if (projectId !== null) {
      setIsLoading(true);
      try {
        setLoadError(null);
        const projectTasks = await getProjectTasks(projectId);
        setTasks(projectTasks);
      } catch (err) {
        logger.error('Error loading tasks:', err);
        setLoadError(getApiErrorMessage(err, 'Failed to load tasks'));
      } finally {
        setIsLoading(false);
      }
    } else {
      setTasks([]);
    }
  };

  return {
    projects,
    tasks,
    users,
    activityTypes,
    isLoading,
    loadError,
    handleProjectSelect,
  };
};
