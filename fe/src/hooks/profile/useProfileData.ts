import { useState, useMemo } from 'react';
import {
  getProfile,
  getRecentTasks,
  getRecentProjects,
  updateProfile,
} from '../../api/profiles';
import { Task } from '../../types/task';
import { Project } from '../../types/project';
import {
  ProfileStats,
  ProfileUpdateData,
  ProfileData,
} from '../../types/profile';
import { useNavigate } from 'react-router-dom';
import { useAsyncResource } from '../common/useAsyncResource';
import logger from '../../utils/logger';

const DEFAULT_STATS: ProfileStats = {
  totalTasks: 0,
  completedTasks: 0,
  activeProjects: 0,
  totalHours: 0,
};

interface ProfileBundle {
  profile: ProfileData | null;
  recentTasks: Task[];
  recentProjects: Project[];
}

const EMPTY_BUNDLE: ProfileBundle = {
  profile: null,
  recentTasks: [],
  recentProjects: [],
};

const toStats = (profile: ProfileData | null): ProfileStats =>
  profile
    ? {
        totalTasks: profile.total_tasks ?? 0,
        completedTasks: profile.completed_tasks ?? 0,
        activeProjects: profile.active_projects ?? 0,
        totalHours: profile.total_hours ?? 0,
      }
    : DEFAULT_STATS;

export const useProfileData = () => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const navigate = useNavigate();

  const {
    data: { profile, recentTasks, recentProjects },
    loading,
    error,
    refetch: fetchData,
  } = useAsyncResource<ProfileBundle>(
    async (signal) => {
      const profileData = await getProfile(signal);
      if (!profileData) {
        throw new Error('Profile data not found');
      }

      const [tasksData, projectsData] = await Promise.all([
        getRecentTasks(signal).catch((err) => {
          logger.error('Failed to fetch recent tasks:', err);
          return [];
        }),
        getRecentProjects(signal).catch((err) => {
          logger.error('Failed to fetch recent projects:', err);
          return [];
        }),
      ]);

      return {
        profile: profileData,
        recentTasks: tasksData || [],
        recentProjects: projectsData || [],
      };
    },
    [],
    { initialData: EMPTY_BUNDLE, errorMessage: 'Failed to load profile data' },
  );

  const stats = useMemo(() => toStats(profile), [profile]);

  const handleProfileUpdate = async (updatedProfile: ProfileUpdateData) => {
    try {
      await updateProfile(updatedProfile);
      await fetchData();
      setEditDialogOpen(false);
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (err) {
      logger.error('Failed to update profile:', err);
    }
  };

  const handleTaskClick = (taskId: number) => {
    navigate(`/tasks/${taskId}`);
  };

  const getTypedProfile = (): ProfileData | null => profile;

  const getProfileStats = (): ProfileStats => stats;

  return {
    profile,
    stats,
    recentTasks,
    recentProjects,
    loading,
    error,
    editDialogOpen,
    passwordDialogOpen,
    updateSuccess,
    setEditDialogOpen,
    setPasswordDialogOpen,
    setUpdateSuccess,
    handleProfileUpdate,
    handleTaskClick,
    getTypedProfile,
    getProfileStats,
    refreshData: fetchData,
  } as const;
};
