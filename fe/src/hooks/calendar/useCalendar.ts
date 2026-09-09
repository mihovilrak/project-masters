import { useState, useMemo } from 'react';
import { Task } from '../../types/task';
import { getTasksByDateRange } from '../../api/tasks';
import { TimeLog } from '../../types/timeLog';
import { CalendarView } from '../../types/calendar';
import { useNavigate } from 'react-router-dom';
import { useAsyncResource } from '../common/useAsyncResource';

const EMPTY_TASKS: Task[] = [];
const EMPTY_TIME_LOGS: TimeLog[] = [];

const getRange = (selectedDate: Date, view: CalendarView) => {
  const start = new Date(selectedDate);
  const end = new Date(selectedDate);

  if (view === 'month') {
    start.setDate(1);
    end.setMonth(end.getMonth() + 1, 0);
  } else if (view === 'week') {
    start.setDate(start.getDate() - start.getDay());
    end.setDate(end.getDate() + (6 - end.getDay()));
  }

  return { start, end };
};

export const useCalendar = () => {
  const [view, setView] = useState<CalendarView>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const navigate = useNavigate();

  const { start, end } = useMemo(
    () => getRange(selectedDate, view),
    [selectedDate, view],
  );

  const {
    data: tasks,
    loading,
    error,
  } = useAsyncResource<Task[]>(
    async (signal) => (await getTasksByDateRange(start, end, signal)) || [],
    [start, end],
    {
      initialData: EMPTY_TASKS,
      errorMessage: 'Failed to load calendar tasks',
    },
  );

  const handleDateChange = (newDate: Date): void => {
    setSelectedDate(newDate);
  };

  const handleViewChange = (newView: CalendarView): void => {
    setView(newView);
  };

  const handleTaskClick = (taskId: number): void => {
    navigate(`/tasks/${taskId}`);
  };

  const handleTimeLogClick = (timeLogId: number): void => {
    navigate(`/time-logs/${timeLogId}`);
  };

  return {
    tasks,
    loading,
    error,
    view,
    selectedDate,
    timeLogs: EMPTY_TIME_LOGS,
    handleDateChange,
    handleViewChange,
    handleTaskClick,
    handleTimeLogClick,
  };
};
