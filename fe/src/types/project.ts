import { Task } from './task';
import { User } from './user';
import { Dayjs } from 'dayjs';
import {
  ValidResourceInstance,
  FormatterFn,
} from '@devexpress/dx-react-scheduler';
import { AppointmentTooltip } from '@devexpress/dx-react-scheduler-material-ui';
import { TimeLog, TimeLogCreate } from './timeLog';

export interface Project {
  id: number;
  name: string;
  description: string | null;
  start_date: string;
  end_date?: string | null;
  due_date: string;
  parent_id: number | null;
  parent_name: string | null;
  status_id: number;
  status_name: string;
  created_by: number;
  created_by_name: string;
  created_on: string;
  updated_on?: string | null;
  estimated_time: number;
  spent_time: number;
  progress: number;
  // Frontend-specific fields
  subprojects?: Project[];
  can_create_project?: boolean;
}

export interface ProjectMember {
  project_id: number;
  user_id: number;
  name: string;
  surname: string;
  role: string;
  created_on: string;
}

export interface ProjectEditDialogProps {
  open: boolean;
  project: Project;
  onClose: () => void;
  onSaved: (project: Project) => void;
}

export interface ProjectGanttProps {
  projectId: number;
  tasks: Task[];
}

export interface SubprojectFormProps {
  projectId: number;
  onSubmit: (data: {
    name: string;
    description: string;
    start_date: string;
    due_date: string;
  }) => Promise<void>;
  onClose: () => void;
}

export interface ProjectFormProps {
  project?: Project;
  onSubmit?: (data: Partial<Project>) => Promise<void>;
  onClose?: () => void;
}

export interface FormattedTask {
  id: number;
  title: string;
  startDate: Date;
  endDate: Date;
  assigneeId: number | null;
  type_name?: string;
  priority?: string;
  status?: string;
  description?: string | null;
}

export interface SubprojectFormData {
  name: string;
  description: string;
  start_date: Dayjs | null;
  due_date: Dayjs | null;
}

export interface ProjectMembersListProps {
  projectId: number;
  members: ProjectMember[];
  canManageMembers: boolean;
  onMemberRemove: (userId: number) => void;
  onMemberUpdate?: (memberId: number, role: string) => Promise<void>;
  onMembersChange?: () => void;
}

export interface EditMembersDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  currentMembers: ProjectMember[];
  onSave: (selectedUsers: number[]) => void;
}

export interface ProjectOverviewProps {
  project: Project | null;
  projectDetails: Project | null;
}

export interface ProjectTaskListProps {
  tasks: Task[];
  onCreateTask?: () => void;
  onTimeLogCreate?: (taskId: number) => void;
}

export interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

export interface ProjectEditFormData extends Partial<Project> {
  name: string | undefined;
  description: string | null;
  start_date: string;
  due_date: string;
  status_id: number;
}

export interface ProjectMemberSelectProps {
  users: User[];
  selectedUsers: number[];
  onUserSelect: (userId: number) => void;
}

export interface ProjectStatus {
  id: number;
  name: string;
  color?: string;
}

export interface ProjectDetailsState {
  project: Project | null;
  projectDetails: Project | null;
  members: ProjectMember[];
  tasks: Task[];
  loading: boolean;
  error: string | null;
  editDialogOpen: boolean;
  deleteDialogOpen: boolean;
  createTaskDialogOpen: boolean;
  membersDialogOpen: boolean;
  timeLogs: TimeLog[];
}

export type AppointmentComponentProps = {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  data: FormattedTask;
  draggable: boolean;
  resources: ValidResourceInstance[];
  [key: string]: any;
};

export type AppointmentContentComponentProps = {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  data: FormattedTask;
  formatDate: FormatterFn;
  type: 'horizontal' | 'vertical';
  durationType: 'long' | 'short' | 'middle';
  recurringIconComponent: React.ComponentType<object>;
  resources: ValidResourceInstance[];
  [key: string]: any;
};

export type TooltipContentComponentProps = AppointmentTooltip.ContentProps & {
  appointmentData: FormattedTask;
};

export interface ProjectActionsProps {
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export interface ProjectTabPanelsProps {
  activeTab: number;
  project: Project;
  projectDetails: Project | null;
  tasks: Task[];
  members: ProjectMember[];
  timeLogs: TimeLog[];
  canManageMembers: boolean;
  projectId: string;
  onCreateTask: () => void;
  onManageMembers: () => void;
  onTimeLogCreate: (taskId: number) => void;
  onTimeLogEdit: (timeLog: TimeLog) => void;
  onTimeLogDelete: (timeLogId: number) => void;
  onMemberRemove: (userId: number) => void;
}

export interface ProjectMembersHook {
  members: ProjectMember[];
  setMembers: React.Dispatch<React.SetStateAction<ProjectMember[]>>;
  manageMembersOpen: boolean;
  setManageMembersOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleMemberUpdate: (memberId: number, role: string) => Promise<void>;
  handleMemberRemove: (memberId: number) => Promise<void>;
  handleMembersUpdate: (selectedUsers: number[]) => Promise<void>;
  loadMembers: () => Promise<void>;
}

export interface ProjectTasksHook {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  tasksError: string | null;
  taskFormOpen: boolean;
  setTaskFormOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleTaskCreate: (task: Task) => Promise<void>;
  loadTasks: () => Promise<void>;
}

export interface ProjectTimeLogsHook {
  timeLogs: TimeLog[];
  setTimeLogs: React.Dispatch<React.SetStateAction<TimeLog[]>>;
  timeLogDialogOpen: boolean;
  setTimeLogDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedTimeLog: TimeLog | null;
  setSelectedTimeLog: React.Dispatch<React.SetStateAction<TimeLog | null>>;
  handleTimeLogSubmit: (timeLogData: TimeLogCreate) => Promise<void>;
  handleTimeLogEdit: (timeLog: TimeLog) => Promise<void>;
  handleTimeLogDelete: (timeLogId: number) => Promise<void>;
  loadTimeLogs: () => Promise<void>;
}

export interface TaskFormProps {
  projectId: number;
  open: boolean;
  onClose: () => void;
  onCreated: (task: Task) => Promise<void>;
}

export interface ProjectDetailsFormProps {
  formData: any;
  errors: Record<string, string>;
  dateError: string;
  availableProjects: Project[];
  parentId: string | null;
  statuses?: ProjectStatus[];
  statusesLoading?: boolean;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  handleStatusChange: (event: any) => void;
  handleDateChange: (
    field: 'start_date' | 'due_date',
    newValue: Dayjs | null,
  ) => void;
  handleParentChange: (e: any) => void;
  handleCancel: () => void;
  onSubmit: () => void;
}

export interface ProjectMembersFormProps {
  users: User[];
  selectedUsers: number[];
  memberError: string;
  onUserSelect: (userId: number) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export interface ProjectFormData {
  name: string | undefined;
  description: string | null;
  start_date: string;
  due_date: string;
  status_id: number;
  parent_id: number | null;
}
