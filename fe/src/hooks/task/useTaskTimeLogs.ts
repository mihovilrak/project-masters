import { useAuth } from '../../context/AuthContext';
import { useAsyncResource } from '../common/useAsyncResource';
import { TimeLog, TimeLogCreate } from '../../types/timeLog';
import {
  getTaskTimeLogs,
  deleteTimeLog as deleteTimeLogApi,
  createTimeLog,
  updateTimeLog,
} from '../../api/timeLogs';
import logger from '../../utils/logger';
import getApiErrorMessage from '../../utils/getApiErrorMessage';

const EMPTY_TIME_LOGS: TimeLog[] = [];

export const useTaskTimeLogs = (taskId: string) => {
  const { currentUser } = useAuth();
  const { data: timeLogs, refetch: fetchTimeLogs } = useAsyncResource<
    TimeLog[]
  >(
    async (signal) => (await getTaskTimeLogs(Number(taskId), signal)) || [],
    [taskId],
    {
      initialData: EMPTY_TIME_LOGS,
      enabled: Boolean(taskId),
      errorMessage: 'Failed to fetch time logs',
    },
  );

  const handleTimeLogSubmit = async (
    timeLogData: TimeLogCreate,
    timeLogId?: number,
  ) => {
    try {
      if (!currentUser?.id) {
        throw new Error('User not authenticated');
      }
      if (!taskId) {
        throw new Error('Task ID is required');
      }

      let result: TimeLog;
      if (timeLogId) {
        result = await updateTimeLog(timeLogId, timeLogData);
      } else {
        result = await createTimeLog(Number(taskId), timeLogData);
      }

      await fetchTimeLogs();
      return result;
    } catch (error: unknown) {
      logger.error('Failed to submit time log:', error);
      throw new Error(getApiErrorMessage(error, 'Failed to submit time log'));
    }
  };

  const deleteTimeLog = async (timeLogId: number): Promise<void> => {
    try {
      await deleteTimeLogApi(timeLogId);
      await fetchTimeLogs();
    } catch (error: unknown) {
      logger.error('Failed to delete time log:', error);
      throw new Error(getApiErrorMessage(error, 'Failed to delete time log'));
    }
  };

  return {
    timeLogs,
    handleTimeLogSubmit,
    deleteTimeLog,
    fetchTimeLogs,
  };
};
