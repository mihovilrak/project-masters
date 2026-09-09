import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FixedSizeList as List } from 'react-window';
import {
  getTasks,
  deleteTask,
  getTaskStatuses,
  getPriorities,
} from '../../api/tasks';
import logger from '../../utils/logger';
import { getProjects } from '../../api/projects';
import { getUsers } from '../../api/users';
import {
  Button,
  Typography,
  Box,
  CircularProgress,
  Select,
  MenuItem,
  SelectChangeEvent,
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridViewIcon from '@mui/icons-material/GridView';
import FilterPanel from '../common/FilterPanel';
import { usePermission } from '../../hooks/common/usePermission';
import DeleteConfirmDialog from '../common/DeleteConfirmDialog';
import { Task, TaskFilters } from '../../types/task';
import { FilterValues, FilterOption } from '../../types/filterPanel';
import { idFilterParam, parseIdFilter } from '../../utils/taskUtils';
import getApiErrorMessage from '../../utils/getApiErrorMessage';
import TaskCard from './TaskCard';

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterValues>({ status_id: 0 });
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [statuses, setStatuses] = useState<FilterOption[]>([]);
  const [priorities, setPriorities] = useState<FilterOption[]>([]);
  const [projects, setProjects] = useState<FilterOption[]>([]);
  const [users, setUsers] = useState<FilterOption[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const navigate = useNavigate();
  const { hasPermission: canEditTask } = usePermission('Edit tasks');
  const { hasPermission: canDeleteTask } = usePermission('Delete tasks');

  const fetchTasks = useCallback(
    async (currentFilters?: FilterValues): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        const f = currentFilters || {};
        const statusIdRaw = f.status_id;
        const statusIdStr = statusIdRaw != null ? String(statusIdRaw) : '';
        const statusId = statusIdStr !== '' ? Number(statusIdStr) : undefined;
        const hasFilters =
          currentFilters && Object.keys(currentFilters).length > 0;
        const params: TaskFilters = {};
        if (hasFilters && currentFilters) {
          if (statusId === -1) {
            params.inactive_statuses_only = 1;
          } else if (statusId === 0) {
            params.active_statuses_only = 1;
          } else if (statusIdStr.includes(',')) {
            params.status_id = statusIdStr;
          } else if (statusId !== undefined && !Number.isNaN(statusId)) {
            params.status_id = statusId;
          }
          const priorityParam = idFilterParam(f.priority_id);
          if (priorityParam !== undefined) params.priority_id = priorityParam;
          const assigneeParam = idFilterParam(f.assignee_id);
          if (assigneeParam !== undefined) params.assignee_id = assigneeParam;
          const holderParam = idFilterParam(f.holder_id);
          if (holderParam !== undefined) params.holder_id = holderParam;
          const projectParam = idFilterParam(f.project_id);
          if (projectParam !== undefined) params.project_id = projectParam;
          const createdByParam = idFilterParam(f.created_by);
          if (createdByParam !== undefined) params.created_by = createdByParam;
          if (f.id != null && f.id !== '') params.id = Number(f.id);
          if (f.parent_id != null && f.parent_id !== '')
            params.parent_id = Number(f.parent_id);
          if (f.due_date_from) params.due_date_from = String(f.due_date_from);
          if (f.due_date_to) params.due_date_to = String(f.due_date_to);
          if (f.start_date_from)
            params.start_date_from = String(f.start_date_from);
          if (f.start_date_to) params.start_date_to = String(f.start_date_to);
          if (f.created_from) params.created_from = String(f.created_from);
          if (f.created_to) params.created_to = String(f.created_to);
          if (f.estimated_time_min != null && f.estimated_time_min !== '')
            params.estimated_time_min = Number(f.estimated_time_min);
          if (f.estimated_time_max != null && f.estimated_time_max !== '')
            params.estimated_time_max = Number(f.estimated_time_max);
        }
        const taskList = await getTasks(hasFilters ? params : {});
        setTasks(taskList);
      } catch (error) {
        logger.error('Failed to fetch tasks', error);
        setError('Failed to load tasks. Please try again later.');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchTasks(filters);
    // Fetch filter options
    const fetchFilterOptions = async () => {
      try {
        const [statusesData, prioritiesData, projectsData, usersData] =
          await Promise.all([
            getTaskStatuses().catch(() => []),
            getPriorities().catch(() => []),
            getProjects().catch(() => []),
            getUsers().catch(() => []),
          ]);
        const activeInactive = [
          { id: 0, name: 'Active' },
          { id: -1, name: 'Inactive' },
          ...statusesData,
        ];
        setStatuses(activeInactive);
        setPriorities(prioritiesData);
        setProjects(projectsData);
        setUsers(
          (usersData || []).map(
            (u: { id: number; name?: string; login?: string }) => ({
              id: u.id,
              name: u.name
                ? `${u.name} (${u.login || u.id})`
                : String(u.login || u.id),
            }),
          ),
        );
      } catch (error) {
        logger.error('Failed to fetch filter options:', error);
      }
    };
    fetchFilterOptions();
  }, [fetchTasks, filters]);

  const handleDeleteClick = useCallback((task: Task): void => {
    setTaskToDelete(task);
    setDeleteError(null);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async (): Promise<void> => {
    if (!taskToDelete) return;

    try {
      setDeleting(true);
      setDeleteError(null);
      await deleteTask(taskToDelete.id);
      await fetchTasks();
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    } catch (error: unknown) {
      logger.error('Failed to delete task:', error);
      setDeleteError(
        getApiErrorMessage(error, 'Failed to delete task. Please try again.'),
      );
    } finally {
      setDeleting(false);
    }
  }, [taskToDelete, fetchTasks]);

  const handleDeleteCancel = useCallback((): void => {
    setDeleteDialogOpen(false);
    setTaskToDelete(null);
    setDeleteError(null);
  }, []);

  const handleFilterChange = useCallback((newFilters: FilterValues) => {
    setFilters(newFilters);
  }, []);

  const handleSortChange = useCallback(
    (event: SelectChangeEvent<'asc' | 'desc'>) => {
      setSortOrder(event.target.value as 'asc' | 'desc');
    },
    [],
  );

  const filterOptions = useMemo(
    () => ({
      search: true,
      showDateFilters: true,
      statuses,
      priorities,
      projects,
      users,
      holders: users,
      createdBy: users,
      due_date_from: true,
      due_date_to: true,
      start_date_from: true,
      start_date_to: true,
      created_from: true,
      created_to: true,
    }),
    [statuses, priorities, projects, users],
  );

  const filteredTasks = useMemo(() => {
    const list = tasks || [];

    return list
      .filter((task) => {
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          const matchesSearch =
            task?.name?.toLowerCase().includes(searchTerm) ||
            task?.description?.toLowerCase().includes(searchTerm) ||
            task?.project_name?.toLowerCase().includes(searchTerm);
          if (!matchesSearch) return false;
        }

        let statusIds = parseIdFilter(filters.status_id);
        // "Active" (id 0): API already returned only active tasks; don't filter by status_id client-side
        if (statusIds?.length && statusIds.every((id) => id === 0))
          statusIds = null;
        if (statusIds?.length && !statusIds.includes(task.status_id))
          return false;

        const priorityIds = parseIdFilter(filters.priority_id);
        if (priorityIds?.length && !priorityIds.includes(task.priority_id))
          return false;

        const projectIds = parseIdFilter(filters.project_id);
        if (projectIds?.length && !projectIds.includes(task.project_id ?? 0))
          return false;

        const assigneeIds = parseIdFilter(filters.assignee_id);
        if (
          assigneeIds?.length &&
          (task.assignee_id == null || !assigneeIds.includes(task.assignee_id))
        )
          return false;

        const holderIds = parseIdFilter(filters.holder_id);
        if (
          holderIds?.length &&
          (task.holder_id == null || !holderIds.includes(task.holder_id))
        )
          return false;

        return true;
      })
      .sort((a, b) => {
        // Handle cases where name might be undefined or null
        const nameA = a?.name || '';
        const nameB = b?.name || '';
        return sortOrder === 'asc'
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      });
  }, [tasks, filters, sortOrder]);

  // Flat list in pre-order (parent then all descendants) with depth for indent; shows all levels
  const tasksInPreOrder = useMemo(() => {
    const list = filteredTasks || [];
    const childrenByParentId = new Map<number, Task[]>();
    list.forEach((t) => {
      const pid = t?.parent_id ?? null;
      if (pid != null) {
        const arr = childrenByParentId.get(pid) ?? [];
        arr.push(t);
        childrenByParentId.set(pid, arr);
      }
    });
    const nameSort = (a: Task, b: Task) =>
      sortOrder === 'asc'
        ? (a?.name ?? '').localeCompare(b?.name ?? '')
        : (b?.name ?? '').localeCompare(a?.name ?? '');
    const result: Array<{ task: Task; depth: number }> = [];
    const visit = (task: Task, depth: number): void => {
      result.push({ task, depth });
      const children = (childrenByParentId.get(task?.id ?? 0) ?? []).sort(
        nameSort,
      );
      children.forEach((c) => visit(c, depth + 1));
    };
    const roots = list.filter((t) => t?.parent_id == null).sort(nameSort);
    roots.forEach((r) => visit(r, 0));
    return result;
  }, [filteredTasks, sortOrder]);

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Tasks
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Button
            type="button"
            variant="contained"
            color="primary"
            onClick={() => navigate('/tasks/new')}
          >
            Create New Task
          </Button>
          <Select
            value={sortOrder}
            onChange={handleSortChange}
            size="small"
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="asc">A-Z</MenuItem>
            <MenuItem value="desc">Z-A</MenuItem>
          </Select>
          <Tooltip
            title={
              viewMode === 'grid'
                ? 'Switch to list view'
                : 'Switch to grid view'
            }
          >
            <IconButton
              onClick={() =>
                setViewMode((m) => (m === 'grid' ? 'list' : 'grid'))
              }
              aria-label={viewMode === 'grid' ? 'List view' : 'Grid view'}
            >
              {viewMode === 'grid' ? <ViewListIcon /> : <GridViewIcon />}
            </IconButton>
          </Tooltip>
        </Box>

        <FilterPanel
          type="tasks"
          filters={filters}
          options={filterOptions}
          onFilterChange={handleFilterChange}
        />
      </Box>

      <Box sx={{ mt: 2, width: '100%', maxWidth: 1400 }}>
        {error ? (
          <Typography color="error" data-testid="task-error">
            {error}
          </Typography>
        ) : loading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="200px"
            data-testid="tasks-loading"
          >
            <CircularProgress />
          </Box>
        ) : tasksInPreOrder.length === 0 ? (
          <Typography>No tasks found.</Typography>
        ) : viewMode === 'grid' ? (
          <Grid container spacing={2}>
            {tasksInPreOrder.map(({ task, depth }) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={task?.id}>
                <TaskCard
                  task={task}
                  depth={depth}
                  variant="grid"
                  canEdit={canEditTask}
                  canDelete={canDeleteTask}
                  onEdit={(t) => navigate(`/tasks/${t?.id}/edit`)}
                  onDelete={handleDeleteClick}
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box sx={{ height: 600 }}>
            <List
              height={600}
              itemCount={tasksInPreOrder.length}
              itemSize={220}
              width="100%"
              itemData={tasksInPreOrder}
            >
              {({ index, style, data }) => {
                const { task, depth } = data[index];
                return (
                  <div style={style}>
                    <Box sx={{ py: 0.5, px: 0.5 }}>
                      <TaskCard
                        task={task}
                        depth={depth}
                        variant="list"
                        canEdit={canEditTask}
                        canDelete={canDeleteTask}
                        onEdit={(t) => navigate(`/tasks/${t?.id}/edit`)}
                        onDelete={handleDeleteClick}
                      />
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
        title="Delete Task"
        content={`Are you sure you want to delete task "${taskToDelete?.name}"? This action cannot be undone.`}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        loading={deleting}
        error={deleteError || undefined}
      />
    </Box>
  );
};

export default Tasks;
