import { api } from '../api';
import { Role } from '../../types/role';
import { getRoles, createRole, updateRole, deleteRole } from '../roles';

// Mock the api module
jest.mock('../api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('Roles API', () => {
  // Mock data
  const mockRole: Role = {
    id: 1,
    name: 'Admin',
    description: 'Administrator role',
    active: true,
    created_on: '2023-01-01T00:00:00Z',
    permissions: [1, 2, 3],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRoles', () => {
    it('should fetch roles successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [mockRole] });

      const result = await getRoles();

      expect(mockedApi.get).toHaveBeenCalledWith('/roles', {
        signal: undefined,
      });
      expect(result).toEqual([mockRole]);
    });

    it('should throw error when fetch fails', async () => {
      const error = new Error('Network error');
      mockedApi.get.mockRejectedValueOnce(error);

      await expect(getRoles()).rejects.toThrow(error);
    });
  });

  describe('createRole', () => {
    const newRole = {
      name: 'New Role',
      description: 'New role description',
      active: true,
      permissions: [1, 2],
    };

    it('should create role successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({
        data: { ...mockRole, ...newRole },
      });

      const result = await createRole(newRole);

      expect(mockedApi.post).toHaveBeenCalledWith('/roles', newRole);
      expect(result).toEqual({ ...mockRole, ...newRole });
    });

    it('should throw error when creation fails', async () => {
      const error = new Error('Creation failed');
      mockedApi.post.mockRejectedValueOnce(error);

      await expect(createRole(newRole)).rejects.toThrow(error);
    });
  });

  describe('updateRole', () => {
    const updateData = {
      name: 'Updated Role',
      description: 'Updated description',
    };

    it('should update role successfully', async () => {
      const updatedRole = { ...mockRole, ...updateData };
      mockedApi.put.mockResolvedValueOnce({ data: updatedRole });

      const result = await updateRole(1, updateData);

      expect(mockedApi.put).toHaveBeenCalledWith('/roles/1', updateData);
      expect(result).toEqual(updatedRole);
    });

    it('should throw error when update fails', async () => {
      const error = new Error('Update failed');
      mockedApi.put.mockRejectedValueOnce(error);

      await expect(updateRole(1, updateData)).rejects.toThrow(error);
    });
  });

  describe('deleteRole', () => {
    it('should delete role successfully', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: null });

      await deleteRole(1);

      expect(mockedApi.delete).toHaveBeenCalledWith('/roles/1');
    });

    it('should throw error when deletion fails', async () => {
      const error = new Error('Deletion failed');
      mockedApi.delete.mockRejectedValueOnce(error);

      await expect(deleteRole(1)).rejects.toThrow(error);
    });
  });
});
