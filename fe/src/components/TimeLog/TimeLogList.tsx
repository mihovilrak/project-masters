import React from 'react';
import {
  Link,
  IconButton,
  Box,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { TimeLogListProps } from '../../types/timeLog';
import PermissionButton from '../common/PermissionButton';
import { formatDate } from '../../utils/dateUtils';
import { formatHoursClock } from '../../utils/timeUtils';

const TimeLogList: React.FC<TimeLogListProps> = ({
  timeLogs,
  onEdit,
  onDelete,
}) => {
  if (!timeLogs || timeLogs.length === 0) {
    return (
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ textAlign: 'center', mt: 2 }}
      >
        No time logs found
      </Typography>
    );
  }

  return (
    <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.75, px: 1 } }}>
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
          <TableCell sx={{ fontWeight: 600 }}>Time</TableCell>
          <TableCell sx={{ fontWeight: 600 }}>Activity type</TableCell>
          <TableCell sx={{ fontWeight: 600 }}>Task</TableCell>
          <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
          <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
          <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
          {(onEdit || onDelete) && (
            <TableCell sx={{ fontWeight: 600 }} align="right">
              Actions
            </TableCell>
          )}
        </TableRow>
      </TableHead>
      <TableBody>
        {timeLogs.map((log) => {
          if (!log?.id) return null;
          return (
            <TableRow
              key={log.id}
              sx={{
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                },
              }}
            >
              <TableCell sx={{ whiteSpace: 'nowrap' }}>#{log.id}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                {formatHoursClock(log?.spent_time || 0)} h
              </TableCell>
              <TableCell>
                <Chip
                  label={log?.activity_type_name || 'Unknown'}
                  size="small"
                  sx={{
                    backgroundColor: log?.activity_type_color || '#666',
                    color: 'white',
                  }}
                />
              </TableCell>
              <TableCell>
                {log?.task_id ? (
                  <Link component={RouterLink} to={`/tasks/${log.task_id}`}>
                    {log?.task_name || 'Unknown Task'}
                  </Link>
                ) : (
                  <span>{log?.task_name || 'Unknown Task'}</span>
                )}
              </TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                {log?.log_date ? formatDate(log.log_date) : '—'}
              </TableCell>
              <TableCell>
                {log?.user_id ? (
                  <Link component={RouterLink} to={`/users/${log.user_id}`}>
                    {log?.user || 'Unknown User'}
                  </Link>
                ) : (
                  <span>{log?.user || 'Unknown User'}</span>
                )}
              </TableCell>
              <TableCell sx={{ maxWidth: 180 }} title={log?.description || ''}>
                <Typography variant="body2" noWrap>
                  {log?.description || '—'}
                </Typography>
              </TableCell>
              {(onEdit || onDelete) && (
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <Box component="span" sx={{ display: 'inline-flex', gap: 0 }}>
                    {onEdit && (
                      <PermissionButton
                        requiredPermission="Edit log"
                        component={IconButton}
                        onClick={() => log && onEdit(log)}
                        tooltipText="Edit time log"
                        size="small"
                        sx={{ p: 0.25 }}
                        disabled={!log}
                      >
                        <EditIcon fontSize="small" />
                      </PermissionButton>
                    )}
                    {onDelete && (
                      <PermissionButton
                        requiredPermission="Delete log"
                        component={IconButton}
                        onClick={() => log?.id && onDelete(log.id)}
                        tooltipText="Delete time log"
                        size="small"
                        color="error"
                        sx={{ p: 0.25 }}
                        disabled={!log?.id}
                      >
                        <DeleteIcon fontSize="small" />
                      </PermissionButton>
                    )}
                  </Box>
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default TimeLogList;
