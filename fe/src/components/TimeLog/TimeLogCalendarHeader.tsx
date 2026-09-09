import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import {
  CalendarMonth,
  NavigateBefore,
  NavigateNext,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { TimeLogCalendarHeaderProps } from '../../types/timeLog';

const TimeLogCalendarHeader: React.FC<TimeLogCalendarHeaderProps> = ({
  currentDate,
  totalHours,
  onNavigateMonth,
}) => {
  return (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center' }}>
          <CalendarMonth sx={{ mr: 1 }} />
          Time Log Calendar
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            onClick={() => onNavigateMonth('prev')}
            aria-label="Previous month"
          >
            <NavigateBefore />
          </IconButton>
          <Typography variant="h6" sx={{ mx: 2 }}>
            {currentDate
              ? dayjs(currentDate).format('MMMM YYYY')
              : 'Invalid Date'}
          </Typography>
          <IconButton
            onClick={() => onNavigateMonth('next')}
            aria-label="Next month"
          >
            <NavigateNext />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" color="textSecondary">
          Total hours this month:{' '}
          {typeof totalHours === 'number' && !isNaN(totalHours)
            ? totalHours % 1 === 0
              ? totalHours
              : totalHours.toFixed(1)
            : 0}
          h
        </Typography>
      </Box>
    </>
  );
};

export default TimeLogCalendarHeader;
