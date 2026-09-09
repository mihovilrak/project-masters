import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import TaskForm from '../TaskForm';
import { useAuth } from '../../../context/AuthContext';
import { useTaskForm } from '../../../hooks/task/useTaskForm';
import { SimpleChangeEvent, TaskFormState } from '../../../types/task';

jest.mock('../../../context/AuthContext');
jest.mock('../../../hooks/task/useTaskForm');

// Children that fetch on mount or render pickers are stubbed; the plain
// fields TaskForm renders itself are asserted through their real markup.
jest.mock('../TagSelect', () => ({
  __esModule: true,
  default: () => <div data-testid="tag-select" />,
}));
jest.mock('../TaskTypeSelect', () => ({
  __esModule: true,
  default: () => <div data-testid="task-type" />,
}));
jest.mock('../Form/DatePickerSection', () => ({
  DatePickerSection: () => <div data-testid="date-picker-section" />,
}));
jest.mock('../Form/AssigneeSelectionSection', () => ({
  AssigneeSelectionSection: () => (
    <div data-testid="assignee-selection-section" />
  ),
}));
jest.mock('../Form/ParentTaskSelect', () => ({
  ParentTaskSelect: () => <div data-testid="parent-task-select" />,
}));
jest.mock('../ProjectSelect', () => ({
  ProjectSelect: ({ handleChange, formData }: any) => (
    <select
      data-testid="project-select"
      name="project_id"
      value={formData?.project_id || ''}
      onChange={handleChange}
    >
      <option value="">Select Project</option>
      <option value="123">Project 123</option>
      <option value="456">Project 456</option>
      <option value="789">Project 789</option>
    </select>
  ),
}));

describe('TaskForm', () => {
  const mockHandleChange = jest.fn();
  const mockHandleSubmit = jest.fn();

  const defaultFormData: TaskFormState = {
    name: '',
    description: '',
    project_id: null,
    type_id: null,
    priority_id: null,
    status_id: null,
    parent_id: null,
    holder_id: null,
    assignee_id: null,
    start_date: null,
    due_date: null,
    estimated_time: null,
    progress: 0,
  };

  const mockTaskFormHook = {
    formData: defaultFormData,
    fieldErrors: {},
    projects: [],
    projectMembers: [],
    projectTasks: [],
    statuses: [],
    priorities: [],
    isEditing: false,
    isLoading: false,
    handleChange: mockHandleChange,
    handleSubmit: mockHandleSubmit,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      currentUser: { id: 1, name: 'Test User' },
    });
    (useTaskForm as jest.Mock).mockReturnValue(mockTaskFormHook);
  });

  const renderTaskForm = (path = '/tasks/new') => {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Routes>
            <Route path="/tasks/new" element={<TaskForm />} />
            <Route path="/tasks/:id" element={<TaskForm />} />
          </Routes>
        </LocalizationProvider>
      </MemoryRouter>,
    );
  };

  it('renders create task form correctly', () => {
    renderTaskForm();

    expect(
      screen.getByRole('heading', { name: 'Create Task' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Description/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Estimated Time/)).toBeInTheDocument();
    expect(screen.getByTestId('project-select')).toBeInTheDocument();
    expect(screen.getByTestId('date-picker-section')).toBeInTheDocument();
    expect(
      screen.getByTestId('assignee-selection-section'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('tag-select')).toBeInTheDocument();
    expect(screen.getByTestId('task-type')).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: /Priority/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: /Status/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Create Task' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
  });

  it('shows loading state when isLoading is true', () => {
    (useTaskForm as jest.Mock).mockReturnValue({
      ...mockTaskFormHook,
      isLoading: true,
    });

    renderTaskForm();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows edit form when editing existing task', () => {
    (useTaskForm as jest.Mock).mockReturnValue({
      ...mockTaskFormHook,
      isEditing: true,
    });

    renderTaskForm('/tasks/1');
    expect(screen.getByText('Edit Task')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Update Task' }),
    ).toBeInTheDocument();
  });

  it('renders the select error when the hook reports one', () => {
    (useTaskForm as jest.Mock).mockReturnValue({
      ...mockTaskFormHook,
      selectError: 'Could not load projects',
    });

    renderTaskForm();
    expect(screen.getByText('Could not load projects')).toBeInTheDocument();
  });

  it('shows the name validation error from the hook', () => {
    (useTaskForm as jest.Mock).mockReturnValue({
      ...mockTaskFormHook,
      fieldErrors: { name: 'Name is required' },
    });

    renderTaskForm();
    expect(screen.getByText('Name is required')).toBeInTheDocument();
  });

  it('handles form submission correctly', async () => {
    renderTaskForm();
    const form = screen.getByTestId('task-form');
    fireEvent.submit(form);
    await waitFor(() => {
      expect(mockHandleSubmit).toHaveBeenCalled();
    });
  });

  it('sets project ID from query parameters', () => {
    renderTaskForm('/tasks/new?projectId=123');

    expect(mockHandleChange).toHaveBeenCalledWith({
      target: {
        name: 'project_id',
        value: 123,
      },
    });
  });

  it('sets parent task ID from query parameters', () => {
    renderTaskForm('/tasks/new?parentId=456');

    expect(mockHandleChange).toHaveBeenCalledWith({
      target: {
        name: 'parent_id',
        value: 456,
      },
    });
  });

  it('shows progress field only when editing', () => {
    const { unmount } = renderTaskForm('/tasks/new');
    expect(screen.queryByLabelText(/^Progress/)).not.toBeInTheDocument();
    unmount();

    (useTaskForm as jest.Mock).mockReturnValue({
      ...mockTaskFormHook,
      isEditing: true,
      formData: { ...defaultFormData, progress: 40 },
    });
    renderTaskForm('/tasks/1');
    expect(screen.getByLabelText(/^Progress/)).toHaveValue(40);
  });

  it('renders the parent task select only once a project is chosen', () => {
    const { unmount } = renderTaskForm();
    expect(screen.queryByTestId('parent-task-select')).not.toBeInTheDocument();
    unmount();

    (useTaskForm as jest.Mock).mockReturnValue({
      ...mockTaskFormHook,
      formData: { ...defaultFormData, project_id: 123 },
    });
    renderTaskForm();
    expect(screen.getByTestId('parent-task-select')).toBeInTheDocument();
  });

  it('prevents project and parent task changes when IDs come from URL', () => {
    renderTaskForm('/tasks/new?projectId=123&parentId=456');

    const projectSelect = screen.getByTestId('project-select');
    fireEvent.change(projectSelect, {
      target: { name: 'project_id', value: 789 },
    });

    expect(mockHandleChange).not.toHaveBeenCalledWith({
      target: { name: 'project_id', value: 789 },
    });
  });

  it('handles form field changes correctly', () => {
    // The field is controlled, so React resets the DOM node before the
    // assertions run; read the event while the handler is on the stack.
    const seen: { name?: string; value?: unknown } = {};
    mockHandleChange.mockImplementation((e: SimpleChangeEvent) => {
      seen.name = e.target.name;
      seen.value = e.target.value;
    });

    const { unmount } = renderTaskForm();

    fireEvent.change(screen.getByLabelText(/^Name/), {
      target: { value: 'New Task' },
    });

    expect(mockHandleChange).toHaveBeenCalled();
    expect(seen.name).toBe('name');
    expect(seen.value).toBe('New Task');

    (useTaskForm as jest.Mock).mockReturnValue({
      ...mockTaskFormHook,
      formData: { ...defaultFormData, name: 'New Task' },
    });
    unmount();
    renderTaskForm();
    expect(screen.getByLabelText(/^Name/)).toHaveValue('New Task');
  });
});
