import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ProfileEditDialog from '../ProfileEditDialog';
import { updateProfile } from '../../../api/profiles';
import {
  ProfileFormData,
  ProfileData,
  ProfileEditDialogProps,
} from '../../../types/profile';

// Mock the API call
jest.mock('../../../api/profiles');
const mockUpdateProfile = updateProfile as jest.MockedFunction<
  typeof updateProfile
>;

describe('ProfileEditDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockProfile: ProfileData = {
    id: 1,
    name: 'John',
    surname: 'Doe',
    email: 'john@example.com',
    total_tasks: 10,
    completed_tasks: 5,
    active_projects: 2,
    total_hours: 100,
    login: 'johndoe',
    role_id: 1,
    status_id: 1,
    avatar_url: 'https://example.com/avatar.jpg',
    created_on: '2023-01-01T00:00:00Z',
    updated_on: '2023-01-01T00:00:00Z',
    last_login: '2023-01-01T00:00:00Z',
  };

  const mockProps: ProfileEditDialogProps = {
    open: true,
    onClose: jest.fn(),
    profile: mockProfile,
    onProfileUpdate: jest
      .fn()
      .mockImplementation(async (formData: ProfileFormData): Promise<void> => {
        return Promise.resolve();
      }),
  };

  test('renders with profile data', () => {
    render(<ProfileEditDialog {...mockProps} />);

    expect(screen.getByLabelText(/first name/i)).toHaveValue('John');
    expect(screen.getByLabelText(/last name/i)).toHaveValue('Doe');
    expect(screen.getByLabelText(/email/i)).toHaveValue('john@example.com');
  });

  test('handles form input changes', async () => {
    render(<ProfileEditDialog {...mockProps} />);

    const nameInput = screen.getByLabelText(/first name/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Jane');

    expect(nameInput).toHaveValue('Jane');
  });

  test('handles successful form submission', async () => {
    mockUpdateProfile.mockResolvedValueOnce(mockProfile);

    render(<ProfileEditDialog {...mockProps} />);

    const submitButton = screen.getByText(/save changes/i);
    await userEvent.click(submitButton);

    // Fix: Remove type coercion from waitFor
    await waitFor(() => {
      expect(mockProps.onProfileUpdate).toHaveBeenCalledWith(
        expect.any(Object),
      );
    });
  });

  test('handles submission error', async () => {
    // getApiErrorMessage reads response.data.error; fallback is 'Failed to update profile'
    mockUpdateProfile.mockRejectedValueOnce({
      response: { data: { error: 'Update failed' } },
    });

    render(<ProfileEditDialog {...mockProps} />);

    const submitButton = screen.getByText(/save changes/i);
    await fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument();
    });
  });

  test('disables submit button while loading', async () => {
    mockUpdateProfile.mockImplementationOnce(() => new Promise(() => {}));

    render(<ProfileEditDialog {...mockProps} />);

    const submitButton = screen.getByText(/save changes/i);
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();
  });

  test('closes on cancel', () => {
    render(<ProfileEditDialog {...mockProps} />);

    fireEvent.click(screen.getByText(/cancel/i));

    expect(mockProps.onClose).toHaveBeenCalledTimes(1);
  });

  test('updates form data when profile prop changes', () => {
    const { rerender } = render(<ProfileEditDialog {...mockProps} />);

    const updatedProfile: ProfileData = {
      ...mockProfile,
      name: 'Jane',
      surname: 'Smith',
    };

    rerender(<ProfileEditDialog {...mockProps} profile={updatedProfile} />);

    expect(screen.getByLabelText(/first name/i)).toHaveValue('Jane');
    expect(screen.getByLabelText(/last name/i)).toHaveValue('Smith');
  });

  test('handles email validation', async () => {
    render(<ProfileEditDialog {...mockProps} />);

    const emailInput = await screen.findByLabelText(
      /email/i,
      {},
      { timeout: 10000 },
    );
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, 'invalid-email');

    const submitButton = screen.getByText(/save changes/i);
    fireEvent.click(submitButton);

    await waitFor(
      () => {
        expect(emailInput).toBeInvalid();
      },
      { timeout: 10000 },
    );
  }, 15000);

  const createDeferred = <T,>() => {
    let resolve: ((value: T) => void) | undefined;
    const promise = new Promise<T>((_resolve) => {
      resolve = _resolve;
    });
    return { promise, resolve: resolve! };
  };

  test('maintains loading state during submission', async () => {
    const { promise, resolve } = createDeferred<ProfileData>();
    mockUpdateProfile.mockImplementationOnce(() => promise);

    render(<ProfileEditDialog {...mockProps} />);

    const submitButton = screen.getByText(/save changes/i);
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();
    resolve(mockProfile);

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  test('preserves form data on failed submission', async () => {
    mockUpdateProfile.mockRejectedValueOnce(new Error('Network error'));

    render(<ProfileEditDialog {...mockProps} />);

    const nameInput = screen.getByLabelText(/first name/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Jane');

    const submitButton = screen.getByText(/save changes/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(nameInput).toHaveValue('Jane');
    });
  });

  test('closes dialog when cancel is clicked', () => {
    render(<ProfileEditDialog {...mockProps} />);

    const cancelButton = screen.getByText(/cancel/i);
    fireEvent.click(cancelButton);

    expect(mockProps.onClose).toHaveBeenCalledTimes(1);
  });

  test('validates required fields', async () => {
    render(<ProfileEditDialog {...mockProps} />);

    const nameInput = screen.getByLabelText(/first name/i);
    await userEvent.clear(nameInput);

    const submitButton = screen.getByText(/save changes/i);
    await fireEvent.click(submitButton);

    expect(nameInput).toBeInvalid();
  });
});
