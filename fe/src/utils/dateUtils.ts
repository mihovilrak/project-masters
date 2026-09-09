import dayjs from 'dayjs';

type DateInput = string | number | Date | null | undefined;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Calendar dates (`date` columns: due_date, start_date, end_date, log_date)
 * have no time and no zone. Building a Date from them and formatting it in the
 * browser's zone shifts the day, so the plain 'YYYY-MM-DD' form is formatted
 * from its parts instead.
 */
export const formatDate = (value: DateInput, fallback = '—'): string => {
  if (value == null || value === '') return fallback;

  if (typeof value === 'string') {
    const parts = DATE_ONLY.exec(value.slice(0, 10));
    if (parts && value.length <= 10) {
      const [, year, month, day] = parts;
      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
      ).toLocaleDateString();
    }
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleDateString();
};

/** Timestamps (`timestamptz`) are real instants and belong in the local zone. */
export const formatDateTime = (value: DateInput, fallback = '—'): string => {
  if (value == null || value === '') return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleString();
};

/**
 * Local-midnight Date for a 'YYYY-MM-DD' value, for callers that need a Date
 * object (date pickers and dayjs formatting). `new Date('2024-01-05')`
 * would parse as UTC midnight and format as the 4th west of Greenwich.
 */
export const toLocalDate = (value: DateInput): Date | null => {
  if (value == null || value === '') return null;

  if (typeof value === 'string') {
    const parts = DATE_ONLY.exec(value.slice(0, 10));
    if (parts && value.length <= 10) {
      const [, year, month, day] = parts;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * 'YYYY-MM-DD' from a Date's local calendar parts. `toISOString()` would
 * convert to UTC first and land on the neighbouring day either side of
 * Greenwich.
 */
export const toDateOnlyString = (value: DateInput): string => {
  const date = toLocalDate(value);
  if (!date) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

/** Dayjs formatting for a calendar date, without the UTC-parse day shift. */
export const formatDatePattern = (
  value: DateInput,
  pattern: string,
  fallback = '—',
): string => {
  const date = toLocalDate(value);
  return date ? dayjs(date).format(pattern) : fallback;
};
