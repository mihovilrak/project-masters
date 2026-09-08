import { Pool } from 'pg';
import * as activityTypeModel from '../activityTypeModel';

// Mock the pg module
jest.mock('pg', () => ({
  Pool: jest.fn(),
}));

describe('ActivityTypeModel', () => {
  let mockPool: jest.Mocked<Pool>;

  const mockQueryResult = (rows: any[]) => ({
    rows,
    rowCount: rows.length,
    command: '',
    oid: 0,
    fields: [],
  });

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    } as unknown as jest.Mocked<Pool>;
    jest.clearAllMocks();
  });

  describe('getActivityTypes', () => {
    it('should return all active activity types', async () => {
      const mockActivityTypes = [
        {
          id: 1,
          name: 'Development',
          color: '#FF0000',
          icon: 'code',
          active: true,
          created_on: new Date(),
          updated_on: new Date(),
        },
        {
          id: 2,
          name: 'Testing',
          color: '#00FF00',
          icon: 'bug_report',
          active: true,
          created_on: new Date(),
          updated_on: new Date(),
        },
      ];
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult(mockActivityTypes),
      );

      const result = await activityTypeModel.getActivityTypes(mockPool);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM activity_types'),
      );
      expect(result).toEqual(mockActivityTypes);
    });

    it('should return empty array when no activity types exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      const result = await activityTypeModel.getActivityTypes(mockPool);

      expect(result).toEqual([]);
    });
  });

  describe('createActivityType', () => {
    it('should create a new activity type', async () => {
      const newActivityType = {
        id: 1,
        name: 'New Activity',
        description: 'A new activity type',
        color: '#0000FF',
        icon: 'work',
        active: true,
        created_on: new Date(),
        updated_on: new Date(),
      };
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult([newActivityType]),
      );

      const result = await activityTypeModel.createActivityType(
        mockPool,
        'New Activity',
        'A new activity type',
        '#0000FF',
        'work',
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO activity_types'),
        ['New Activity', 'A new activity type', '#0000FF', 'work'],
      );
      expect(result).toEqual(newActivityType);
    });

    it('should create activity type with null description and icon', async () => {
      const newActivityType = {
        id: 2,
        name: 'Simple Activity',
        description: null,
        color: '#FF00FF',
        icon: null,
        active: true,
        created_on: new Date(),
        updated_on: new Date(),
      };
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult([newActivityType]),
      );

      const result = await activityTypeModel.createActivityType(
        mockPool,
        'Simple Activity',
        null,
        '#FF00FF',
        null,
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO activity_types'),
        ['Simple Activity', null, '#FF00FF', null],
      );
      expect(result).toEqual(newActivityType);
    });
  });

  describe('updateActivityType', () => {
    it('should update an existing activity type', async () => {
      const updatedActivityType = {
        id: 1,
        name: 'Updated Activity',
        description: 'Updated description',
        color: '#FFFF00',
        icon: 'build',
        active: true,
        created_on: new Date(),
        updated_on: new Date(),
      };
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult([updatedActivityType]),
      );

      const result = await activityTypeModel.updateActivityType(
        mockPool,
        '1',
        {
          name: 'Updated Activity',
          description: 'Updated description',
          color: '#FFFF00',
          icon: 'build',
        },
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE activity_types'),
        ['Updated Activity', 'Updated description', '#FFFF00', 'build', '1'],
      );
      expect(result).toEqual(updatedActivityType);
    });

    it('should return null when activity type not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      const result = await activityTypeModel.updateActivityType(
        mockPool,
        '999',
        { name: 'Non-existent', color: '#000000' },
      );

      expect(result).toBeNull();
    });

    it('should only write the keys present in the payload', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(mockQueryResult([{}]));

      await activityTypeModel.updateActivityType(mockPool, '1', {
        color: '#FFFF00',
      });

      const [sql, values] = (mockPool.query as jest.Mock).mock.calls[0];
      expect(sql).toContain('color = $1');
      expect(sql).not.toContain('name =');
      expect(sql).not.toContain('description =');
      expect(sql).not.toContain('icon =');
      expect(values).toEqual(['#FFFF00', '1']);
    });

    it('should read the row back when no updatable key is provided', async () => {
      const existing = { id: 1, name: 'Untouched' };
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult([existing]),
      );

      const result = await activityTypeModel.updateActivityType(
        mockPool,
        '1',
        {},
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM activity_types'),
        ['1'],
      );
      expect(result).toEqual(existing);
    });
  });

  describe('deleteActivityType', () => {
    it('should soft delete an activity type', async () => {
      const deletedActivityType = {
        id: 1,
        name: 'Deleted Activity',
        description: 'To be deleted',
        color: '#FF0000',
        icon: 'delete',
        active: false,
        created_on: new Date(),
        updated_on: new Date(),
      };
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult([deletedActivityType]),
      );

      const result = await activityTypeModel.deleteActivityType(mockPool, '1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE activity_types'),
        ['1'],
      );
      expect(result).toEqual(deletedActivityType);
    });

    it('should return null when activity type not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      const result = await activityTypeModel.deleteActivityType(
        mockPool,
        '999',
      );

      expect(result).toBeNull();
    });
  });
});
