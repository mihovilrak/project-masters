const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

export interface UpdateAssignments {
  columns: string[];
  setClause: string;
  values: unknown[];
  nextIndex: number;
}

export const buildUpdateAssignments = (
  updates: Record<string, unknown> | undefined | null,
  allowedColumns: readonly string[],
  startIndex = 1,
): UpdateAssignments | null => {
  const columns: string[] = [];
  const values: unknown[] = [];

  for (const column of allowedColumns) {
    if (!IDENTIFIER.test(column)) {
      throw new Error(`Unsafe column name in whitelist: ${column}`);
    }
    if (!updates || !Object.prototype.hasOwnProperty.call(updates, column)) {
      continue;
    }
    const value = updates[column];
    if (value === undefined) continue;
    columns.push(column);
    values.push(value);
  }

  if (columns.length === 0) return null;

  return {
    columns,
    setClause: columns
      .map((column, index) => `${column} = $${index + startIndex}`)
      .join(', '),
    values,
    nextIndex: startIndex + columns.length,
  };
};
