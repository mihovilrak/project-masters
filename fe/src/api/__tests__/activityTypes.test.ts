import { api } from '../api';
import { ActivityType } from '../../types/setting';
import {
  getActivityTypes,
  createActivityType,
  updateActivityType,
  deleteActivityType,
} from '../activityTypes';

jest.mock('../api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('Activity Types API', () => {
  const mockActivityType: ActivityType = {
    id: 1,
    name: 'Test Activity',
    description: 'Test Description',
    color: '#000000',
    icon: 'test-icon',
    active: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getActivityTypes', () => {
    it('should return activity types on success', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [mockActivityType] });

      const result = await getActivityTypes();

      expect(mockedApi.get).toHaveBeenCalledWith('/admin/activity-types', {
        signal: undefined,
      });
      expect(result).toEqual([mockActivityType]);
    });

    it('should throw error on failure', async () => {
      const error = new Error('API Error');
      mockedApi.get.mockRejectedValueOnce(error);

      await expect(getActivityTypes()).rejects.toThrow(error);
    });
  });

  describe('createActivityType', () => {
    it('should create and return activity type on success', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: mockActivityType });

      const result = await createActivityType(mockActivityType);

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/admin/activity-types',
        mockActivityType,
      );
      expect(result).toEqual(mockActivityType);
    });

    it('should throw error on failure', async () => {
      const error = new Error('API Error');
      mockedApi.post.mockRejectedValueOnce(error);

      await expect(createActivityType(mockActivityType)).rejects.toThrow(error);
    });
  });

  describe('updateActivityType', () => {
    it('should update and return activity type on success', async () => {
      mockedApi.put.mockResolvedValueOnce({ data: mockActivityType });

      const result = await updateActivityType(1, mockActivityType);

      expect(mockedApi.put).toHaveBeenCalledWith(
        '/admin/activity-types/1',
        mockActivityType,
      );
      expect(result).toEqual(mockActivityType);
    });

    it('should throw error on failure', async () => {
      const error = new Error('API Error');
      mockedApi.put.mockRejectedValueOnce(error);

      await expect(updateActivityType(1, mockActivityType)).rejects.toThrow(
        error,
      );
    });
  });

  describe('deleteActivityType', () => {
    it('should delete activity type on success', async () => {
      mockedApi.delete.mockResolvedValueOnce(undefined);

      await deleteActivityType(1);

      expect(mockedApi.delete).toHaveBeenCalledWith('/admin/activity-types/1');
    });

    it('should throw error on failure', async () => {
      const error = new Error('API Error');
      mockedApi.delete.mockRejectedValueOnce(error);

      await expect(deleteActivityType(1)).rejects.toThrow(error);
    });
  });
});
