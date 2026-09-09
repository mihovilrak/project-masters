import { useState } from 'react';
import { TimeLog, TimeLogCreate } from '../../types/timeLog';
import { ProjectTimeLogsHook } from '../../types/project';
import {
  getTaskTimeLogs,
  createTimeLog,
  updateTimeLog,
  deleteTimeLog,
} from '../../api/timeLogs';
import { getProjectTasks } from '../../api/tasks';
import logger from '../../utils/logger';
import getApiErrorMessage from '../../utils/getApiErrorMessage';

export const useProjectTimeLogs = (projectId: string): ProjectTimeLogsHook => {
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [timeLogDialogOpen, setTimeLogDialogOpen] = useState(false);
  const [selectedTimeLog, setSelectedTimeLog] = useState<TimeLog | null>(null);

  const loadTimeLogs = async () => {
    if (!projectId) return;
    try {
      const tasks = await getProjectTasks(Number(projectId));
      let allLogs: TimeLog[] = [];
      if (tasks && Array.isArray(tasks)) {
        const taskLogGroups = await Promise.all(
          tasks
            .filter((task) => task?.id)
            .map(async (task) => {
              try {
                const taskLogs = await getTaskTimeLogs(task.id);
                return taskLogs && Array.isArray(taskLogs) ? taskLogs : [];
              } catch (taskError) {
                logger.error(
                  `Failed to load time logs for task ${task.id}:`,
                  taskError,
                );
                return [];
              }
            }),
        );
        allLogs = taskLogGroups.flat();
      }
      setTimeLogs(allLogs);
    } catch (error: unknown) {
      logger.error('Failed to load time logs:', error);
      setTimeLogs([]);
      throw new Error(getApiErrorMessage(error, 'Failed to load time logs'));
    }
  };

  const handleTimeLogSubmit = async (timeLogData: TimeLogCreate) => {
    try {
      // Check if we're editing an existing time log
      if (selectedTimeLog && selectedTimeLog.id) {
        await updateTimeLog(selectedTimeLog.id, timeLogData);
      } else {
        if (!timeLogData.task_id) {
          throw new Error('Task ID is required');
        }
        await createTimeLog(timeLogData.task_id, timeLogData);
      }
      await loadTimeLogs();
      setTimeLogDialogOpen(false);
      setSelectedTimeLog(null);
    } catch (error: unknown) {
      logger.error('Failed to submit time log:', error);
      throw new Error(getApiErrorMessage(error, 'Failed to submit time log'));
    }
  };

  const handleTimeLogEdit = async (timeLog: TimeLog) => {
    setSelectedTimeLog(timeLog);
    setTimeLogDialogOpen(true);
  };

  const handleTimeLogDelete = async (timeLogId: number) => {
    try {
      await deleteTimeLog(timeLogId);
      await loadTimeLogs();
    } catch (error: unknown) {
      logger.error('Failed to delete time log:', error);
      throw new Error(getApiErrorMessage(error, 'Failed to delete time log'));
    }
  };

  return {
    timeLogs,
    setTimeLogs,
    timeLogDialogOpen,
    setTimeLogDialogOpen,
    selectedTimeLog,
    setSelectedTimeLog,
    handleTimeLogSubmit,
    handleTimeLogEdit,
    handleTimeLogDelete,
    loadTimeLogs,
  };
};
