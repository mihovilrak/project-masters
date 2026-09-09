import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { CalendarViewProps } from '../../types/calendar';
import { useTasksByHour } from '../../hooks/calendar/useTasksByHour';
import CalendarTaskChip from './CalendarTaskChip';

const CalendarDayView: React.FC<CalendarViewProps> = ({
  tasks,
  timeLogs,
  onTaskClick,
  onTimeLogClick,
}) => {
  const { hours, getTasksForHour, getTimeLogsForHour } = useTasksByHour(
    tasks,
    timeLogs,
  );

  return (
    <Box
      sx={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}
      data-testid="day-view"
    >
      {hours.map((hour) => (
        <Paper
          key={hour}
          variant="outlined"
          sx={{
            p: 2,
            mb: 1,
            display: 'flex',
            minHeight: 80,
            backgroundColor:
              hour % 2 === 0 ? 'background.default' : 'background.paper',
          }}
        >
          <Typography
            variant="body2"
            sx={{
              width: 50,
              color: 'text.secondary',
              fontWeight: 'medium',
            }}
          >
            {hour.toString().padStart(2, '0')}:00
          </Typography>
          <Box sx={{ flex: 1 }}>
            {getTasksForHour(hour).map((task) => (
              <CalendarTaskChip
                key={task.id}
                task={task}
                onClick={onTaskClick}
              />
            ))}
            {getTimeLogsForHour(hour).map((timeLog) => (
              <Paper
                key={timeLog.id}
                sx={{
                  p: 1,
                  mb: 1,
                  cursor: 'pointer',
                  backgroundColor: timeLog.activity_type_color,
                  '&:hover': { opacity: 0.9 },
                }}
                onClick={() => onTimeLogClick(timeLog.id)}
              >
                <Typography variant="subtitle2">
                  {timeLog.task_name} - {timeLog.spent_time} minutes
                </Typography>
              </Paper>
            ))}
          </Box>
        </Paper>
      ))}
    </Box>
  );
};

export default CalendarDayView;
