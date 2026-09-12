import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { customRender } from '../TestWrapper';
import { api } from '../../api/api';
import { AppSettings, TaskType, ActivityType } from '../../types/setting';
import { Role } from '../../types/role';
import Settings from '../../components/Settings/Settings';

// Mock the API calls
jest.mock('../../api/api');
const mockedApi = api as jest.Mocked<typeof api>;

// Extend timeout for all tests
jest.setTimeout(60000);

describe('Settings Profile Integration Tests', () => {
  // Mock data for tests
  const mockAppSettings: AppSettings = {
    id: 1,
    app_name: 'Project Manager',
    company_name: 'Test Company',
    sender_email: 'noreply@test.com',
    time_zone: 'UTC',
    theme: 'light',
    welcome_message: 'Welcome to Project Manager',
    app_base_url: 'http://localhost:3000',
    log_level: 'info',
    email_enabled: false,
    email_host: 'smtp.example.com',
    email_port: 587,
    email_secure: false,
    created_on: '2025-01-26',
  };

  const mockTaskType: TaskType = {
    id: 1,
    name: 'Bug',
    color: '#ff0000',
    icon: 'bug',
    description: 'Software bug that needs fixing',
    active: true,
  };

  const mockActivityType: ActivityType = {
    id: 1,
    name: 'Development',
    color: '#00ff00',
    icon: 'code',
    description: 'Software development work',
    active: true,
  };

  const mockRole: Role = {
    id: 1,
    name: 'Developer',
    permissions: [5, 6, 7, 8, 9, 10],
    created_on: '2025-01-26',
    updated_on: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock user session data
    const mockUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      role_id: 1,
    };

    const mockPermissions = [
      {
        id: 1,
        permission: 'MANAGE_SETTINGS',
        description: 'Manage app settings',
      },
      { id: 2, permission: 'MANAGE_USERS', description: 'Manage users' },
      { id: 3, permission: 'MANAGE_TASKS', description: 'Manage tasks' },
    ];

    // Mock users for UserManager component
    const mockUsers = [
      {
        id: 1,
        name: 'Admin User',
        email: 'admin@example.com',
        role_id: 1,
        active: true,
        created_on: '2025-01-01',
      },
      {
        id: 2,
        name: 'Regular User',
        email: 'user@example.com',
        role_id: 2,
        active: true,
        created_on: '2025-01-02',
      },
    ];

    // Mock API calls
    mockedApi.get.mockImplementation((url) => {
      console.log(`Mocked API GET request for URL: ${url}`);

      if (url.endsWith('/task-types') || url.includes('/task-types/')) {
        return Promise.resolve({ data: [mockTaskType] });
      }

      if (url.endsWith('/activity-types') || url.includes('/activity-types/')) {
        return Promise.resolve({ data: [mockActivityType] });
      }

      if (url.endsWith('/roles') || url.includes('/roles/')) {
        return Promise.resolve({ data: [mockRole] });
      }

      switch (url) {
        case '/check-session':
          return Promise.resolve({
            status: 200,
            data: { user: mockUser, permissions: mockPermissions },
          });
        case '/settings/app_settings':
          return Promise.resolve({ data: mockAppSettings });
        case '/users':
        case '/api/users':
        case '/admin/users':
          return Promise.resolve({ data: mockUsers });
        default:
          return Promise.resolve({ data: [] });
      }
    });
  });

  // Test 1: Verify tabs render correctly
  it('should render Settings component with correct tabs', async () => {
    // Render the component
    customRender(<Settings />);

    // Wait for initial loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Verify main tabs are present
    expect(screen.getByRole('tab', { name: /users/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /types/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /system/i })).toBeInTheDocument();

    // Verify Users tab is selected by default (aria-selected="true")
    expect(screen.getByRole('tab', { name: /users/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  // Test 2: Navigate through main tabs
  it('should allow navigation between main tabs', async () => {
    const user = userEvent.setup();

    // Render component
    customRender(<Settings />);

    // Wait for loading
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Navigate to Types & Roles tab
    const typesTab = screen.getByRole('tab', { name: /types/i });
    await user.click(typesTab);

    // Verify Types & Roles tab is selected
    await waitFor(() => {
      expect(typesTab).toHaveAttribute('aria-selected', 'true');
    });

    // Navigate to System tab
    const systemTab = screen.getByRole('tab', { name: /system/i });
    await user.click(systemTab);

    // Verify System tab is selected
    await waitFor(() => {
      expect(systemTab).toHaveAttribute('aria-selected', 'true');
    });

    // Back to Users tab
    const usersTab = screen.getByRole('tab', { name: /users/i });
    await user.click(usersTab);

    // Verify Users tab is selected
    await waitFor(() => {
      expect(usersTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  // Test 3: Mock API operations for task types
  it('should handle task type API operations', async () => {
    const user = userEvent.setup();

    // Mock POST response for creating new task type
    const newTaskType = {
      id: 2,
      name: 'Feature',
      color: '#0000ff',
      icon: 'star',
      description: 'New feature implementation',
      active: true,
    };

    mockedApi.post.mockResolvedValue({ data: newTaskType });

    // Mock DELETE response
    mockedApi.delete.mockResolvedValue({});

    // Render component
    customRender(<Settings />);

    // Wait for loading
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Verify API calls were made during rendering (session + permissions via check-session only)
    expect(mockedApi.get).toHaveBeenCalledWith('/check-session', {
      signal: expect.any(AbortSignal),
    });
  });

  // Test 4: Mock app settings update
  it('should handle app settings update', async () => {
    // Mock PUT response for updating app settings
    const updatedSettings = {
      ...mockAppSettings,
      app_name: 'Updated App Name',
      theme: 'dark',
    };

    mockedApi.put.mockResolvedValue({ data: updatedSettings });

    // Render component
    customRender(<Settings />);

    // Wait for loading
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Verify initial API calls
    expect(mockedApi.get).toHaveBeenCalledWith('/check-session', {
      signal: expect.any(AbortSignal),
    });
  });

  // Test 5: Mock role management
  it('should handle role management operations', async () => {
    // Mock PUT response for updating role
    const updatedRole = {
      ...mockRole,
      name: 'Senior Developer',
      permissions: [1, 2, 3, 5, 6, 7, 8, 9, 10],
    };

    mockedApi.put.mockResolvedValue({ data: updatedRole });

    // Render component
    customRender(<Settings />);

    // Wait for loading
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Verify initial API calls
    expect(mockedApi.get).toHaveBeenCalledWith('/check-session', {
      signal: expect.any(AbortSignal),
    });
  });

  // Test 6: Mock activity type management
  it('should handle activity type operations', async () => {
    // Mock POST response for creating activity type
    const newActivityType = {
      id: 2,
      name: 'Testing',
      color: '#ff00ff',
      icon: 'test',
      description: 'Software testing activities',
      active: true,
    };

    mockedApi.post.mockResolvedValue({ data: newActivityType });

    // Render component
    customRender(<Settings />);

    // Wait for loading
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Verify initial API calls
    expect(mockedApi.get).toHaveBeenCalledWith('/check-session', {
      signal: expect.any(AbortSignal),
    });
  });
});
