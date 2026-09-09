import { useCallback, useMemo, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { FormattedTask } from '../../types/project';
import { Task } from '../../types/task';
import { toLocalDate } from '../../utils/dateUtils';

export const useProjectGantt = (initialTasks: Task[]) => {
  const [error, setErrorState] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentViewName, setCurrentViewName] = useState('Month');
  const theme = useTheme();

  const tasks = useMemo<FormattedTask[]>(
    () =>
      (initialTasks || []).map((task) => ({
        id: task.id,
        title: task.name,
        startDate: toLocalDate(task.start_date) as Date,
        endDate: toLocalDate(task.due_date) as Date,
        assigneeId: task.assignee_id ?? null,
        type_name: task.type_name,
        priority: task.priority_name,
        status: task.status_name,
        description: task.description,
      })),
    [initialTasks],
  );

  const getStatusColor = useCallback(
    (status: string) => {
      const colors: Record<string, string> = {
        new: theme.palette.grey[500],
        'in progress': theme.palette.primary.main,
        done: theme.palette.success.main,
        cancelled: theme.palette.error.main,
        deleted: theme.palette.error.dark,
        unknown: theme.palette.grey[300],
      };
      return colors[status] || colors['unknown'];
    },
    [theme],
  );

  const getPriorityColor = useCallback(
    (priority: string) => {
      const colors: Record<string, string> = {
        'very high/must': theme.palette.error.main,
        'high/should': theme.palette.warning.main,
        'normal/could': theme.palette.info.main,
        'low/would': theme.palette.success.light,
        normal: theme.palette.grey[400],
      };
      return colors[priority] || colors['normal'];
    },
    [theme],
  );

  const setError = useCallback((errorMessage: string | null) => {
    setErrorState(errorMessage);
  }, []);

  const renderAppointment = useCallback(
    ({ children, style, data, draggable, resources, ...restProps }: any) => {
      const status = data.status?.toLowerCase() || 'unknown';
      const priority = data.priority?.toLowerCase() || 'normal';

      return {
        ...restProps,
        data,
        draggable,
        resources,
        style: {
          ...style,
          backgroundColor: getStatusColor(status),
          borderLeft: `4px solid ${getPriorityColor(priority)}`,
        },
        children,
      };
    },
    [getStatusColor, getPriorityColor],
  );

  const renderAppointmentContent = useCallback(
    ({ children, style, data, ...restProps }: any) => ({
      ...restProps,
      style,
      data,
      children: (
        <div style={{ height: '100%', padding: '4px' }}>
          <div
            style={{
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {data.title}
          </div>
          <div
            style={{
              color: 'rgba(0, 0, 0, 0.6)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {data.type_name}
          </div>
        </div>
      ),
    }),
    [],
  );

  const renderTooltipContent = useCallback(
    ({ appointmentData, ...restProps }: any) => ({
      ...restProps,
      appointmentData,
      children: (
        <div style={{ padding: '16px' }}>
          <div style={{ marginBottom: '8px', fontWeight: 500 }}>
            {appointmentData.title}
          </div>
          <div style={{ marginBottom: '16px', color: 'rgba(0, 0, 0, 0.6)' }}>
            {appointmentData.description}
          </div>
          <div>Status: {appointmentData.status}</div>
          <div>Priority: {appointmentData.priority}</div>
          <div>Type: {appointmentData.type_name}</div>
        </div>
      ),
    }),
    [],
  );

  return {
    tasks,
    loading: false,
    error: error,
    currentDate,
    currentViewName,
    setCurrentDate,
    setCurrentViewName,
    getStatusColor,
    getPriorityColor,
    setError,
    renderAppointment,
    renderAppointmentContent,
    renderTooltipContent,
  };
};
