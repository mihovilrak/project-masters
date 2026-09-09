import { api } from '../api';
import { User, UserCreate, UserUpdate } from '../../types/user';
import { Role } from '../../types/role';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changeUserStatus,
} from '../users';

jest.mock('../api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('Users API', () => {
  const mockUser: User = {
    id: 1,
    login: 'testuser',
    name: 'Test',
    surname: 'User',
    email: 'test@example.com',
    role_id: 1,
    status_id: 1,
    created_on: '2024-01-01T00:00:00Z',
    updated_on: null,
    last_login: null,
  };

  const mockUserCreate: UserCreate = {
    login: 'testuser',
    password: 'password123',
    name: 'Test',
    surname: 'User',
    email: 'test@example.com',
    role_id: 1,
  };

  const mockUserUpdate: UserUpdate = {
    id: 1,
    name: 'Updated',
    surname: 'User',
  };

  const mockRole: Role = {
    id: 1,
    name: 'Admin',
    active: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should fetch all users', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [mockUser] });
      const result = await getUsers();
      expect(mockedApi.get).toHaveBeenCalledWith('/users', { params: {} });
      expect(result).toEqual([mockUser]);
    });

    it('should handle error when fetching users', async () => {
      const error = new Error('Failed to fetch users');
      mockedApi.get.mockRejectedValueOnce(error);
      await expect(getUsers()).rejects.toThrow(error);
    });
  });

  describe('getUserById', () => {
    it('should fetch user by id', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: mockUser });
      const result = await getUserById(1);
      expect(mockedApi.get).toHaveBeenCalledWith('/users/1');
      expect(result).toEqual(mockUser);
    });

    it('should handle error when fetching user by id', async () => {
      const error = new Error('Failed to fetch user');
      mockedApi.get.mockRejectedValueOnce(error);
      await expect(getUserById(1)).rejects.toThrow(error);
    });
  });

  describe('createUser', () => {
    it('should create new user', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: mockUser });
      const result = await createUser(mockUserCreate);
      expect(mockedApi.post).toHaveBeenCalledWith('/users', mockUserCreate);
      expect(result).toEqual(mockUser);
    });

    it('should handle error when creating user', async () => {
      const error = new Error('Failed to create user');
      mockedApi.post.mockRejectedValueOnce(error);
      await expect(createUser(mockUserCreate)).rejects.toThrow(error);
    });
  });

  describe('updateUser', () => {
    it('should update existing user', async () => {
      mockedApi.put.mockResolvedValueOnce({ data: mockUser });
      const result = await updateUser(1, mockUserUpdate);
      expect(mockedApi.put).toHaveBeenCalledWith('/users/1', mockUserUpdate);
      expect(result).toEqual(mockUser);
    });

    it('should handle error when updating user', async () => {
      const error = new Error('Failed to update user');
      mockedApi.put.mockRejectedValueOnce(error);
      await expect(updateUser(1, mockUserUpdate)).rejects.toThrow(error);
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: undefined });
      await deleteUser(1);
      expect(mockedApi.delete).toHaveBeenCalledWith('/users/1');
    });

    it('should handle error when deleting user', async () => {
      const error = new Error('Failed to delete user');
      mockedApi.delete.mockRejectedValueOnce(error);
      await expect(deleteUser(1)).rejects.toThrow(error);
    });
  });

  describe('changeUserStatus', () => {
    it('should change user status', async () => {
      mockedApi.patch.mockResolvedValueOnce({ data: mockUser });
      const result = await changeUserStatus(1);
      expect(mockedApi.patch).toHaveBeenCalledWith('/users/1/status');
      expect(result).toEqual(mockUser);
    });

    it('should handle error when changing user status', async () => {
      const error = new Error('Failed to change user status');
      mockedApi.patch.mockRejectedValueOnce(error);
      await expect(changeUserStatus(1)).rejects.toThrow(error);
    });
  });
});
