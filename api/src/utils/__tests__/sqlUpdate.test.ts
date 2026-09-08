import fs from 'fs';
import path from 'path';
import { buildUpdateAssignments } from '../sqlUpdate';
import { ALLOWED_PROJECT_UPDATE_KEYS } from '../../models/projectModel';
import { ALLOWED_TASK_UPDATE_KEYS } from '../../models/taskModel';
import { ALLOWED_TIME_LOG_UPDATE_KEYS } from '../../models/timeLogModel';
import { ALLOWED_ACTIVITY_TYPE_UPDATE_KEYS } from '../../models/activityTypeModel';

describe('buildUpdateAssignments', () => {
  const allowed = ['name', 'description', 'color'] as const;

  it('returns null when no whitelisted key is present', () => {
    expect(buildUpdateAssignments({ nope: 1 }, allowed)).toBeNull();
  });

  it('returns null for an empty, undefined or null payload', () => {
    expect(buildUpdateAssignments({}, allowed)).toBeNull();
    expect(buildUpdateAssignments(undefined, allowed)).toBeNull();
    expect(buildUpdateAssignments(null, allowed)).toBeNull();
  });

  it('builds a numbered SET clause for the provided keys only', () => {
    const result = buildUpdateAssignments({ color: '#ffffff', name: 'a' }, allowed);

    expect(result).toEqual({
      columns: ['name', 'color'],
      setClause: 'name = $1, color = $2',
      values: ['a', '#ffffff'],
      nextIndex: 3,
    });
  });

  it('orders columns by the whitelist, not by payload key order', () => {
    const result = buildUpdateAssignments(
      { description: 'd', name: 'n' },
      allowed,
    );

    expect(result?.columns).toEqual(['name', 'description']);
  });

  it('ignores keys outside the whitelist', () => {
    const result = buildUpdateAssignments(
      { name: 'n', id: 9, created_by: 1 },
      allowed,
    );

    expect(result?.setClause).toBe('name = $1');
    expect(result?.values).toEqual(['n']);
  });

  it('skips keys explicitly set to undefined but keeps null', () => {
    const result = buildUpdateAssignments(
      { name: undefined, description: null },
      allowed,
    );

    expect(result?.columns).toEqual(['description']);
    expect(result?.values).toEqual([null]);
  });

  it('ignores inherited properties', () => {
    const payload = Object.create({ name: 'inherited' }) as Record<
      string,
      unknown
    >;
    payload.color = '#000000';

    expect(buildUpdateAssignments(payload, allowed)?.columns).toEqual(['color']);
  });

  it('offsets placeholders when startIndex is given', () => {
    const result = buildUpdateAssignments({ name: 'n', color: 'c' }, allowed, 3);

    expect(result?.setClause).toBe('name = $3, color = $4');
    expect(result?.nextIndex).toBe(5);
  });

  it('throws when a whitelist entry is not a plain identifier', () => {
    expect(() =>
      buildUpdateAssignments({ name: 'n' }, ['name', 'x = 1; DROP TABLE t --']),
    ).toThrow(/Unsafe column name/);
  });

  it('throws even when the unsafe column is not in the payload', () => {
    expect(() => buildUpdateAssignments({ name: 'n' }, ['"quoted"'])).toThrow(
      /Unsafe column name/,
    );
  });
});

// Guards Security #3: the whitelists are the only source of column identifiers,
// so a typo or a non-column key added to one would produce broken (or unsafe)
// SQL with no compiler help. Pin each one to the real table definition.
describe('update whitelists match the actual table columns', () => {
  const initDir = path.resolve(__dirname, '../../../../db/init');

  const columnsOf = (table: string): string[] => {
    const file = fs
      .readdirSync(initDir)
      .find((name) => name.endsWith(`_TBL_${table}.sql`));
    if (!file) throw new Error(`No DDL file found for table ${table}`);

    const ddl = fs.readFileSync(path.join(initDir, file), 'utf8');
    const body = ddl.slice(ddl.indexOf('(') + 1);

    return body
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /^[a-z_][a-z0-9_]*\s/.test(line))
      .map((line) => line.split(/\s/)[0]);
  };

  const cases: [string, readonly string[]][] = [
    ['projects', ALLOWED_PROJECT_UPDATE_KEYS],
    ['tasks', ALLOWED_TASK_UPDATE_KEYS],
    ['time_logs', ALLOWED_TIME_LOG_UPDATE_KEYS],
    ['activity_types', ALLOWED_ACTIVITY_TYPE_UPDATE_KEYS],
  ];

  it.each(cases)('%s', (table, whitelist) => {
    const columns = columnsOf(table);
    expect(columns.length).toBeGreaterThan(0);
    for (const key of whitelist) {
      expect(columns).toContain(key);
    }
  });
});
