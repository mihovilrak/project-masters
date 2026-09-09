import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TypesAndRolesManager from '../TypesAndRolesManager';
import { useTypesAndRoles } from '../../../hooks/setting/useTypesAndRoles';
import userEvent from '@testing-library/user-event';
import { usePermission } from '../../../hooks/common/usePermission';

// Mock the custom hook
jest.mock('../../../hooks/setting/useTypesAndRoles');
jest.mock('../../../hooks/common/usePermission');

// Mock the child components
jest.mock('../TaskTypesTable', () => ({
  __esModule: true,
  default: () => <div data-testid="task-types-table">TaskTypesTable</div>,
}));

jest.mock('../ActivityTypesTable', () => ({
  __esModule: true,
  default: () => (
    <div data-testid="activity-types-table">ActivityTypesTable</div>
  ),
}));

jest.mock('../RolesTable', () => ({
  __esModule: true,
  default: () => <div data-testid="roles-table">RolesTable</div>,
}));

jest.mock('../TypesAndRolesDialog', () => ({
  __esModule: true,
  TypesAndRolesDialog: () => (
    <div data-testid="types-and-roles-dialog">Dialog</div>
  ),
}));

describe('TypesAndRolesManager', () => {
  const mockState = {
    activeTab: 0,
    taskTypes: [],
    activityTypes: [],
    roles: [],
    loading: false,
    error: null,
    dialogOpen: false,
    selectedItem: null,
  };

  const mockHandlers = {
    handleTabChange: jest.fn(),
    handleCreate: jest.fn(),
    handleEdit: jest.fn(),
    handleDialogClose: jest.fn(),
    handleSave: jest.fn(),
    handleDelete: jest.fn(),
    handleRoleUpdate: jest.fn(),
  };

  beforeEach(() => {
    (usePermission as jest.Mock).mockReturnValue({
      hasPermission: true,
      loading: false,
    });
    (useTypesAndRoles as jest.Mock).mockReturnValue({
      state: mockState,
      ...mockHandlers,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<TypesAndRolesManager />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('displays correct tabs', () => {
    render(<TypesAndRolesManager />);
    expect(screen.getByText('Task Types')).toBeInTheDocument();
    expect(screen.getByText('Activity Types')).toBeInTheDocument();
    expect(screen.getByText('Roles')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    (useTypesAndRoles as jest.Mock).mockReturnValue({
      state: { ...mockState, loading: true },
      ...mockHandlers,
    });

    render(<TypesAndRolesManager />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays error message when error exists', () => {
    const errorMessage = 'Test error message';
    (useTypesAndRoles as jest.Mock).mockReturnValue({
      state: { ...mockState, error: errorMessage },
      ...mockHandlers,
    });

    render(<TypesAndRolesManager />);
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders TaskTypesTable when activeTab is 0', () => {
    (useTypesAndRoles as jest.Mock).mockReturnValue({
      state: { ...mockState, activeTab: 0 },
      ...mockHandlers,
    });

    render(<TypesAndRolesManager />);
    expect(screen.getByTestId('task-types-table')).toBeInTheDocument();
  });

  it('renders ActivityTypesTable when activeTab is 1', () => {
    (useTypesAndRoles as jest.Mock).mockReturnValue({
      state: { ...mockState, activeTab: 1 },
      ...mockHandlers,
    });

    render(<TypesAndRolesManager />);
    expect(screen.getByTestId('activity-types-table')).toBeInTheDocument();
  });

  it('renders RolesTable when activeTab is 2', () => {
    (useTypesAndRoles as jest.Mock).mockReturnValue({
      state: { ...mockState, activeTab: 2 },
      ...mockHandlers,
    });

    render(<TypesAndRolesManager />);
    expect(screen.getByTestId('roles-table')).toBeInTheDocument();
  });

  it('calls handleTabChange when switching tabs', () => {
    render(<TypesAndRolesManager />);
    const activityTypesTab = screen.getByText('Activity Types');
    fireEvent.click(activityTypesTab);
    expect(mockHandlers.handleTabChange).toHaveBeenCalled();
  });

  it('shows correct add button text based on active tab', () => {
    const { rerender } = render(<TypesAndRolesManager />);

    // Task Types tab
    expect(screen.getByText('Add Task Type')).toBeInTheDocument();

    // Activity Types tab
    (useTypesAndRoles as jest.Mock).mockReturnValue({
      state: { ...mockState, activeTab: 1 },
      ...mockHandlers,
    });
    rerender(<TypesAndRolesManager />);
    expect(screen.getByText('Add Activity Type')).toBeInTheDocument();

    // Roles tab
    (useTypesAndRoles as jest.Mock).mockReturnValue({
      state: { ...mockState, activeTab: 2 },
      ...mockHandlers,
    });
    rerender(<TypesAndRolesManager />);
    expect(screen.getByText('Add Role')).toBeInTheDocument();
  });

  it('calls handleCreate when clicking add button', async () => {
    render(<TypesAndRolesManager />);
    const addButton = screen.getByText('Add Task Type');
    fireEvent.click(addButton);
    expect(mockHandlers.handleCreate).toHaveBeenCalled();
  });

  it('disables creation without Admin permission', () => {
    (usePermission as jest.Mock).mockReturnValue({
      hasPermission: false,
      loading: false,
    });

    render(<TypesAndRolesManager />);

    expect(screen.getByText('Add Task Type')).toBeDisabled();
  });

  it('renders TypesAndRolesDialog with correct props', () => {
    (useTypesAndRoles as jest.Mock).mockReturnValue({
      state: { ...mockState, dialogOpen: true },
      ...mockHandlers,
    });

    render(<TypesAndRolesManager />);
    expect(screen.getByTestId('types-and-roles-dialog')).toBeInTheDocument();
  });
});
