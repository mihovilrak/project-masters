export const toHours = (value: number | string | null | undefined): number => {
  const hours = typeof value === 'string' ? Number.parseFloat(value) : value;
  return typeof hours === 'number' && Number.isFinite(hours) ? hours : 0;
};

export const formatHoursClock = (
  value: number | string | null | undefined,
): string => {
  const hours = toHours(value);
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
};

export const formatHoursDuration = (
  value: number | string | null | undefined,
): string => {
  const hours = toHours(value);
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}h ${minutes}m`;
};
