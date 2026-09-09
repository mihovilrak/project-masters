import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import UserForm from '../UserForm';
import { useUserForm } from '../../../hooks/user/useUserForm';
import { UserFormData } from '../../../types/user';
import { Role } from '../../../types/role';

// Mock the custom hook
jest.mock('../../../hooks/user/useUserForm');
const mockedUseUserForm = useUserForm as jest.MockedFunction<
  typeof useUserForm
>;

const mockRoles: Role[] = [
  { id: 1, name: 'Admin' },
  { id: 2, name: 'User' },
];

const defaultMockFormValues: UserFormData = {
  login: '',
  name: '',
  surname: '',
  email: '',
  password: '',
  currentPassword: '',
  confirmPassword: '',
  role_id: 1,
};

const mockHandleSubmit = jest
  .fn()
  .mockImplementation(async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    return Promise.resolve();
  });

describe('UserForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseUserForm.mockReturnValue({
      loading: false,
      error: null,
      fieldErrors: {},
      roles: mockRoles,
      formValues: defaultMockFormValues,
      handleInputChange: jest.fn(
        (e: React.ChangeEvent<HTMLInputElement>) => {},
      ),
      handleSubmit: mockHandleSubmit,
    });
  });

  const renderComponent = (path: string = '/users/new') => {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/users/new" element={<UserForm />} />
          <Route path="/users/:id/edit" element={<UserForm />} />
        </Routes>
      </MemoryRouter>,
    );
  };

  test('renders new user form correctly', () => {
    const { container } = renderComponent();
    expect(screen.getByText('Add New User')).toBeInTheDocument();
    expect(screen.getByLabelText(/login/i)).toBeInTheDocument();
    // Robust DOM queries for password fields
    expect(
      container.querySelector('input[name="password"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('input[name="confirmPassword"]'),
    ).toBeInTheDocument();
  });

  test('renders edit user form correctly', () => {
    mockedUseUserForm.mockReturnValue({
      loading: false,
      error: null,
      fieldErrors: {},
      roles: mockRoles,
      formValues: { ...defaultMockFormValues, name: 'John', surname: 'Doe' },
      handleInputChange: jest.fn(),
      handleSubmit: mockHandleSubmit,
    });

    renderComponent('/users/1/edit');
    const heading = screen.getByRole('heading', { level: 4 });
    expect(heading.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Edit User John Doe',
    );
  });

  test('displays error message when present', () => {
    const errorMessage = 'Test error message';
    mockedUseUserForm.mockReturnValue({
      loading: false,
      error: errorMessage,
      fieldErrors: {},
      roles: mockRoles,
      formValues: defaultMockFormValues,
      handleInputChange: jest.fn(),
      handleSubmit: jest
        .fn()
        .mockImplementation(async (e: React.FormEvent): Promise<void> => {
          e.preventDefault();
          return Promise.resolve();
        }),
    });

    renderComponent();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test('toggles password visibility', () => {
    const { container } = renderComponent();
    const passwordInput = container.querySelector('input[name="password"]');
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('type', 'password');
    const toggleButton = screen.getByTestId('toggle-password-visibility');
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
  });
});
