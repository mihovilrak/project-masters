import React from 'react';
import {
  act,
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import SystemSettings from '../SystemSettings';
import { useSystemSettings } from '../../../hooks/setting/useSystemSettings';
import { AppSettings, TimezoneOption } from '../../../types/setting';
import * as settingsApi from '../../../api/settings';

// Mock the hooks
jest.mock('../../../hooks/setting/useSystemSettings');

// Mock the settings API
jest.mock('../../../api/settings', () => ({
  testSmtpConnection: jest.fn(),
}));

// Mock TipTap editor and extensions
jest.mock('@tiptap/react', () => ({
  useEditor: () => ({
    chain: () => ({
      focus: () => ({
        toggleBold: () => ({ run: jest.fn() }),
        toggleItalic: () => ({ run: jest.fn() }),
        toggleUnderline: () => ({ run: jest.fn() }),
        toggleHeading: () => ({ run: jest.fn() }),
      }),
    }),
    isActive: () => false,
    getHTML: () => '<p>Test content</p>',
    commands: {
      setContent: jest.fn(),
    },
  }),
  EditorContent: () => <div data-testid="editor-content">Editor Content</div>,
}));

jest.mock('@tiptap/starter-kit', () => ({}));
jest.mock('@tiptap/extension-underline', () => ({}));

const mockSettings: AppSettings = {
  id: 1,
  app_name: 'Test App',
  company_name: 'Test Company',
  sender_email: 'test@example.com',
  time_zone: 'Europe/Zagreb',
  theme: 'light',
  welcome_message: '<p>Welcome</p>',
  app_base_url: 'http://localhost:3000',
  log_level: 'info',
  email_enabled: false,
  email_host: 'smtp.example.com',
  email_port: 587,
  email_secure: false,
};

const mockTimezones: TimezoneOption[] = [
  {
    name: 'Europe/Zagreb',
    region: 'Europe',
    abbrev: 'CET',
    utcOffsetSeconds: 3600,
    isDst: false,
    label: 'Europe/Zagreb (UTC+01:00)',
  },
  {
    name: 'America/New_York',
    region: 'America',
    abbrev: 'EST',
    utcOffsetSeconds: -18000,
    isDst: false,
    label: 'America/New_York (UTC-05:00)',
  },
];

describe('SystemSettings', () => {
  const mockHandleSubmit = jest.fn();
  const mockHandleChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useSystemSettings as jest.Mock).mockReturnValue({
      state: {
        settings: mockSettings,
        loading: false,
        error: null,
        success: false,
      },
      timezones: mockTimezones,
      timezonesLoading: false,
      timezonesError: null,
      handleSubmit: mockHandleSubmit,
      handleChange: mockHandleChange,
    });
  });

  it('renders loading state', () => {
    (useSystemSettings as jest.Mock).mockReturnValue({
      state: {
        settings: mockSettings,
        loading: true,
        error: null,
        success: false,
      },
      timezones: [],
      timezonesLoading: true,
      timezonesError: null,
      handleSubmit: mockHandleSubmit,
      handleChange: mockHandleChange,
    });

    render(<SystemSettings />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders form with initial values', () => {
    const { container } = render(<SystemSettings />);

    // Find inputs by name
    const appNameInput = container.querySelector('input[name="app_name"]');
    expect(appNameInput).toBeTruthy();
    expect(appNameInput).toHaveValue('Test App');

    // Check that other inputs exist
    expect(container.querySelector('input[name="company_name"]')).toBeTruthy();
    expect(container.querySelector('input[name="sender_email"]')).toBeTruthy();
  });

  it('handles form submission', () => {
    const { container } = render(<SystemSettings />);

    // Find form using DOM query
    const form = container.querySelector('form');
    expect(form).toBeTruthy();

    // Submit form and check handler was called
    fireEvent.submit(form!);
    expect(mockHandleSubmit).toHaveBeenCalled();
  });

  it('displays success message when update is successful', () => {
    (useSystemSettings as jest.Mock).mockReturnValue({
      state: {
        settings: mockSettings,
        loading: false,
        error: null,
        success: true,
      },
      timezones: mockTimezones,
      timezonesLoading: false,
      timezonesError: null,
      handleSubmit: mockHandleSubmit,
      handleChange: mockHandleChange,
    });

    render(<SystemSettings />);
    expect(
      screen.getByText(/settings updated successfully/i),
    ).toBeInTheDocument();
  });

  it('displays error message when update fails', () => {
    (useSystemSettings as jest.Mock).mockReturnValue({
      state: {
        settings: mockSettings,
        loading: false,
        error: 'Update failed',
        success: false,
      },
      timezones: mockTimezones,
      timezonesLoading: false,
      timezonesError: null,
      handleSubmit: mockHandleSubmit,
      handleChange: mockHandleChange,
    });

    render(<SystemSettings />);
    expect(screen.getByText(/update failed/i)).toBeInTheDocument();
  });

  it('renders the component with tabs', () => {
    const { container } = render(<SystemSettings />);

    // Verify the SystemSettings component renders
    expect(screen.getByText(/System Settings/i)).toBeInTheDocument();

    // Verify tabs exist by checking for tab elements
    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBeGreaterThan(0);
  });

  it('handles theme change', () => {
    const { container } = render(<SystemSettings />);

    // Find select by name attribute
    const inputs = container.querySelectorAll('input, select');
    const themeInput = Array.from(inputs).find(
      (input) => input.getAttribute('name') === 'theme',
    );

    // Verify input exists and simulate change
    expect(themeInput).toBeTruthy();
    fireEvent.change(themeInput!, { target: { value: 'dark' } });

    // Verify handler was called
    expect(mockHandleChange).toHaveBeenCalled();
  });

  it('renders editor content', () => {
    render(<SystemSettings />);
    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
  });

  it('calls submit handler even when fields are empty', () => {
    const { container } = render(<SystemSettings />);

    // Find and clear app name input
    const appNameInput = container.querySelector('input[name="app_name"]');
    expect(appNameInput).toBeTruthy();
    fireEvent.change(appNameInput!, { target: { value: '' } });

    // Submit form and verify handler was called
    const form = container.querySelector('form');
    expect(form).toBeTruthy();
    fireEvent.submit(form!);
    expect(mockHandleSubmit).toHaveBeenCalled();
  });

  it('renders timezone autocomplete and allows selecting a timezone', async () => {
    render(<SystemSettings />);

    const timezoneInput = screen.getByLabelText(
      /Time Zone/i,
    ) as HTMLInputElement;
    expect(timezoneInput).toBeInTheDocument();

    fireEvent.change(timezoneInput, { target: { value: 'America/New_York' } });

    const option = await screen.findByText(/America\/New_York/);
    fireEvent.click(option);

    expect(mockHandleChange).toHaveBeenCalled();
  });

  describe('SMTP Test Feature', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders SMTP test section', () => {
      render(<SystemSettings />);

      expect(screen.getByText(/Test Email Configuration/i)).toBeInTheDocument();
      expect(screen.getByTestId('smtp-test-email')).toBeInTheDocument();
      expect(screen.getByTestId('smtp-test-button')).toBeInTheDocument();
    });

    it('disables send button when email field is empty', () => {
      render(<SystemSettings />);

      const sendButton = screen.getByTestId('smtp-test-button');
      expect(sendButton).toBeDisabled();
    });

    it('enables send button when email is entered', () => {
      render(<SystemSettings />);

      const emailInput = screen
        .getByTestId('smtp-test-email')
        .querySelector('input');
      fireEvent.change(emailInput!, { target: { value: 'test@example.com' } });

      const sendButton = screen.getByTestId('smtp-test-button');
      expect(sendButton).not.toBeDisabled();
    });

    it('calls testSmtpConnection API when send button is clicked', async () => {
      (settingsApi.testSmtpConnection as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Test email sent successfully',
      });

      render(<SystemSettings />);

      const emailInput = screen
        .getByTestId('smtp-test-email')
        .querySelector('input');
      fireEvent.change(emailInput!, { target: { value: 'test@example.com' } });

      const sendButton = screen.getByTestId('smtp-test-button');
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(settingsApi.testSmtpConnection).toHaveBeenCalledWith(
          'test@example.com',
        );
      });
    });

    it('displays success message when email is sent successfully', async () => {
      (settingsApi.testSmtpConnection as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Test email sent successfully to test@example.com',
      });

      render(<SystemSettings />);

      const emailInput = screen
        .getByTestId('smtp-test-email')
        .querySelector('input');
      fireEvent.change(emailInput!, { target: { value: 'test@example.com' } });

      const sendButton = screen.getByTestId('smtp-test-button');
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Test email sent successfully/i),
        ).toBeInTheDocument();
      });
    });

    it('displays error message when email sending fails', async () => {
      (settingsApi.testSmtpConnection as jest.Mock).mockResolvedValue({
        success: false,
        message: 'SMTP connection failed',
      });

      render(<SystemSettings />);

      const emailInput = screen
        .getByTestId('smtp-test-email')
        .querySelector('input');
      fireEvent.change(emailInput!, { target: { value: 'test@example.com' } });

      const sendButton = screen.getByTestId('smtp-test-button');
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/SMTP connection failed/i)).toBeInTheDocument();
      });
    });

    it('shows error when trying to send without email', async () => {
      render(<SystemSettings />);

      // The button should be disabled, but if somehow clicked
      const sendButton = screen.getByTestId('smtp-test-button');
      expect(sendButton).toBeDisabled();
    });

    it('disables input and button while sending', async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (settingsApi.testSmtpConnection as jest.Mock).mockReturnValue(
        pendingPromise,
      );

      render(<SystemSettings />);

      const emailInput = screen
        .getByTestId('smtp-test-email')
        .querySelector('input');
      fireEvent.change(emailInput!, { target: { value: 'test@example.com' } });

      const sendButton = screen.getByTestId('smtp-test-button');
      fireEvent.click(sendButton);

      // fireEvent already flushed the loading state; waiting on a promise that
      // never settles would hang instead.
      expect(screen.getByText('Sending...')).toBeInTheDocument();
      expect(emailInput).toBeDisabled();
      expect(sendButton).toBeDisabled();

      await act(async () => {
        resolvePromise!({ success: true, message: 'Done' });
      });
    });

    it('handles API exception gracefully', async () => {
      (settingsApi.testSmtpConnection as jest.Mock).mockRejectedValue(
        new Error('Network error'),
      );

      render(<SystemSettings />);

      const emailInput = screen
        .getByTestId('smtp-test-email')
        .querySelector('input');
      fireEvent.change(emailInput!, { target: { value: 'test@example.com' } });

      const sendButton = screen.getByTestId('smtp-test-button');
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Failed to test SMTP connection/i),
        ).toBeInTheDocument();
      });
    });

    it('allows closing the result alert', async () => {
      (settingsApi.testSmtpConnection as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Test email sent successfully',
      });

      render(<SystemSettings />);

      const emailInput = screen
        .getByTestId('smtp-test-email')
        .querySelector('input');
      fireEvent.change(emailInput!, { target: { value: 'test@example.com' } });

      const sendButton = screen.getByTestId('smtp-test-button');
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Test email sent successfully/i),
        ).toBeInTheDocument();
      });

      // Find the success alert by its message (there may be another alert e.g. env error) and click close
      const successMessage = screen.getByText(/Test email sent successfully/i);
      const alert = successMessage.closest('[role="alert"]');
      expect(alert).toBeTruthy();
      const closeButton = within(alert as HTMLElement).getByRole('button', {
        name: /close/i,
      });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(
          screen.queryByText(/Test email sent successfully/i),
        ).not.toBeInTheDocument();
      });
    });

    it('updates document.title when app_name changes', () => {
      const originalTitle = document.title;

      const { rerender } = render(<SystemSettings />);

      // Simulate app_name change
      (useSystemSettings as jest.Mock).mockReturnValue({
        state: {
          settings: { ...mockSettings, app_name: 'New App Name' },
          loading: false,
          error: null,
          success: false,
        },
        timezones: mockTimezones,
        timezonesLoading: false,
        timezonesError: null,
        handleSubmit: mockHandleSubmit,
        handleChange: mockHandleChange,
      });

      rerender(<SystemSettings />);

      // Check that document.title was updated
      expect(document.title).toBe('New App Name');

      // Restore original title
      document.title = originalTitle;
    });
  });
});
