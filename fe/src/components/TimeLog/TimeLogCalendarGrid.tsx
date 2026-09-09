import React from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Chip,
  Tooltip,
  useTheme,
} from '@mui/material';
import { AccessTime } from '@mui/icons-material';
import dayjs from 'dayjs';
import { TimeLogCalendarGridProps } from '../../types/timeLog';

const TimeLogCalendarGrid: React.FC<TimeLogCalendarGridProps> = ({
  days,
  timeLogs,
  getTimeLogsForDate,
  getTotalHoursForDate,
  getDayColor,
  formatTime,
}) => {
  const theme = useTheme();

  return (
    <Grid container spacing={1}>
      {days.map((day) => {
        const totalHours = getTotalHoursForDate(day, timeLogs);
        const logs = getTimeLogsForDate(day, timeLogs);

        return (
          <Grid size={{ xs: 12 / 7 }} key={day.toString()} role="gridcell">
            <Tooltip
              title={
                <Box data-testid="timelog-tooltip">
                  <Typography variant="subtitle2">
                    {dayjs(day).format('MMMM D, YYYY')}
                  </Typography>
                  {(logs || []).map((log) => (
                    <Typography key={log?.id || Math.random()} variant="body2">
                      {log?.task_name || 'Unknown Task'}:{' '}
                      {formatTime(log?.spent_time || 0)}
                    </Typography>
                  ))}
                </Box>
              }
            >
              <Paper
                data-testid="timelog-day-paper"
                elevation={dayjs(day).isSame(dayjs(), 'day') ? 3 : 1}
                sx={{
                  p: 1,
                  height: '100px',
                  backgroundColor: getDayColor(totalHours),
                  border: dayjs(day).isSame(dayjs(), 'day')
                    ? `2px solid ${theme.palette.primary.main}`
                    : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                }}
              >
                <Typography variant="caption">
                  {dayjs(day).format('D')}
                </Typography>
                <Chip
                  size="small"
                  icon={<AccessTime />}
                  label={`${(typeof totalHours === 'number' && !isNaN(totalHours) ? totalHours : 0).toFixed(1)}h`}
                  sx={{
                    position: 'absolute',
                    bottom: 4,
                    right: 4,
                    backgroundColor: 'rgba(255,255,255,0.8)',
                  }}
                />
              </Paper>
            </Tooltip>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default TimeLogCalendarGrid;
