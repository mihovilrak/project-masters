import { useAsyncResource } from '../common/useAsyncResource';
import { TaskWatcher } from '../../types/watcher';
import {
  getTaskWatchers,
  addTaskWatcher,
  removeTaskWatcher,
} from '../../api/watchers';
import logger from '../../utils/logger';
import getApiErrorMessage from '../../utils/getApiErrorMessage';

const EMPTY_WATCHERS: TaskWatcher[] = [];

export const useTaskWatchers = (taskId: string) => {
  const {
    data: watchers,
    setData: setWatchers,
    refetch: fetchWatchers,
  } = useAsyncResource<TaskWatcher[]>(
    async (signal) => (await getTaskWatchers(Number(taskId), signal)) || [],
    [taskId],
    {
      initialData: EMPTY_WATCHERS,
      enabled: Boolean(taskId),
      errorMessage: 'Failed to fetch watchers',
    },
  );

  const handleAddWatcher = async (userId: number) => {
    try {
      if (!taskId) throw new Error('Task ID is required');
      if (!userId) throw new Error('User ID is required');

      await addTaskWatcher(Number(taskId), userId);
      await fetchWatchers();
    } catch (error: unknown) {
      logger.error('Failed to add watcher:', error);
      throw new Error(getApiErrorMessage(error, 'Failed to add watcher'));
    }
  };

  const handleRemoveWatcher = async (userId: number) => {
    try {
      if (!taskId) throw new Error('Task ID is required');
      if (!userId) throw new Error('User ID is required');

      await removeTaskWatcher(Number(taskId), userId);
      await fetchWatchers();
    } catch (error: unknown) {
      logger.error('Failed to remove watcher:', error);
      throw new Error(getApiErrorMessage(error, 'Failed to remove watcher'));
    }
  };

  return {
    watchers,
    setWatchers,
    handleAddWatcher,
    handleRemoveWatcher,
    fetchWatchers,
  };
};
