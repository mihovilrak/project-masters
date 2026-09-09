import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { TimeLogStatsProps } from '../../types/timeLog';
import { formatHoursDuration, toHours } from '../../utils/timeUtils';

const TimeLogStats: React.FC<TimeLogStatsProps> = ({ timeLogs }) => {
  const totalHours = (timeLogs || []).reduce((sum, log) => {
    if (!log) return sum;
    return sum + toHours(log.spent_time);
  }, 0);

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="subtitle1">Total Time Spent:</Typography>
        <Typography variant="h6">
          {formatHoursDuration(totalHours)}
        </Typography>
      </Box>
    </Paper>
  );
};

export default TimeLogStats;
