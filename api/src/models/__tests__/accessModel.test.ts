import { Pool } from 'pg';
import {
  isProjectMember,
  isTaskProjectMember,
  getAccessibleProjectIds,
  accessibleProjectsSubquery,
  resolveProjectScope,
  filterByProjectAccess,
  isCommentAuthor,
  isTimeLogOwner,
} from '../accessModel';
import * as permissionModel from '../permissionModel';

jest.mock('../permissionModel');

describe('accessModel', () => {
  let mockPool: { query: jest.Mock };

  const queryResult = (rows: unknown[], rowCount?: number | null) => ({
    rows,
    rowCount: rowCount === undefined ? rows.length : rowCount,
    command: '',
    oid: 0,
    fields: [],
  });

  const lastSql = (): string => mockPool.query.mock.calls[0][0] as string;

  beforeEach(() => {
    mockPool = { query: jest.fn() };
  });

  const pool = () => mockPool as unknown as Pool;

  describe('isProjectMember', () => {
    it('returns true when a row matches', async () => {
      mockPool.query.mockResolvedValueOnce(queryResult([{ '?column?': 1 }]));

      await expect(isProjectMember(pool(), '3', '7')).resolves.toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), [
        '3',
        '7',
      ]);
    });

    it('accepts the project creator as a member', async () => {
      mockPool.query.mockResolvedValueOnce(queryResult([{ '?column?': 1 }]));

      await isProjectMember(pool(), '3', '7');

      expect(lastSql()).toContain('p.created_by = $2');
      expect(lastSql()).toContain('LEFT JOIN project_users');
    });

    it('returns false when no row matches', async () => {
      mockPool.query.mockResolvedValueOnce(queryResult([]));

      await expect(isProjectMember(pool(), '3', '7')).resolves.toBe(false);
    });

    it('returns false when the driver reports a null rowCount', async () => {
      mockPool.query.mockResolvedValueOnce(queryResult([], null));

      await expect(isProjectMember(pool(), '3', '7')).resolves.toBe(false);
    });

    it('propagates query errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('db down'));

      await expect(isProjectMember(pool(), '3', '7')).rejects.toThrow('db down');
    });
  });

  describe('isTaskProjectMember', () => {
    it('resolves membership through the task project', async () => {
      mockPool.query.mockResolvedValueOnce(queryResult([{ '?column?': 1 }]));

      await expect(isTaskProjectMember(pool(), '11', '7')).resolves.toBe(true);
      expect(lastSql()).toContain('JOIN projects p ON p.id = t.project_id');
      expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), [
        '11',
        '7',
      ]);
    });

    it('returns false for a task in an unreachable project', async () => {
      mockPool.query.mockResolvedValueOnce(queryResult([]));

      await expect(isTaskProjectMember(pool(), '11', '7')).resolves.toBe(false);
    });

    it('returns false when rowCount is null', async () => {
      mockPool.query.mockResolvedValueOnce(queryResult([], null));

      await expect(isTaskProjectMember(pool(), '11', '7')).resolves.toBe(false);
    });
  });

  describe('getAccessibleProjectIds', () => {
    it('maps rows to numeric ids', async () => {
      mockPool.query.mockResolvedValueOnce(
        queryResult([{ id: 1 }, { id: '2' }]),
      );

      await expect(getAccessibleProjectIds(pool(), '7')).resolves.toEqual([
        1, 2,
      ]);
      expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), ['7']);
    });

    it('returns an empty array when the user reaches nothing', async () => {
      mockPool.query.mockResolvedValueOnce(queryResult([]));

      await expect(getAccessibleProjectIds(pool(), '7')).resolves.toEqual([]);
    });
  });

  describe('accessibleProjectsSubquery', () => {
    it('numbers the user placeholder from the given index', () => {
      const sql = accessibleProjectsSubquery(4);

      expect(sql).toContain('$4');
      expect(sql).not.toContain('$5');
      expect(sql).toContain('FROM projects ap');
    });
  });

  describe('resolveProjectScope', () => {
    it('returns the user id for a non-admin', async () => {
      (permissionModel.hasPermission as jest.Mock).mockResolvedValueOnce(false);

      await expect(resolveProjectScope(pool(), '7')).resolves.toBe('7');
    });

    it('returns null for an admin so nothing is filtered out', async () => {
      (permissionModel.hasPermission as jest.Mock).mockResolvedValueOnce(true);

      await expect(resolveProjectScope(pool(), '7')).resolves.toBeNull();
    });
  });

  describe('filterByProjectAccess', () => {
    it('short-circuits on an empty result set without touching the db', async () => {
      const rows: { project_id: number }[] = [];

      await expect(
        filterByProjectAccess(pool(), '7', rows, 'project_id'),
      ).resolves.toBe(rows);
      expect(permissionModel.hasPermission).not.toHaveBeenCalled();
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('returns every row for an Admin', async () => {
      const rows = [{ project_id: 1 }, { project_id: 99 }];
      (permissionModel.hasPermission as jest.Mock).mockResolvedValueOnce(true);

      await expect(
        filterByProjectAccess(pool(), '7', rows, 'project_id'),
      ).resolves.toBe(rows);
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('drops rows outside the accessible projects', async () => {
      (permissionModel.hasPermission as jest.Mock).mockResolvedValueOnce(false);
      mockPool.query.mockResolvedValueOnce(queryResult([{ id: 1 }, { id: 2 }]));

      const rows = [{ project_id: 1 }, { project_id: 99 }, { project_id: 2 }];

      await expect(
        filterByProjectAccess(pool(), '7', rows, 'project_id'),
      ).resolves.toEqual([{ project_id: 1 }, { project_id: 2 }]);
    });

    it('matches project ids that arrive as strings', async () => {
      (permissionModel.hasPermission as jest.Mock).mockResolvedValueOnce(false);
      mockPool.query.mockResolvedValueOnce(queryResult([{ id: 5 }]));

      const rows = [{ project_id: '5' }, { project_id: '6' }];

      await expect(
        filterByProjectAccess(pool(), '7', rows, 'project_id'),
      ).resolves.toEqual([{ project_id: '5' }]);
    });

    it('returns nothing when the user has no accessible projects', async () => {
      (permissionModel.hasPermission as jest.Mock).mockResolvedValueOnce(false);
      mockPool.query.mockResolvedValueOnce(queryResult([]));

      await expect(
        filterByProjectAccess(pool(), '7', [{ project_id: 1 }], 'project_id'),
      ).resolves.toEqual([]);
    });
  });

  describe('isCommentAuthor', () => {
    it('returns true for the author', async () => {
      mockPool.query.mockResolvedValueOnce(queryResult([{ '?column?': 1 }]));

      await expect(isCommentAuthor(pool(), '13', '7')).resolves.toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM comments'),
        ['13', '7'],
      );
    });

    it('returns false for anyone else', async () => {
      mockPool.query.mockResolvedValueOnce(queryResult([]));

      await expect(isCommentAuthor(pool(), '13', '8')).resolves.toBe(false);
    });

    it('returns false when rowCount is null', async () => {
      mockPool.query.mockResolvedValueOnce(queryResult([], null));

      await expect(isCommentAuthor(pool(), '13', '7')).resolves.toBe(false);
    });
  });

  describe('isTimeLogOwner', () => {
    it('returns true for the owner', async () => {
      mockPool.query.mockResolvedValueOnce(queryResult([{ '?column?': 1 }]));

      await expect(isTimeLogOwner(pool(), '14', '7')).resolves.toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM time_logs'),
        ['14', '7'],
      );
    });

    it('returns false for anyone else', async () => {
      mockPool.query.mockResolvedValueOnce(queryResult([]));

      await expect(isTimeLogOwner(pool(), '14', '8')).resolves.toBe(false);
    });

    it('returns false when rowCount is null', async () => {
      mockPool.query.mockResolvedValueOnce(queryResult([], null));

      await expect(isTimeLogOwner(pool(), '14', '7')).resolves.toBe(false);
    });
  });
});
