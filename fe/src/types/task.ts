import { SelectChangeEvent } from '@mui/material';
import { Tag } from './tag';
import { TimeLog, TimeLogCreate } from './timeLog';
import { Comment } from './comment';
import { TaskFile } from './file';
import { ProjectMember } from './project';

export interface Task {
  id: number;
  name: string;
  project_id: number;
  project_name: string;
  holder_id?: number;
  holder_name?: string;
  assignee_id?: number;
  assignee_name?: string;
  parent_id: number | null;
  parent_name: string | null;
  description: string;
  type_id: number;
  type_name: string;
  type_color?: string;
  type_icon?: string;
  status_id: number;
  status_name: string;
  status_color?: string;
  priority_id: number;
  priority_name: string;
  priority_color?: string;
  start_date: string | null;
  due_date: string | null;
  end_date?: string | null;
  spent_time: number;
  progress: number;
  created_by: number;
  created_by_name: string;
  created_on: string;
  estimated_time: number | null;
}

export interface TaskCoreState {
  task: Task | null;
  subtasks: Task[];
  statuses: TaskStatus[];
  loading: boolean;
  error: string | null;
}

export interface TaskFilters {
  id?: number;
  project_id?: number | string;
  assignee_id?: number | string;
  holder_id?: number | string;
  status_id?: number | string;
  priority_id?: number | string;
  type_id?: number | string;
  parent_id?: number;
  created_by?: number | string;
  due_date_from?: string;
  due_date_to?: string;
  start_date_from?: string;
  start_date_to?: string;
  created_from?: string;
  created_to?: string;
  estimated_time_min?: number;
  estimated_time_max?: number;
  inactive_statuses_only?: boolean | 0 | 1;
  active_statuses_only?: boolean | 0 | 1;
  status?: number;
  priority?: number;
  assignee?: number;
  holder?: number;
  type?: number;
  project?: number;
  search?: string;
}

export interface TaskType {
  id: number;
  name: string;
  description?: string | null;
  color: string;
  icon?: string | null;
  created_on?: string;
  updated_on?: string | null;
  active?: boolean;
}

export interface TaskStatus {
  id: number;
  name: string;
  color: string;
  description: string | null;
  active: boolean;
  created_on: string;
  updated_on: string | null;
}

export interface TaskPriority {
  id: number;
  name: string;
  color: string;
  description: string | null;
  active: boolean;
  created_on: string;
  updated_on: string | null;
}

export interface TaskFormProps {
  taskId?: string;
  projectId: number;
  open: boolean;
  onClose: () => void;
  onCreated: (task: Task) => Promise<void>;
}

export interface TaskTypeSelectProps {
  value: number;
  onChange: (event: SelectChangeEvent<number>) => void;
  error?: boolean;
  required?: boolean;
}

export interface SubtaskListProps {
  subtasks: Task[];
  parentTaskId: number;
  onSubtaskUpdated: (subtaskId: number, updatedSubtask: Task) => void;
  onSubtaskDeleted: (subtaskId: number) => void;
}

export interface TaskFormState {
  name: string;
  description: string;
  project_id: number | null;
  type_id: number | null;
  priority_id: number | null;
  status_id: number | null;
  parent_id: number | null;
  holder_id: number | null;
  assignee_id: number | null;
  start_date: string | null;
  due_date: string | null;
  estimated_time: number | null;
  progress?: number;
  created_by?: number;
  tags?: Tag[];
}

export interface TaskTimeLogsProps {
  task: Task;
}

export interface TaskHeaderProps {
  task: Task | null;
  statuses: TaskStatus[];
  canEdit: boolean;
  canDelete: boolean;
  statusMenuAnchor: HTMLElement | null;
  onStatusMenuClick: (event: React.MouseEvent<HTMLElement>) => void;
  onStatusMenuClose: () => void;
  onStatusChange: (statusId: number) => void;
  onDelete: () => void;
  onTimeLogClick: () => void;
  onAddSubtaskClick: () => void;
}

export interface TaskDetailsHeaderProps extends TaskHeaderProps {
  task: Task;
  statuses: TaskStatus[];
  statusMenuAnchor: HTMLElement | null;
  onStatusMenuClick: (event: React.MouseEvent<HTMLElement>) => void;
  onStatusMenuClose: () => void;
  onStatusChange: (statusId: number) => void;
  onDelete: () => void;
}

export interface TaskDetailsContentProps {
  id: string;
  task: Task;
  subtasks: Task[];
  timeLogs: TimeLog[];
  comments: Comment[];
  timeLogDialogOpen: boolean;
  selectedTimeLog: TimeLog | null;
  editingComment: Comment | null;
  onSubtaskDeleted: (subtaskId: number) => void;
  onSubtaskUpdated: (subtaskId: number, updatedSubtask: Task) => void;
  onTimeLogSubmit: (data: TimeLogCreate) => Promise<void>;
  onTimeLogDelete: (id: number) => Promise<void>;
  onTimeLogEdit: (timeLog: TimeLog) => void;
  onTimeLogDialogClose: () => void;
  onCommentSubmit: (content: string) => Promise<void>;
  onCommentUpdate: (commentId: number, text: string) => Promise<void>;
  onCommentDelete: (id: number) => Promise<void>;
  onEditStart: (comment: Comment | null) => void;
  onEditEnd: () => void;
  onAddSubtaskClick: () => void;
  onTimeLogClick: () => void;
  onCommentRefresh?: () => Promise<void>;
}

export interface TaskDetailsSidebarProps {
  id: string;
  projectId: number;
  files: TaskFile[];
  watchers: any[];
  watcherDialogOpen: boolean;
  onFileUploaded: (file: TaskFile) => void;
  onFileDeleted: (fileId: number) => Promise<void>;
  onAddWatcher: (userId: number) => void;
  onRemoveWatcher: (userId: number) => void;
  onWatcherDialogClose: () => void;
  onManageWatchers: () => void;
}

export interface TaskDetailsState {
  statusMenuAnchor: HTMLElement | null;
  editingComment: Comment | null;
  timeLogDialogOpen: boolean;
  selectedTimeLog: TimeLog | null;
  watcherDialogOpen: boolean;
}

export interface AssigneeSelectionSectionProps {
  formData: TaskFormState;
  projectMembers: ProjectMember[];
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export type SimpleChangeEvent = {
  target: {
    name: string;
    value: any;
  };
};

type FormChangeHandler = (e: SimpleChangeEvent) => void;

export interface DatePickerSectionProps {
  formData: TaskFormState;
  handleChange: FormChangeHandler;
  errors?: { start_date?: string; due_date?: string };
}

export interface ParentTaskSelectProps {
  formData: TaskFormState;
  projectTasks: Task[];
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  parentIdFromUrl?: string | null;
}

export interface UseTaskFormProps {
  taskId?: string;
  projectId?: string;
  projectIdFromQuery: string | null;
  parentTaskId: string | null;
  currentUserId?: number;
}
