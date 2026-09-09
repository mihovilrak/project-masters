import React from 'react';
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
  Icon,
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import { ActivityType, ActivityTypesTableProps } from '../../types/setting';

const ActivityTypesTable: React.FC<ActivityTypesTableProps> = ({
  activityTypes,
  onEdit,
  loading,
  canManage = true,
}) => {
  if (loading) {
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
            <TableCell>Icon</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Color</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {activityTypes.map((activityType: ActivityType) => (
            <TableRow key={activityType.id}>
              <TableCell>
                {activityType.icon && <Icon>{activityType.icon}</Icon>}
              </TableCell>
              <TableCell>{activityType.name}</TableCell>
              <TableCell>{activityType.description}</TableCell>
              <TableCell>
                <div
                  data-testid={`color-block-${activityType.name}`}
                  role="img"
                  aria-label={`Colour ${activityType.color}`}
                  style={{
                    backgroundColor: activityType.color,
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                  }}
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={activityType.active ? 'Active' : 'Inactive'}
                  color={activityType.active ? 'success' : 'error'}
                  size="small"
                />
              </TableCell>
              <TableCell align="right">
                <IconButton
                  onClick={() => onEdit(activityType)}
                  size="small"
                  aria-label="Edit activity type"
                  disabled={!canManage}
                >
                  <EditIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ActivityTypesTable;
