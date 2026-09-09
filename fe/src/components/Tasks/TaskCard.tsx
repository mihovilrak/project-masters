import React from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  LinearProgress,
  Tooltip,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Task } from '../../types/task';
import {
  chipPropsForPriority,
  chipPropsForStatus,
} from '../../utils/taskUtils';
import { formatDate } from '../../utils/dateUtils';

export interface TaskCardProps {
  task: Task;
  depth: number;
  variant: 'grid' | 'list';
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

type MetaKey = 'holder' | 'assignee' | 'start' | 'due' | 'project';

const GRID_ORDER: MetaKey[] = ['holder', 'start', 'project', 'assignee', 'due'];
const LIST_ORDER: MetaKey[] = ['holder', 'assignee', 'start', 'due', 'project'];

const metaFields = (task: Task): Record<MetaKey, React.ReactNode> => ({
  holder: (
    <>
      <strong>Holder</strong>{' '}
      {task?.holder_id ? (
        <Link to={`/users/${task.holder_id}`}>
          {task?.holder_name || 'User'}
        </Link>
      ) : (
        '—'
      )}
    </>
  ),
  assignee: (
    <>
      <strong>Assignee</strong>{' '}
      {task?.assignee_id ? (
        <Link to={`/users/${task.assignee_id}`}>
          {task?.assignee_name || 'User'}
        </Link>
      ) : (
        'Unassigned'
      )}
    </>
  ),
  start: (
    <>
      <strong>Start</strong>{' '}
      {task?.start_date ? formatDate(task.start_date) : '—'}
    </>
  ),
  due: (
    <>
      <strong>Due</strong> {task?.due_date ? formatDate(task.due_date) : '—'}
    </>
  ),
  project: (
    <>
      <strong>Project</strong>{' '}
      {task?.project_id ? (
        <Link to={`/projects/${task.project_id}`}>
          {task?.project_name || 'Project'}
        </Link>
      ) : (
        'No Project'
      )}
    </>
  ),
});

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  depth,
  variant,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}) => {
  const meta = metaFields(task);

  return (
    <Card>
      <CardContent
        sx={{ py: 1.5, '&:last-child': { pb: 1.5 }, pl: 1 + depth * 2 }}
      >
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
            #{task?.id}
          </Typography>
          <Typography
            component={Link}
            to={`/tasks/${task?.id}`}
            variant="h6"
            sx={{
              fontWeight: 600,
              textDecoration: 'none',
              color: 'inherit',
              '&:hover': { textDecoration: 'underline' },
              flex: '1 1 auto',
            }}
          >
            {task?.name || 'Unnamed Task'}
          </Typography>
          {(canEdit || canDelete) && (
            <Box sx={{ display: 'flex', gap: 0 }}>
              {canEdit && (
                <Tooltip title="Edit">
                  <IconButton
                    size="small"
                    onClick={() => onEdit(task)}
                    aria-label="Edit task"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {canDelete && (
                <Tooltip title="Delete">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => onDelete(task)}
                    aria-label="Delete task"
                    data-testid="delete-task-icon"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )}
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
          <Chip
            label={task?.status_name || 'Unknown'}
            size="small"
            data-testid="status-chip"
            {...chipPropsForStatus(task?.status_name, task?.status_color)}
          />
          <Chip
            label={task?.priority_name || 'Unknown'}
            size="small"
            data-testid="priority-chip"
            {...chipPropsForPriority(task?.priority_name, task?.priority_color)}
          />
        </Box>
        <Box sx={{ mt: 0.5, fontSize: '0.875rem' }}>
          {variant === 'grid' ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '2px 16px',
                alignItems: 'start',
              }}
            >
              {GRID_ORDER.map((key) => (
                <Box key={key}>{meta[key]}</Box>
              ))}
              <Box />
            </Box>
          ) : (
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1.5,
                alignItems: 'center',
              }}
            >
              {LIST_ORDER.map((key) => (
                <span key={key}>{meta[key]}</span>
              ))}
            </Box>
          )}
          <Box sx={{ mt: 0.5 }}>
            <Typography variant="caption">
              <strong>Progress</strong>
            </Typography>
            <LinearProgress
              variant="determinate"
              value={task?.progress ?? 0}
              sx={{ mt: 0.25, height: 6, borderRadius: 1 }}
            />
            <Typography variant="caption">{task?.progress ?? 0}%</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TaskCard;
