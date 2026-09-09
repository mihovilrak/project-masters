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
  Tooltip,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { RolesTableProps } from '../../types/role';

const RolesTable: React.FC<RolesTableProps> = ({
  roles,
  onEdit,
  onDelete,
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
            <TableCell>Name</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Permissions</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {roles.map((role) => (
            <TableRow key={role.id}>
              <TableCell>{role.name}</TableCell>
              <TableCell>{role.description}</TableCell>
              <TableCell>
                <Tooltip
                  title={(role.permissions || [])
                    .map((p) => (typeof p === 'number' ? String(p) : p.name))
                    .join(', ')}
                >
                  <Chip
                    label={`${role.permissions?.length || 0} permissions`}
                    size="small"
                    variant="outlined"
                  />
                </Tooltip>
              </TableCell>
              <TableCell>
                <Chip
                  label={role.active ? 'Active' : 'Inactive'}
                  color={role.active ? 'success' : 'error'}
                  size="small"
                />
              </TableCell>
              <TableCell align="right">
                <IconButton
                  onClick={() => onEdit(role)}
                  size="small"
                  aria-label="Edit role"
                  disabled={!canManage}
                >
                  <EditIcon />
                </IconButton>
                {onDelete && (
                  <IconButton
                    onClick={() => onDelete(role.id)}
                    size="small"
                    color="error"
                    aria-label="Delete role"
                    disabled={!canManage}
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default RolesTable;
