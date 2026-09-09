export const getPriorityColor = (
  priority: string | undefined,
): 'error' | 'warning' | 'info' | 'success' | 'default' => {
  switch (priority?.toLowerCase()) {
    case 'very high/must':
      return 'error';
    case 'high/should':
      return 'warning';
    case 'normal/could':
      return 'info';
    case 'low/wont':
      return 'success';
    default:
      return 'default';
  }
};

export const getStatusColor = (
  status: string | undefined,
): 'error' | 'warning' | 'info' | 'success' | 'default' => {
  switch (status?.toLowerCase()) {
    case 'done':
      return 'success';
    case 'in progress':
      return 'info';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
};

/** Chip props for status: use hex when provided, else MUI color name */
export const chipPropsForStatus = (
  statusName?: string,
  statusColor?: string,
): {
  color?: 'error' | 'warning' | 'info' | 'success' | 'default';
  sx?: { backgroundColor: string; color: string };
} => {
  if (statusColor) {
    return { sx: { backgroundColor: statusColor, color: '#fff' } };
  }
  return { color: getStatusColor(statusName) };
};

/** Chip props for priority: use hex when provided, else MUI color name */
export const chipPropsForPriority = (
  priorityName?: string,
  priorityColor?: string,
): {
  color?: 'error' | 'warning' | 'info' | 'success' | 'default';
  sx?: { backgroundColor: string; color: string };
} => {
  if (priorityColor) {
    return { sx: { backgroundColor: priorityColor, color: '#fff' } };
  }
  return { color: getPriorityColor(priorityName || '') };
};

/** Comma-separated or single ID filter value -> list of IDs, or null when unset */
export const parseIdFilter = (
  value: number | string | null | undefined,
): number[] | null => {
  if (value == null || value === '') return null;
  const raw = String(value);
  if (raw.includes(',')) {
    return raw
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n));
  }
  return [Number(value)];
};

/** Same value shaped for the API query string: kept as CSV, otherwise numeric */
export const idFilterParam = (
  value: number | string | null | undefined,
): string | number | undefined => {
  if (value == null || value === '') return undefined;
  const raw = String(value);
  return raw.includes(',') ? raw : Number(value);
};
