export interface Pagination {
  limit: number;
  offset: number;
}

// Every list endpoint is capped, so an unfiltered call can never stream an
// entire table into memory. Clients page with ?limit=&offset=; leaving them off
// keeps the previous "give me everything" behaviour up to the cap.
export const MAX_PAGE_SIZE = 500;
export const DEFAULT_PAGE_SIZE = MAX_PAGE_SIZE;

const toInteger = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const raw = Array.isArray(value) ? value[0] : value;
  const num = Number(raw);
  return Number.isInteger(num) ? num : null;
};

export const parsePagination = (
  query: unknown,
  defaultLimit: number = DEFAULT_PAGE_SIZE,
): Pagination => {
  const source = (query ?? {}) as Record<string, unknown>;

  const parsedLimit = toInteger(source.limit);
  const parsedOffset = toInteger(source.offset);

  const limit =
    parsedLimit === null || parsedLimit < 1
      ? Math.min(defaultLimit, MAX_PAGE_SIZE)
      : Math.min(parsedLimit, MAX_PAGE_SIZE);

  return {
    limit,
    offset: parsedOffset === null || parsedOffset < 0 ? 0 : parsedOffset,
  };
};

export const defaultPagination = (): Pagination => ({
  limit: DEFAULT_PAGE_SIZE,
  offset: 0,
});

/** LIMIT/OFFSET placeholders numbered from `startIndex` ($1-based). */
export const paginationClause = (
  pagination: Pagination,
  startIndex: number,
): { clause: string; values: number[] } => ({
  clause: `LIMIT $${startIndex} OFFSET $${startIndex + 1}`,
  values: [pagination.limit, pagination.offset],
});
