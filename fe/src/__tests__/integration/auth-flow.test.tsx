import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../../components/Auth/Login';
import { TestWrapper } from '../TestWrapper';
import { server } from '../mocks/server';
import { defaultUser, defaultPermissions } from '../mocks/handlers';
import { http, HttpResponse } from 'msw';

describe('Authentication Flow', () => {
  beforeEach(() => {
    // Reset handlers to defaults before each test
    server.resetHandlers();
  });

  it('should handle login flow correctly', async () => {
    const user = userEvent.setup();

    // Override login handler for successful login
    server.use(
      http.post('/api/login', async ({ request }) => {
        const body = (await request.json()) as {
          login: string;
          password: string;
        };
        if (body.login === 'testuser' && body.password === 'password123') {
          return HttpResponse.json({ user: defaultUser });
        }
        return HttpResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 },
        );
      }),
    );

    render(
      <TestWrapper>
        <Login />
      </TestWrapper>,
    );

    // Wait for initial loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Get form elements
    const loginInput = screen.getByTestId('login-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitButton = screen.getByTestId('login-submit');

    // Fill in the form
    await user.type(loginInput, 'testuser');
    await user.type(passwordInput, 'password123');

    // Submit the form
    await user.click(submitButton);

    // Wait for navigation to root (/) as per useLogin hook
    await waitFor(
      () => {
        expect(window.location.pathname).toBe('/');
      },
      { timeout: 3000 },
    );
  });

  it('should display error message for invalid credentials', async () => {
    const user = userEvent.setup();

    // Override login handler to return 401
    server.use(
      http.post('/api/login', () =>
        HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 }),
      ),
    );

    render(
      <TestWrapper>
        <Login />
      </TestWrapper>,
    );

    // Wait for initial loading
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    const loginInput = screen.getByTestId('login-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitButton = screen.getByTestId('login-submit');

    // Fill in the form with wrong credentials
    await user.type(loginInput, 'wronguser');
    await user.type(passwordInput, 'wrongpass');
    await user.click(submitButton);

    // Wait for error message to appear
    await waitFor(() => {
      const errorElem = screen.getByTestId('login-error');
      expect(errorElem).toBeInTheDocument();
      expect(errorElem.textContent).not.toBe('');
    });
  });

  it('should validate required fields', async () => {
    render(
      <TestWrapper>
        <Login />
      </TestWrapper>,
    );

    const submitButton = screen.getByTestId('login-submit');
    fireEvent.click(submitButton);

    // Check if form validation prevents submission of empty fields
    expect(screen.getByTestId('login-input')).toBeRequired();
    expect(screen.getByTestId('password-input')).toBeRequired();
  });

  it('should toggle password visibility', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <Login />
      </TestWrapper>,
    );

    const passwordInput = screen.getByTestId('password-input');
    const toggleButton = screen.getByTestId('toggle-password-visibility');

    // Password should be hidden by default
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Click toggle button
    await user.click(toggleButton);

    // Password should be visible
    expect(passwordInput).toHaveAttribute('type', 'text');

    // Click toggle button again
    await user.click(toggleButton);

    // Password should be hidden again
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('should handle network errors', async () => {
    const user = userEvent.setup();

    // Override login handler to simulate network error
    server.use(
      http.post('/api/login', () => HttpResponse.error()),
    );

    render(
      <TestWrapper>
        <Login />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    const loginInput = screen.getByTestId('login-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitButton = screen.getByTestId('login-submit');

    await user.type(loginInput, 'testuser');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    // Should display error message
    await waitFor(() => {
      const errorElem = screen.getByTestId('login-error');
      expect(errorElem).toBeInTheDocument();
    });
  });

  it('should handle 500 server error', async () => {
    const user = userEvent.setup();

    // Override login handler to return 500
    server.use(
      http.post('/api/login', () =>
        HttpResponse.json({ error: 'Internal server error' }, { status: 500 }),
      ),
    );

    render(
      <TestWrapper>
        <Login />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    const loginInput = screen.getByTestId('login-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitButton = screen.getByTestId('login-submit');

    await user.type(loginInput, 'testuser');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    // Should display error message
    await waitFor(() => {
      const errorElem = screen.getByTestId('login-error');
      expect(errorElem).toBeInTheDocument();
    });
  });

  it('should handle empty credentials', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <Login />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    const submitButton = screen.getByTestId('login-submit');
    const loginInput = screen.getByTestId('login-input');
    const passwordInput = screen.getByTestId('password-input');

    // Try to submit with empty fields
    await user.click(submitButton);

    // Form validation should prevent submission
    expect(loginInput).toBeRequired();
    expect(passwordInput).toBeRequired();
  });
});
