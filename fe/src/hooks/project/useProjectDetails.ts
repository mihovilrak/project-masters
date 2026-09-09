import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Project, ProjectDetailsState } from '../../types/project';
import {
  getProjectById,
  getProjectDetails,
  updateProject,
  deleteProject,
} from '../../api/projects';
import { useProjectMembers } from './useProjectMembers';
import { useProjectTasks } from './useProjectTasks';
import { useProjectTimeLogs } from './useProjectTimeLogs';
import logger from '../../utils/logger';
import getApiErrorMessage from '../../utils/getApiErrorMessage';

export const useProjectDetails = (projectId: string) => {
  const [state, setState] = useState<ProjectDetailsState>({
    project: null,
    projectDetails: null,
    members: [],
    tasks: [],
    loading: true,
    error: null,
    editDialogOpen: false,
    deleteDialogOpen: false,
    createTaskDialogOpen: false,
    membersDialogOpen: false,
    timeLogs: [],
  });

  const navigate = useNavigate();
  const { currentUser, hasPermission } = useAuth();
  const memberHooks = useProjectMembers(projectId);
  const taskHooks = useProjectTasks(projectId);
  const timeLogHooks = useProjectTimeLogs(projectId);

  useEffect(() => {
    const controller = new AbortController();
    const fetchProjectData = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const [projectData, projectDetails] = await Promise.all([
          getProjectById(Number(projectId), controller.signal),
          getProjectDetails(Number(projectId), controller.signal),
        ]);

        // Check if project was found
        if (!projectData) {
          setState((prev) => ({
            ...prev,
            error: 'Project not found',
            loading: false,
          }));
          return;
        }

        // Ensure projectDetails has spent_time as a number (handle null/undefined)
        const safeProjectDetails = projectDetails
          ? {
              ...projectDetails,
              spent_time: projectDetails.spent_time ?? 0,
            }
          : null;

        setState((prev) => ({
          ...prev,
          project: projectData,
          projectDetails: safeProjectDetails,
          loading: false,
          error: null,
        }));

        // Load data from other hooks
        try {
          await Promise.all([
            memberHooks.loadMembers(),
            taskHooks.loadTasks(),
            timeLogHooks.loadTimeLogs(),
          ]);
        } catch (hookError) {
          // Log hook errors but don't fail the whole page
          logger.error('Error loading project sub-data:', hookError);
        }
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        logger.error('Error fetching project data:', error);
        setState((prev) => ({
          ...prev,
          error: getApiErrorMessage(error, 'Failed to load project details'),
          loading: false,
        }));
      }
    };

    if (projectId) {
      fetchProjectData();
    }
    return () => controller.abort();
  }, [projectId]);

  const handleProjectUpdate = useCallback(
    async (updatedProject: Project) => {
      try {
        await updateProject(Number(projectId), updatedProject);
        setState((prev) => ({
          ...prev,
          project: { ...prev.project!, ...updatedProject },
          editDialogOpen: false,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: 'Failed to update project',
        }));
      }
    },
    [projectId],
  );

  const handleProjectDelete = useCallback(async () => {
    try {
      await deleteProject(Number(projectId));
      navigate('/projects');
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: 'Failed to delete project',
      }));
    }
  }, [projectId, navigate]);

  const isProjectMember = useMemo(
    () =>
      memberHooks.members.some((member) => member.user_id === currentUser?.id),
    [memberHooks.members, currentUser?.id],
  );

  const canEdit = useMemo(
    () => hasPermission('Edit projects'),
    [hasPermission],
  );
  const canDelete = useMemo(
    () => hasPermission('Delete projects'),
    [hasPermission],
  );
  const canManageMembers = useMemo(
    () => hasPermission('Manage project members'),
    [hasPermission],
  );

  return {
    ...state,
    ...memberHooks,
    ...taskHooks,
    ...timeLogHooks,
    setState,
    handleProjectUpdate,
    handleProjectDelete,
    isProjectMember,
    canEdit,
    canDelete,
    canManageMembers,
  };
};
