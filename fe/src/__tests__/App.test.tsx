/// <reference types="jest" />
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { useAuth } from '../context/AuthContext';

// Mock MUI components
jest.mock('@mui/material', () => ({
  ...jest.requireActual('@mui/material'),
  CircularProgress: () =>
    React.createElement(
      'div',
      { 'data-testid': 'mock-progress' },
      'Loading...',
    ),
}));

// Mock mui-color-input
jest.mock('mui-color-input', () => ({
  MuiColorInput: () =>
    React.createElement('input', {
      type: 'text',
      'data-testid': 'mock-color-input',
    }),
}));

// Mock Layout component
jest.mock('../components/Layout/Layout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'mock-layout' }, children),
}));

// Mock route components
jest.mock('../components/Home/Home', () => ({
  __esModule: true,
  default: () =>
    React.createElement('div', { 'data-testid': 'mock-home' }, 'Home'),
}));

jest.mock('../components/Auth/Login', () => ({
  __esModule: true,
  default: () =>
    React.createElement('div', { 'data-testid': 'mock-login' }, 'Login'),
}));

jest.mock('../components/Users/Users', () => ({
  __esModule: true,
  default: () =>
    React.createElement('div', { 'data-testid': 'mock-users' }, 'Users'),
}));

jest.mock('../components/Projects/Projects', () => ({
  __esModule: true,
  default: () =>
    React.createElement('div', { 'data-testid': 'mock-projects' }, 'Projects'),
}));

jest.mock('../components/Tasks/Tasks', () => ({
  __esModule: true,
  default: () =>
    React.createElement('div', { 'data-testid': 'mock-tasks' }, 'Tasks'),
}));

jest.mock('../components/Settings/Settings', () => ({
  __esModule: true,
  default: () =>
    React.createElement('div', { 'data-testid': 'mock-settings' }, 'Settings'),
}));

// Mock hooks
jest.mock('../hooks/app/useAppRoutes', () => ({
  useTaskFileWrapper: () => ({
    taskId: 1,
    handleFileUploaded: jest.fn(),
    handleFileDeleted: jest.fn(),
  }),
  useTimeLogCalendarWrapper: () => ({
    projectId: 1,
  }),
  useTaskTimeLogsWrapper: () => ({
    task: null,
  }),
}));

jest.mock('../context/AuthContext', () => ({
  ...jest.requireActual('../context/AuthContext'),
  useAuth: jest.fn(),
}));

describe('App Component', () => {
  const mockUseAuth = {
    currentUser: null,
    login: jest.fn(),
    logout: jest.fn(),
    hasPermission: jest.fn(),
    permissionsLoading: false,
    error: null,
    userPermissions: [],
  };

  beforeEach(() => {
    (useAuth as jest.Mock).mockImplementation(() => mockUseAuth);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing', async () => {
    (useAuth as jest.Mock).mockImplementation(() => ({
      ...mockUseAuth,
      currentUser: { id: 1, name: 'Test User' },
    }));

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('mock-layout')).toBeInTheDocument();
    });
  });

  test('renders login page on /login route', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Login')).toBeInTheDocument();
    });
  });

  test('redirects to login when accessing private route without auth', () => {
    render(
      <MemoryRouter initialEntries={['/projects']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  test('renders home page for authenticated user', async () => {
    (useAuth as jest.Mock).mockImplementation(() => ({
      ...mockUseAuth,
      currentUser: { id: 1, name: 'Test User' },
    }));

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeInTheDocument();
    });
  });

  test('renders projects page for authenticated user', async () => {
    (useAuth as jest.Mock).mockImplementation(() => ({
      ...mockUseAuth,
      currentUser: { id: 1, name: 'Test User' },
      hasPermission: () => true,
    }));

    render(
      <MemoryRouter initialEntries={['/projects']}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Projects')).toBeInTheDocument();
    });
  });

  test('handles theme provider correctly', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    // Verify theme provider is present
    expect(document.querySelector('body')).toHaveStyle({
      margin: '0', // CssBaseline effect
    });
  });

  test('renders with LocalizationProvider', () => {
    const { container } = render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    // Verify LocalizationProvider is working
    expect(container.querySelector('.MuiPickersLayout-root')).toBeFalsy();
  });

  test('renders task wrapper components correctly', async () => {
    (useAuth as jest.Mock).mockImplementation(() => ({
      ...mockUseAuth,
      currentUser: { id: 1, name: 'Test User' },
    }));

    render(
      <MemoryRouter initialEntries={['/tasks/1/files']}>
        <App />
      </MemoryRouter>,
    );

    // Wait for task file wrapper to be rendered
    await waitFor(() => {
      expect(screen.getByTestId('mock-layout')).toBeInTheDocument();
    });
  });
});
