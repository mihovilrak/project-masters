import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { CalendarViewProps } from '../../types/calendar';
import { useCalendarWeek } from '../../hooks/calendar/useCalendarWeek';
import dayjs from 'dayjs'; // Import dayjs library
import { formatHoursClock } from '../../utils/timeUtils';
import CalendarTaskChip from './CalendarTaskChip';

const CalendarWeekView: React.FC<CalendarViewProps> = ({
  date,
  tasks,
  timeLogs,
  onDateChange,
  onViewChange,
  onTaskClick,
  onTimeLogClick,
}) => {
  const navigate = useNavigate();
  const { getWeekDays, getTasksForDay, getTimeLogsForDay } = useCalendarWeek(
    date,
    tasks,
    timeLogs,
  );
  const days = getWeekDays();

  return (
    <Grid container spacing={2} data-testid="week-grid">
      {days.map((day, index) => (
        <Grid size={{ xs: 12 }} key={index}>
          <Paper
            role="presentation"
            sx={{
              p: 2,
              backgroundColor:
                day.toDateString() === new Date().toDateString()
                  ? 'action.hover'
                  : 'background.paper',
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{ mb: 2, fontWeight: 'medium' }}
              onClick={() => {
                onDateChange(day);
                onViewChange('day');
              }}
              style={{ cursor: 'pointer' }}
            >
              {day.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Typography>
            {getTasksForDay(day).map((task) => (
              <CalendarTaskChip
                key={task.id}
                task={task}
                onClick={onTaskClick}
                prefix={
                  task.start_date
                    ? dayjs(task.start_date).format('HH:mm')
                    : 'No time'
                }
                footer={
                  task.due_date
                    ? dayjs(task.due_date).format('HH:mm')
                    : 'No due date'
                }
              />
            ))}
            {getTimeLogsForDay(day).map((timeLog) => (
              <Paper
                key={timeLog?.id}
                sx={{
                  p: 1,
                  mb: 1,
                  cursor: 'pointer',
                  backgroundColor:
                    timeLog?.activity_type_color || 'background.paper',
                  '&:hover': { opacity: 0.9 },
                }}
                onClick={() => timeLog?.id && onTimeLogClick(timeLog.id)}
              >
                <Typography variant="subtitle2">
                  {timeLog?.created_on
                    ? new Date(timeLog.created_on).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Unknown'}{' '}
                  - {timeLog?.task_name || 'Unknown Task'} (
                  {timeLog?.spent_time
                    ? formatHoursClock(timeLog.spent_time)
                    : '0'}{' '}
                  hours)
                </Typography>
              </Paper>
            ))}
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};

export default CalendarWeekView;
