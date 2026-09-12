import React from 'react';
import {
  render,
  screen,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import Home from '../Home';
import { useSystemSettings } from '../../../hooks/setting/useSystemSettings';
import { SystemSettingsState } from '../../../types/setting';
import { BrowserRouter } from 'react-router-dom';
import { getActiveTasks } from '../../../api/tasks';
import { ThemeProvider, createTheme } from '@mui/material';
import AuthProvider from '../../../context/AuthContext';

jest.mock('../../../hooks/setting/useSystemSettings');
jest.mock('../../../api/tasks');

const mockGetActiveTasks = getActiveTasks as jest.MockedFunction<
  typeof getActiveTasks
>;
const mockTheme = createTheme();

const DEFAULT_SETTINGS: SystemSettingsState = {
  settings: {
    id: 1,
    app_name: 'Test App',
    company_name: 'Test Company',
    sender_email: 'test@example.com',
    time_zone: 'UTC',
    theme: 'light',
    welcome_message: '',
    app_base_url: 'http://localhost:3000',
    log_level: 'info',
    email_enabled: false,
    email_host: 'smtp.example.com',
    email_port: 587,
    email_secure: false,
    created_on: '2023-01-01',
    updated_on: '2023-01-01',
  },
  loading: false,
  error: null,
  success: false,
};

describe('Home', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActiveTasks.mockResolvedValue([]);
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <ThemeProvider theme={mockTheme}>
          <AuthProvider>{component}</AuthProvider>
        </ThemeProvider>
      </BrowserRouter>,
    );
  };

  it('renders without welcome message when not provided', async () => {
    const mockUseSystemSettings = useSystemSettings as jest.MockedFunction<
      typeof useSystemSettings
    >;
    mockUseSystemSettings.mockReturnValue({
      state: {
        ...DEFAULT_SETTINGS,
        settings: {
          ...DEFAULT_SETTINGS.settings,
          welcome_message: '',
        },
      },
      timezones: [],
      timezonesLoading: false,
      timezonesError: null,
      handleSubmit: jest.fn(),
      handleChange: jest.fn(),
      setField: jest.fn(),
    });

    renderWithProviders(<Home />);

    await waitForElementToBeRemoved(() => screen.queryByRole('progressbar'));
    // Check that there's no welcome message content
    expect(screen.queryByTestId('welcome-message')).not.toBeInTheDocument();
    expect(screen.getByTestId('active-tasks')).toBeInTheDocument();
  });

  it('renders welcome message when provided', async () => {
    const mockUseSystemSettings = useSystemSettings as jest.MockedFunction<
      typeof useSystemSettings
    >;
    const testMessage = '<h1>Welcome</h1><p>Test message</p>';
    mockUseSystemSettings.mockReturnValue({
      state: {
        ...DEFAULT_SETTINGS,
        settings: {
          ...DEFAULT_SETTINGS.settings,
          welcome_message: testMessage,
        },
      },
      timezones: [],
      timezonesLoading: false,
      timezonesError: null,
      handleSubmit: jest.fn(),
      handleChange: jest.fn(),
      setField: jest.fn(),
    });

    renderWithProviders(<Home />);

    await waitForElementToBeRemoved(() => screen.queryByRole('progressbar'));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Welcome',
    );
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders welcome message with correct HTML structure', async () => {
    const mockUseSystemSettings = useSystemSettings as jest.MockedFunction<
      typeof useSystemSettings
    >;
    const testMessage = '<h1>Title</h1><h2>Subtitle</h2><h3>Section</h3>';
    mockUseSystemSettings.mockReturnValue({
      state: {
        ...DEFAULT_SETTINGS,
        settings: {
          ...DEFAULT_SETTINGS.settings,
          welcome_message: testMessage,
        },
      },
      timezones: [],
      timezonesLoading: false,
      timezonesError: null,
      handleSubmit: jest.fn(),
      handleChange: jest.fn(),
      setField: jest.fn(),
    });

    renderWithProviders(<Home />);

    await waitForElementToBeRemoved(() => screen.queryByRole('progressbar'));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Title',
    );
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Subtitle',
    );
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
      'Section',
    );
  });

  it('renders ActiveTasks component', async () => {
    const mockUseSystemSettings = useSystemSettings as jest.MockedFunction<
      typeof useSystemSettings
    >;
    mockUseSystemSettings.mockReturnValue({
      state: {
        ...DEFAULT_SETTINGS,
        settings: {
          ...DEFAULT_SETTINGS.settings,
          welcome_message: '',
        },
      },
      timezones: [],
      timezonesLoading: false,
      timezonesError: null,
      handleSubmit: jest.fn(),
      handleChange: jest.fn(),
      setField: jest.fn(),
    });

    renderWithProviders(<Home />);

    await waitForElementToBeRemoved(() => screen.queryByRole('progressbar'));
    expect(screen.getByTestId('active-tasks')).toBeInTheDocument();
  });

  it('sanitizes HTML in welcome message', async () => {
    const mockUseSystemSettings = useSystemSettings as jest.MockedFunction<
      typeof useSystemSettings
    >;
    const unsafeMessage = '<h1>Safe</h1><script>alert("unsafe")</script>';
    mockUseSystemSettings.mockReturnValue({
      state: {
        ...DEFAULT_SETTINGS,
        settings: {
          ...DEFAULT_SETTINGS.settings,
          welcome_message: unsafeMessage,
        },
      },
      timezones: [],
      timezonesLoading: false,
      timezonesError: null,
      handleSubmit: jest.fn(),
      handleChange: jest.fn(),
      setField: jest.fn(),
    });

    renderWithProviders(<Home />);

    await waitForElementToBeRemoved(() => screen.queryByRole('progressbar'));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Safe');
    expect(screen.queryByText('alert("unsafe")')).not.toBeInTheDocument();
  });
});
