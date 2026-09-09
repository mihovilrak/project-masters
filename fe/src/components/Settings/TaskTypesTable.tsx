import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Box,
  CircularProgress,
  Typography,
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import { TaskType, TaskTypesTableProps } from '../../types/setting';

const TaskTypesTable: React.FC<TaskTypesTableProps> = ({
  taskTypes: propTaskTypes,
  onEdit,
  loading: propLoading,
  canManage = true,
}) => {
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (propTaskTypes) {
      setTaskTypes(propTaskTypes);
      setLoading(false);
    }
  }, [propTaskTypes]);

  if (loading || propLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Color</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {taskTypes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center">
                <Typography variant="body2" color="text.secondary">
                  No task types found
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            taskTypes.map((type) => (
              <TableRow key={type?.id}>
                <TableCell>{type?.name || 'Unknown'}</TableCell>
                <TableCell>{type?.description || 'No description'}</TableCell>
                <TableCell>
                  <Box
                    data-testid={`color-box-${type?.id || 'unknown'}`}
                    role="img"
                    aria-label={`Colour ${type?.color || '#666'}`}
                    sx={{
                      width: 24,
                      height: 24,
                      backgroundColor: type?.color || '#666',
                      borderRadius: 1,
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={type?.active ? 'Active' : 'Inactive'}
                    color={type?.active ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    onClick={() => type && onEdit(type)}
                    size="small"
                    disabled={!type || !canManage}
                    aria-label="Edit task type"
                  >
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TaskTypesTable;
