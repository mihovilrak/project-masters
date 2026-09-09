import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FixedSizeList as List } from 'react-window';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Select,
  MenuItem,
  SelectChangeEvent,
  Alert,
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridViewIcon from '@mui/icons-material/GridView';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  getUsers,
  deleteUser,
  getUserStatuses,
} from '../../api/users';
import { getRoles } from '../../api/roles';
import { usePermission } from '../../hooks/common/usePermission';
import { User } from '../../types/user';
import FilterPanel from '../common/FilterPanel';
import { FilterValues } from '../../types/filterPanel';
import DeleteConfirmDialog from '../common/DeleteConfirmDialog';
import logger from '../../utils/logger';
import getApiErrorMessage from '../../utils/getApiErrorMessage';
import { UserStatusId } from '../../constants/statusIds';

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [statuses, setStatuses] = useState<{ id: number; name: string }[]>([]);
  const [roles, setRoles] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterValues>({
    status_id: UserStatusId.Active,
  });
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const navigate = useNavigate();
  const { hasPermission: canEditUser } = usePermission('Edit users');
  const { hasPermission: canDeleteUser } = usePermission('Delete users');

  const fetchUsers = useCallback(async (currentFilters?: FilterValues) => {
    try {
      setLoading(true);
      setError(null);

      const whereParams: Record<string, number> = {};
      const statusNum =
        currentFilters?.status_id != null && currentFilters?.status_id !== ''
          ? Number(currentFilters.status_id)
          : NaN;
      if (!Number.isNaN(statusNum)) whereParams.status_id = statusNum;
      const roleNum =
        currentFilters?.role_id != null && currentFilters?.role_id !== ''
          ? Number(currentFilters.role_id)
          : NaN;
      if (!Number.isNaN(roleNum)) whereParams.role_id = roleNum;
      const includeAll =
        currentFilters?.status_id == null || currentFilters?.status_id === '';
      const userList = await getUsers(
        Object.keys(whereParams).length ? whereParams : undefined,
        includeAll ? { all: true } : undefined,
      );
      setUsers(userList || []);
    } catch (error: unknown) {
      logger.error('Failed to fetch users', error);
      setError(getApiErrorMessage(error, 'Failed to load users'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(filters);
  }, [fetchUsers, filters]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [statusesData, rolesData] = await Promise.all([
          getUserStatuses().catch(() => []),
          getRoles().catch(() => []),
        ]);
        setStatuses(statusesData);
        setRoles(rolesData);
      } catch {
        setStatuses([]);
        setRoles([]);
      }
    };
    loadOptions();
  }, []);

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteError(null);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      setDeleteError(null);
      await deleteUser(userToDelete.id);
      // Refresh users list from API to ensure consistency
      await fetchUsers(filters);
      // Dispatch custom event to notify other components (e.g., UserManager in Settings)
      window.dispatchEvent(
        new CustomEvent('userDeleted', { detail: { userId: userToDelete.id } }),
      );
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error: unknown) {
      logger.error('Failed to delete user', error);
      setDeleteError(
        getApiErrorMessage(error, 'Failed to delete user. Please try again.'),
      );
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
    setDeleteError(null);
  };

  const handleFilterChange = (newFilters: FilterValues) => {
    setFilters(newFilters);
  };

  const handleSortChange = (event: SelectChangeEvent<'asc' | 'desc'>) => {
    setSortOrder(event.target.value as 'asc' | 'desc');
  };

  const filterOptions = useMemo(
    () => ({
      search: true,
      statuses: statuses.map((s) => ({ id: s.id, name: s.name })),
      roles: roles.map((r) => ({ id: r.id, name: r.name })),
    }),
    [statuses, roles],
  );

  const filteredUsers = users
    .filter((user) => {
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        return (
          user?.name?.toLowerCase().includes(searchTerm) ||
          user?.surname?.toLowerCase().includes(searchTerm) ||
          user?.email?.toLowerCase().includes(searchTerm)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const nameA = `${a?.name || ''} ${a?.surname || ''}`.trim();
      const nameB = `${b?.name || ''} ${b?.surname || ''}`.trim();
      return sortOrder === 'asc'
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    });

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        User Management
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/users/new')}
          data-testid="add-user-btn"
        >
          Add New User
        </Button>
        <Select
          value={sortOrder}
          onChange={handleSortChange}
          size="small"
          sx={{ minWidth: 100, ml: 2 }}
          inputProps={{ 'data-testid': 'sort-select' }}
        >
          <MenuItem value="asc">A-Z</MenuItem>
          <MenuItem value="desc">Z-A</MenuItem>
        </Select>
        <Tooltip
          title={
            viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'
          }
        >
          <IconButton
            onClick={() => setViewMode((m) => (m === 'grid' ? 'list' : 'grid'))}
            aria-label={viewMode === 'grid' ? 'List view' : 'Grid view'}
          >
            {viewMode === 'grid' ? <ViewListIcon /> : <GridViewIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      <FilterPanel
        type="users"
        filters={filters}
        options={filterOptions}
        onFilterChange={handleFilterChange}
      />

      <Box marginTop={2} sx={{ width: '100%', maxWidth: 1400 }}>
        {error ? (
          <Alert severity="error" data-testid="users-error">
            {error}
          </Alert>
        ) : loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : filteredUsers.length === 0 ? (
          <Typography>No users found.</Typography>
        ) : viewMode === 'grid' ? (
          <Grid container spacing={2}>
            {filteredUsers.map((user) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={user?.id}>
                <Card data-testid={`user-card-${user?.id}`}>
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 0.5,
                        mb: 0.5,
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        #{user?.id}
                      </Typography>
                      <Typography
                        component={Link}
                        to={`/users/${user?.id}`}
                        variant="h6"
                        sx={{
                          textDecoration: 'none',
                          color: 'inherit',
                          '&:hover': { textDecoration: 'underline' },
                          flex: '1 1 auto',
                        }}
                      >
                        {user?.name || ''} {user?.surname || ''}
                      </Typography>
                      {(canEditUser || canDeleteUser) && (
                        <Box sx={{ display: 'flex', gap: 0 }}>
                          {canEditUser && (
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() =>
                                  navigate(`/users/${user?.id}/edit`)
                                }
                                aria-label="Edit user"
                                data-testid="edit-user-btn"
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {canDeleteUser && (
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteClick(user)}
                                aria-label="Delete user"
                                data-testid={`delete-user-${user?.id}`}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      )}
                    </Box>
                    {user?.status_name && (
                      <Chip
                        label={user.status_name}
                        size="small"
                        sx={{
                          mb: 0.5,
                          ...(user?.status_color
                            ? {
                                backgroundColor: user.status_color,
                                color: 'white',
                              }
                            : {}),
                        }}
                      />
                    )}
                    <Typography variant="body2">
                      Email: {user?.email || 'No email'}
                    </Typography>
                    <Typography variant="body2">
                      Role: {user?.role_name || 'No Role'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box sx={{ height: 600 }}>
            <List
              height={600}
              itemCount={filteredUsers.length}
              itemSize={200}
              width="100%"
              itemData={filteredUsers}
            >
              {({ index, style, data }) => {
                const user = data[index];
                return (
                  <div style={style}>
                    <Box sx={{ py: 1, px: 0.5 }}>
                      <Card data-testid={`user-card-${user?.id}`}>
                        <CardContent>
                          <Box
                            sx={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              alignItems: 'center',
                              gap: 0.5,
                              mb: 0.5,
                            }}
                          >
                            <Typography variant="body2" color="text.secondary">
                              #{user?.id}
                            </Typography>
                            <Typography
                              component={Link}
                              to={`/users/${user?.id}`}
                              variant="h6"
                              sx={{
                                textDecoration: 'none',
                                color: 'inherit',
                                '&:hover': { textDecoration: 'underline' },
                                flex: '1 1 auto',
                              }}
                            >
                              {user?.name || ''} {user?.surname || ''}
                            </Typography>
                            {(canEditUser || canDeleteUser) && (
                              <Box sx={{ display: 'flex', gap: 0 }}>
                                {canEditUser && (
                                  <Tooltip title="Edit">
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        navigate(`/users/${user?.id}/edit`)
                                      }
                                      aria-label="Edit user"
                                      data-testid="edit-user-btn"
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                {canDeleteUser && (
                                  <Tooltip title="Delete">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleDeleteClick(user)}
                                      aria-label="Delete user"
                                      data-testid={`delete-user-${user?.id}`}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Box>
                            )}
                          </Box>
                          {user?.status_name && (
                            <Chip
                              label={user.status_name}
                              size="small"
                              sx={{
                                mb: 0.5,
                                ...(user?.status_color
                                  ? {
                                      backgroundColor: user.status_color,
                                      color: 'white',
                                    }
                                  : {}),
                              }}
                            />
                          )}
                          <Typography variant="body2">
                            Email: {user?.email || 'No email'}
                          </Typography>
                          <Typography variant="body2">
                            Role: {user?.role_name || 'No Role'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Box>
                  </div>
                );
              }}
            </List>
          </Box>
        )}
      </Box>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        title="Delete User"
        content={`Are you sure you want to delete user ${userToDelete?.name} ${userToDelete?.surname}? This action cannot be undone.`}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />
      {deleteError && deleteDialogOpen && (
        <Alert
          severity="error"
          sx={{ position: 'fixed', top: 16, right: 16, zIndex: 9999 }}
        >
          {deleteError}
        </Alert>
      )}
    </Box>
  );
};

export default Users;
