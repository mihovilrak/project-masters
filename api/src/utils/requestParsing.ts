/** Parse a request value into a positive integer, or null if invalid. */
export function parsePositiveInteger(value: unknown): number | null {
  if (
    (typeof value !== 'string' && typeof value !== 'number') ||
    !/^\d+$/.test(String(value))
  ) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Parse a query param into a single number or array of numbers (comma-separated).
 * Returns null if value is missing, invalid, or parses to empty (so caller should not set the filter).
 */
export function parseIdParam(
  value: string | string[] | undefined,
): number | number[] | null {
  if (value === undefined || value === null) return null;
  const str = Array.isArray(value) ? value.join(',') : String(value).trim();
  if (str === '') return null;
  if (str.includes(',')) {
    const arr = str
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n));
    return arr.length > 0 ? arr : null;
  }
  const num = Number(str);
  return Number.isNaN(num) ? null : num;
}

/** Convert date from request (Date or ISO string) to timestamp; null/undefined → NaN. */
export function toTimestamp(d: Date | string | null | undefined): number {
  if (d == null) return NaN;
  return d instanceof Date ? d.getTime() : new Date(d).getTime();
}
