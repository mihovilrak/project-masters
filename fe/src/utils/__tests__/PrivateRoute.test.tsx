import React from 'react';
import { render, screen } from '@testing-library/react';
import PrivateRoute from '../PrivateRoute';
import { useAuth } from '../../context/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';
import { User } from '../../types/user';
import { UserPermission } from '../../types/auth';

// Mock dependencies
jest.mock('../../context/AuthContext');
jest.mock('react-router-dom', () => ({
  Navigate: jest.fn(() => null),
  Outlet: jest.fn(() => null),
}));
jest.mock('@mui/material', () => ({
  Box: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CircularProgress: () => <div data-testid="loading-spinner">Loading...</div>,
}));

describe('PrivateRoute', () => {
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

  const mockPermission: UserPermission = {
    permission: 'Admin',
  };

  const mockUser: User = {
    id: 1,
    login: 'testuser',
    name: 'Test',
    surname: 'User',
    email: 'test@example.com',
    role_id: 1,
    status_id: 1,
    avatar_url: null,
    created_on: new Date().toISOString(),
    updated_on: null,
    last_login: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading spinner when permissions are loading', () => {
    mockUseAuth.mockReturnValue({
      currentUser: null,
      hasPermission: () => false,
      permissionsLoading: true,
      userPermissions: [],
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
    });

    render(<PrivateRoute />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should redirect to login when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      currentUser: null,
      hasPermission: () => false,
      permissionsLoading: false,
      userPermissions: [],
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
    });

    render(<PrivateRoute />);
    expect(Navigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/login' }),
      undefined,
    );
  });

  it('should redirect to home when user lacks required permission', () => {
    mockUseAuth.mockReturnValue({
      currentUser: mockUser,
      hasPermission: () => false,
      permissionsLoading: false,
      userPermissions: [],
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
    });

    render(<PrivateRoute requiredPermission="CreateProject" />);
    expect(Navigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/' }),
      undefined,
    );
  });

  it('should render component when user has required permission', () => {
    mockUseAuth.mockReturnValue({
      currentUser: mockUser,
      hasPermission: () => true,
      permissionsLoading: false,
      userPermissions: [mockPermission],
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
    });

    const TestComponent = () => <div>Test Component</div>;
    render(
      <PrivateRoute element={<TestComponent />} requiredPermission="Admin" />,
    );
    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });

  it('should render outlet when no component is provided', () => {
    mockUseAuth.mockReturnValue({
      currentUser: mockUser,
      hasPermission: () => true,
      permissionsLoading: false,
      userPermissions: [],
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
    });

    render(<PrivateRoute />);
    expect(Outlet).toHaveBeenCalled();
  });
});
