import { api } from '../api';
import { Permission } from '../../types/admin';
import { getAllPermissions } from '../permissions';

jest.mock('../api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('Permissions API', () => {
  const mockPermission: Permission = {
    id: 1,
    name: 'TEST_PERMISSION',
    created_on: '2023-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllPermissions', () => {
    it('should fetch all permissions successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [mockPermission] });

      const permissions = await getAllPermissions();

      expect(mockedApi.get).toHaveBeenCalledWith('/admin/permissions', {
        signal: undefined,
      });
      expect(mockedApi.get).toHaveBeenCalledTimes(1);
      expect(permissions).toEqual([mockPermission]);
    });

    it('should throw error when fetch fails', async () => {
      const error = new Error('Network error');
      mockedApi.get.mockRejectedValueOnce(error);

      await expect(getAllPermissions()).rejects.toThrow(error);
      expect(mockedApi.get).toHaveBeenCalledWith('/admin/permissions', {
        signal: undefined,
      });
      expect(mockedApi.get).toHaveBeenCalledTimes(1);
    });
  });
});
