import { renderHook, act, waitFor } from '@testing-library/react';
import { useUserForm } from '../useUserForm';
import { createUser, getUserById, updateUser } from '../../../api/users';
import { getRoles } from '../../../api/roles';
import { useNavigate } from 'react-router-dom';
import { Role } from '../../../types/role';
import { User } from '../../../types/user';

// Mock the API functions and react-router-dom
jest.mock('../../../api/users');
jest.mock('../../../api/roles');
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

const mockNavigate = jest.fn();
(useNavigate as jest.Mock).mockReturnValue(mockNavigate);

describe('useUserForm', () => {
  const mockRoles: Role[] = [
    { id: 1, name: 'Admin' },
    { id: 2, name: 'User' },
  ];

  const mockUser: User = {
    id: 1,
    login: 'testuser',
    name: 'Test',
    surname: 'User',
    email: 'test@example.com',
    role_id: 2,
    status_id: 1,
    created_on: '2025-02-01',
    updated_on: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getRoles as jest.Mock).mockResolvedValue(mockRoles);
    (getUserById as jest.Mock).mockResolvedValue(mockUser);
    (createUser as jest.Mock).mockResolvedValue({ ...mockUser, id: 2 });
    (updateUser as jest.Mock).mockResolvedValue(mockUser);
  });

  it('should initialize with default values and fetch roles', async () => {
    const { result } = renderHook(() => useUserForm({}));

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.formValues).toEqual({
      login: '',
      name: '',
      surname: '',
      email: '',
      password: '',
      currentPassword: '',
      confirmPassword: '',
      role_id: 4,
    });

    // Wait for roles to be fetched
    await act(async () => {
      await Promise.resolve();
    });

    expect(getRoles).toHaveBeenCalled();
    expect(result.current.roles).toEqual(mockRoles);
    expect(result.current.loading).toBe(false);
  });

  it('should fetch user data when userId is provided', async () => {
    const { result } = renderHook(() => useUserForm({ userId: '1' }));

    // Wait for user data to be fetched
    await act(async () => {
      await Promise.resolve();
    });

    expect(getUserById).toHaveBeenCalledWith(1);
    expect(result.current.formValues).toEqual({
      login: mockUser.login,
      name: mockUser.name,
      surname: mockUser.surname,
      email: mockUser.email,
      password: '',
      currentPassword: '',
      confirmPassword: '',
      role_id: mockUser.role_id,
    });
  });

  it('should handle input changes', async () => {
    const { result } = renderHook(() => useUserForm({}));

    await act(async () => {
      result.current.handleInputChange({
        target: { name: 'login', value: 'newlogin' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.formValues.login).toBe('newlogin');
    expect(result.current.error).toBeNull();
  });

  it('should handle form submission in create mode', async () => {
    const { result } = renderHook(() => useUserForm({}));

    // Set form values
    await act(async () => {
      result.current.handleInputChange({
        target: { name: 'login', value: 'newuser' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleInputChange({
        target: { name: 'name', value: 'New' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleInputChange({
        target: { name: 'surname', value: 'User' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleInputChange({
        target: { name: 'email', value: 'new@example.com' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleInputChange({
        target: { name: 'password', value: 'password123' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleInputChange({
        target: { name: 'confirmPassword', value: 'password123' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    const mockEvent = {
      preventDefault: jest.fn(),
    };

    await act(async () => {
      await result.current.handleSubmit(
        mockEvent as unknown as React.FormEvent,
      );
    });

    expect(createUser).toHaveBeenCalledWith({
      login: 'newuser',
      name: 'New',
      surname: 'User',
      email: 'new@example.com',
      password: 'password123',
      role_id: 4,
    });
    expect(mockNavigate).toHaveBeenCalledWith('/users');
  });

  it('should handle form submission in edit mode', async () => {
    const { result } = renderHook(() => useUserForm({ userId: '1' }));

    // Wait for initial data load
    await act(async () => {
      await Promise.resolve();
    });

    // Update password
    await act(async () => {
      result.current.handleInputChange({
        target: { name: 'password', value: 'newpassword' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleInputChange({
        target: { name: 'currentPassword', value: 'oldpassword' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleInputChange({
        target: { name: 'confirmPassword', value: 'newpassword' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    const mockEvent = {
      preventDefault: jest.fn(),
    };

    await act(async () => {
      await result.current.handleSubmit(
        mockEvent as unknown as React.FormEvent,
      );
    });

    expect(updateUser).toHaveBeenCalledWith(1, {
      login: mockUser.login,
      name: mockUser.name,
      surname: mockUser.surname,
      email: mockUser.email,
      role_id: mockUser.role_id,
      password: 'newpassword',
      currentPassword: 'oldpassword',
    });
    expect(mockNavigate).toHaveBeenCalledWith('/users');
  });

  it('should handle API errors', async () => {
    (createUser as jest.Mock).mockRejectedValue({
      response: { data: { error: 'API Error' } },
    });

    const { result } = renderHook(() => useUserForm({}));

    // Set required form values
    await act(async () => {
      result.current.handleInputChange({
        target: { name: 'login', value: 'newuser' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleInputChange({
        target: { name: 'name', value: 'New' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleInputChange({
        target: { name: 'surname', value: 'User' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleInputChange({
        target: { name: 'email', value: 'new@example.com' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleInputChange({
        target: { name: 'password', value: 'password123' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleInputChange({
        target: { name: 'confirmPassword', value: 'password123' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    const mockEvent = {
      preventDefault: jest.fn(),
    };

    await act(async () => {
      await result.current.handleSubmit(
        mockEvent as unknown as React.FormEvent,
      );
    });

    expect(result.current.error).toBe('API Error');
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
