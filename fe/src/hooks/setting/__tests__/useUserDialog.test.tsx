import { renderHook, act, waitFor } from '@testing-library/react';
import { SelectChangeEvent } from '@mui/material';
import { useUserDialog } from '../useUserDialog';
import { createUser, updateUser } from '../../../api/users';
import { getRoles } from '../../../api/roles';
import { User } from '../../../types/user';

// Mock the API calls
jest.mock('../../../api/users');
jest.mock('../../../api/roles');

describe('useUserDialog', () => {
  const mockUser: User = {
    id: 1,
    login: 'testuser',
    name: 'Test',
    surname: 'User',
    email: 'test@example.com',
    role_id: 2,
    status_id: 1,
    avatar_url: null,
    last_login: null,
    created_on: '2024-01-25T00:00:00Z',
    updated_on: null,
  };

  const mockRoles = [
    { id: 1, name: 'Admin', description: 'Administrator', active: true },
    { id: 2, name: 'Manager', description: 'Manager', active: true },
    { id: 3, name: 'User', description: 'User', active: true },
  ];

  const mockOnClose = jest.fn();
  const mockOnUserSaved = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getRoles as jest.Mock).mockResolvedValue(mockRoles);
  });

  it('should initialize with default values when no user is provided', async () => {
    const { result } = renderHook(() =>
      useUserDialog(null, true, mockOnClose, mockOnUserSaved),
    );

    await waitFor(() => {
      expect(result.current.rolesLoading).toBe(false);
    });

    expect(result.current.formData).toEqual({
      login: '',
      name: '',
      surname: '',
      email: '',
      password: '',
      confirmPassword: '',
      role_id: expect.any(Number),
      status_id: 1,
    });
    expect(result.current.error).toBeNull();
    expect(result.current.roles).toEqual(mockRoles);
    expect(getRoles).toHaveBeenCalled();
  });

  it('should initialize with user data when provided', async () => {
    const { result } = renderHook(() =>
      useUserDialog(mockUser, true, mockOnClose, mockOnUserSaved),
    );

    await waitFor(() => {
      expect(result.current.rolesLoading).toBe(false);
    });

    expect(result.current.formData).toEqual({
      login: mockUser.login,
      name: mockUser.name,
      surname: mockUser.surname,
      email: mockUser.email,
      password: '',
      confirmPassword: '',
      role_id: mockUser.role_id,
      status_id: mockUser.status_id,
    });
    expect(result.current.roles).toEqual(mockRoles);
  });

  it('should fetch roles when dialog opens', async () => {
    const { result } = renderHook(() =>
      useUserDialog(null, true, mockOnClose, mockOnUserSaved),
    );

    expect(result.current.rolesLoading).toBe(true);
    expect(getRoles).toHaveBeenCalled();

    await waitFor(() => {
      expect(result.current.rolesLoading).toBe(false);
    });

    expect(result.current.roles).toEqual(mockRoles);
  });

  it('does not reset edited fields when roles finish loading', async () => {
    let resolveRoles: (roles: typeof mockRoles) => void = () => undefined;
    (getRoles as jest.Mock).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRoles = resolve;
      }),
    );
    const { result } = renderHook(() =>
      useUserDialog(null, true, mockOnClose, mockOnUserSaved),
    );

    act(() => {
      result.current.handleTextChange({
        target: { name: 'name', value: 'Typed while loading' },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    await act(async () => {
      resolveRoles(mockRoles);
    });

    expect(result.current.formData.name).toBe('Typed while loading');
    expect(result.current.roles).toEqual(mockRoles);
  });

  it('should handle roles fetch error', async () => {
    const error = new Error('Failed to fetch roles');
    (getRoles as jest.Mock).mockRejectedValueOnce(error);

    const { result } = renderHook(() =>
      useUserDialog(null, true, mockOnClose, mockOnUserSaved),
    );

    await waitFor(() => {
      expect(result.current.rolesLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load roles');
    expect(result.current.roles).toEqual([]);
  });

  it('should handle text input changes', () => {
    const { result } = renderHook(() =>
      useUserDialog(null, true, mockOnClose, mockOnUserSaved),
    );

    act(() => {
      const mockEvent = {
        target: { name: 'name', value: 'New Name' },
      } as React.ChangeEvent<HTMLInputElement>;

      result.current.handleTextChange(mockEvent);
    });

    expect(result.current.formData.name).toBe('New Name');
  });

  it('should handle role selection changes', () => {
    const { result } = renderHook(() =>
      useUserDialog(null, true, mockOnClose, mockOnUserSaved),
    );

    act(() => {
      const mockEvent = {
        target: { value: 2 },
      } as SelectChangeEvent<number>;

      result.current.handleRoleChange(mockEvent);
    });

    expect(result.current.formData.role_id).toBe(2);
  });

  it('should create new user successfully', async () => {
    const newUser = {
      login: 'newuser',
      name: 'New',
      surname: 'User',
      email: 'new@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      role_id: 3,
      status_id: 1,
    };

    (createUser as jest.Mock).mockResolvedValueOnce({
      ...newUser,
      id: 2,
      confirmPassword: undefined,
    });

    const { result } = renderHook(() =>
      useUserDialog(null, true, mockOnClose, mockOnUserSaved),
    );

    await waitFor(() => {
      expect(result.current.rolesLoading).toBe(false);
    });

    // Set form data
    act(() => {
      Object.entries(newUser).forEach(([key, value]) => {
        const mockEvent = {
          target: { name: key, value },
        } as React.ChangeEvent<HTMLInputElement>;
        result.current.handleTextChange(mockEvent);
      });
    });

    // Submit form
    await act(async () => {
      const mockEvent = {
        preventDefault: jest.fn(),
      } as unknown as React.FormEvent<HTMLFormElement>;

      await result.current.handleSubmit(mockEvent);
    });

    // confirmPassword should not be sent to API
    const { confirmPassword, ...userDataForAPI } = newUser;
    expect(createUser).toHaveBeenCalledWith(userDataForAPI);
    expect(mockOnUserSaved).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('should update existing user successfully', async () => {
    (updateUser as jest.Mock).mockResolvedValueOnce({
      ...mockUser,
      name: 'Updated Name',
    });

    const { result } = renderHook(() =>
      useUserDialog(mockUser, true, mockOnClose, mockOnUserSaved),
    );

    // Update name
    act(() => {
      const mockEvent = {
        target: { name: 'name', value: 'Updated Name' },
      } as React.ChangeEvent<HTMLInputElement>;
      result.current.handleTextChange(mockEvent);
    });

    // Submit form
    await act(async () => {
      const mockEvent = {
        preventDefault: jest.fn(),
      } as unknown as React.FormEvent<HTMLFormElement>;

      await result.current.handleSubmit(mockEvent);
    });

    expect(updateUser).toHaveBeenCalledWith(mockUser.id, {
      id: mockUser.id,
      name: 'Updated Name',
    });
    expect(mockOnUserSaved).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('should handle submission error', async () => {
    const error = new Error('Failed to save user');
    (createUser as jest.Mock).mockRejectedValueOnce(error);

    const { result } = renderHook(() =>
      useUserDialog(null, true, mockOnClose, mockOnUserSaved),
    );

    await waitFor(() => {
      expect(result.current.rolesLoading).toBe(false);
    });

    // Set required fields including matching passwords
    act(() => {
      result.current.handleTextChange({
        target: { name: 'login', value: 'testuser' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleTextChange({
        target: { name: 'name', value: 'Test' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleTextChange({
        target: { name: 'surname', value: 'User' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleTextChange({
        target: { name: 'email', value: 'test@example.com' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleTextChange({
        target: { name: 'password', value: 'password123' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleTextChange({
        target: { name: 'confirmPassword', value: 'password123' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      const mockEvent = {
        preventDefault: jest.fn(),
      } as unknown as React.FormEvent<HTMLFormElement>;

      await result.current.handleSubmit(mockEvent);
    });

    expect(result.current.error).toBe('Failed to save user');
    expect(mockOnUserSaved).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should validate password matching in create mode', async () => {
    const { result } = renderHook(() =>
      useUserDialog(null, true, mockOnClose, mockOnUserSaved),
    );

    await waitFor(() => {
      expect(result.current.rolesLoading).toBe(false);
    });

    // Set form data with mismatched passwords
    act(() => {
      result.current.handleTextChange({
        target: { name: 'login', value: 'testuser' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleTextChange({
        target: { name: 'name', value: 'Test' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleTextChange({
        target: { name: 'surname', value: 'User' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleTextChange({
        target: { name: 'email', value: 'test@example.com' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleTextChange({
        target: { name: 'password', value: 'password123' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleTextChange({
        target: { name: 'confirmPassword', value: 'different' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      const mockEvent = {
        preventDefault: jest.fn(),
      } as unknown as React.FormEvent<HTMLFormElement>;

      await result.current.handleSubmit(mockEvent);
    });

    expect(result.current.error).toBe('Passwords do not match');
    expect(createUser).not.toHaveBeenCalled();
    expect(mockOnUserSaved).not.toHaveBeenCalled();
  });

  it('should validate password matching in edit mode when password is provided', async () => {
    (updateUser as jest.Mock).mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() =>
      useUserDialog(mockUser, true, mockOnClose, mockOnUserSaved),
    );

    await waitFor(() => {
      expect(result.current.rolesLoading).toBe(false);
    });

    // Set password with mismatched confirmation
    act(() => {
      result.current.handleTextChange({
        target: { name: 'password', value: 'newpassword' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleTextChange({
        target: { name: 'confirmPassword', value: 'different' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      const mockEvent = {
        preventDefault: jest.fn(),
      } as unknown as React.FormEvent<HTMLFormElement>;

      await result.current.handleSubmit(mockEvent);
    });

    expect(result.current.error).toBe('Passwords do not match');
    expect(updateUser).not.toHaveBeenCalled();
    expect(mockOnUserSaved).not.toHaveBeenCalled();
  });

  it('should require password confirmation in create mode', async () => {
    const { result } = renderHook(() =>
      useUserDialog(null, true, mockOnClose, mockOnUserSaved),
    );

    await waitFor(() => {
      expect(result.current.rolesLoading).toBe(false);
    });

    // Set form data without confirmPassword
    act(() => {
      result.current.handleTextChange({
        target: { name: 'login', value: 'testuser' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleTextChange({
        target: { name: 'name', value: 'Test' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleTextChange({
        target: { name: 'surname', value: 'User' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleTextChange({
        target: { name: 'email', value: 'test@example.com' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleTextChange({
        target: { name: 'password', value: 'password123' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      const mockEvent = {
        preventDefault: jest.fn(),
      } as unknown as React.FormEvent<HTMLFormElement>;

      await result.current.handleSubmit(mockEvent);
    });

    expect(result.current.error).toBe(
      'Password and password confirmation are required',
    );
    expect(createUser).not.toHaveBeenCalled();
  });
});
