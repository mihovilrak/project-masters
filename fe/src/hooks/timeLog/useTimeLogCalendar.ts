import { useState } from 'react';
import dayjs from 'dayjs';
import { TimeLog } from '../../types/timeLog';
import { useTheme } from '@mui/material';

export const useTimeLogCalendar = (initialTimeLogs: TimeLog[] = []) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const theme = useTheme();

  const navigateMonth = (direction: 'next' | 'prev') => {
    setCurrentDate((current) => {
      const base = dayjs(current);
      const shifted =
        direction === 'next' ? base.add(1, 'month') : base.subtract(1, 'month');
      return shifted.toDate();
    });
  };

  const getTimeLogsForDate = (date: Date, timeLogs: TimeLog[]): TimeLog[] => {
    return timeLogs.filter((log) => {
      const logDate = new Date(log.created_on!);
      return logDate.toDateString() === date.toDateString();
    });
  };

  const getTotalHoursForDate = (date: Date, timeLogs: TimeLog[]): number => {
    const logs = getTimeLogsForDate(date, timeLogs);
    return logs.reduce((total, log) => {
      const hours =
        typeof log.spent_time === 'string'
          ? parseFloat(log.spent_time)
          : log.spent_time;
      return total + hours;
    }, 0);
  };

  const getDayColor = (hours: number): string => {
    if (hours === 0) return theme.palette.background.paper;
    if (hours < 4) return theme.palette.info.light;
    if (hours < 8) return theme.palette.success.light;
    return theme.palette.warning.light;
  };

  const formatTime = (time: string | number): string => {
    const hours = typeof time === 'string' ? parseFloat(time) : time;
    if (isNaN(hours)) return '0h 0m';

    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };

  const getCalendarDays = () => {
    const month = dayjs(currentDate).startOf('month');
    return Array.from({ length: month.daysInMonth() }, (_, index) =>
      month.date(index + 1).toDate(),
    );
  };

  const getTotalMonthHours = (timeLogs: TimeLog[]): number => {
    return timeLogs.reduce((total, log) => {
      const hours =
        typeof log.spent_time === 'string'
          ? parseFloat(log.spent_time)
          : log.spent_time;
      return total + hours;
    }, 0);
  };

  return {
    currentDate,
    navigateMonth,
    getTimeLogsForDate,
    getTotalHoursForDate,
    getDayColor,
    formatTime,
    getCalendarDays,
    getTotalMonthHours,
  };
};
