import React from 'react';
import { Box, Chip, Paper, Typography } from '@mui/material';
import { Task } from '../../types/task';
import { getPriorityColor } from '../../utils/taskUtils';

interface CalendarTaskChipProps {
  task: Task;
  onClick: (taskId: number) => void;
  compact?: boolean;
  prefix?: string;
  footer?: string;
}

const CalendarTaskChip: React.FC<CalendarTaskChipProps> = ({
  task,
  onClick,
  compact = false,
  prefix,
  footer,
}) => {
  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onClick(task.id);
  };

  if (compact) {
    return (
      <Chip
        label={task.name || 'Unnamed Task'}
        size="small"
        onClick={handleClick}
        color={getPriorityColor(task.priority_name || '')}
        sx={{ mb: 0.5, width: '100%' }}
        data-testid={`task-chip-${task.id}`}
      />
    );
  }

  return (
    <Paper
      sx={{
        p: 1,
        mb: 1,
        cursor: 'pointer',
        '&:hover': { backgroundColor: 'action.hover' },
      }}
      onClick={handleClick}
      data-testid={`task-chip-${task.id}`}
    >
      <Typography variant="subtitle2">
        {prefix ? `${prefix} - ` : ''}
        {task.name || 'Unnamed Task'}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
        <Chip
          label={task.priority_name || 'Unknown'}
          size="small"
          color={getPriorityColor(task.priority_name || '')}
        />
        <Chip
          label={task.status_name || 'Unknown'}
          size="small"
          variant="outlined"
        />
      </Box>
      {footer && (
        <Typography variant="body2" color="text.secondary">
          {footer}
        </Typography>
      )}
    </Paper>
  );
};

export default CalendarTaskChip;
