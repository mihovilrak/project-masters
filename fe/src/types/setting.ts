import { User } from './user';
import { Role } from './role';
import { Permission } from './admin';
import { TaskType } from './task';

export type { Permission } from './admin';
export type { TaskType } from './task';

export interface ActivityType {
  id: number;
  name: string;
  color: string;
  icon?: string | null;
  description?: string | null;
  active: boolean;
  created_on?: string;
  updated_on?: string | null;
}

export interface ActivityTypeDialogProps {
  open: boolean;
  activityType?: ActivityType;
  onClose: () => void;
  onSave: (activityType: Partial<ActivityType>) => Promise<void>;
}

export interface TaskTypeDialogProps {
  open: boolean;
  taskType?: TaskType;
  onClose: () => void;
  onSave: (taskType: Partial<TaskType>) => Promise<void>;
}

export interface ActivityTypesTableProps {
  activityTypes: ActivityType[];
  onEdit: (activityType: ActivityType) => void;
  onDelete: (id: number) => Promise<void>;
  loading?: boolean;
  canManage?: boolean;
}

export interface TaskTypesTableProps {
  taskTypes: TaskType[];
  onEdit: (taskType: TaskType) => void;
  onDelete: (id: number) => Promise<void>;
  loading?: boolean;
  canManage?: boolean;
}

export interface SystemSettingsState {
  settings: AppSettings;
  loading: boolean;
  error: string | null;
  success: boolean;
}

export interface TypesAndRolesState {
  activeTab: number;
  taskTypes: TaskType[];
  activityTypes: ActivityType[];
  roles: Role[];
  loading: boolean;
  error: string | null;
  dialogOpen: boolean;
  selectedItem: TaskType | ActivityType | Role | null;
}

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface AppSettings {
  id: number;
  app_name: string;
  company_name: string;
  sender_email: string;
  time_zone: string;
  theme: 'light' | 'dark' | 'system';
  welcome_message: string;
  app_base_url: string;
  log_level: LogLevel;
  email_enabled: boolean;
  email_host: string;
  email_port: number;
  email_secure: boolean;
  created_on?: string;
  updated_on?: string;
}

export interface TimezoneOption {
  name: string;
  region: string;
  abbrev: string;
  utcOffsetSeconds: number;
  isDst: boolean;
  label: string;
}

export interface UserTableProps {
  users: User[];
  onEditUser: (user: User) => void;
  onUserDeleted: () => void;
}

export interface IconSelectorProps {
  value: string | undefined;
  onChange: (icon: string) => void;
}

export interface UserSettings {
  user_id: number;
  timezone: string | null;
  language: string | null;
  date_format: string | null;
  time_format: string | null;
  notification_preferences: {
    email_notifications: boolean;
    push_notifications: boolean;
    task_reminders: boolean;
    project_updates: boolean;
    team_mentions: boolean;
  };
  created_on: string;
  updated_on: string | null;
}

export interface ActivityTypeFormData {
  name: string;
  color: string;
  description: string;
  active: boolean;
  icon: string | undefined;
}

export interface ActivityTypeFormProps {
  formData: ActivityTypeFormData;
  onChange: (field: string, value: string | boolean) => void;
}

type AdminRole = Role;

export interface TypesAndRolesDialogProps {
  activeTab: number;
  dialogOpen: boolean;
  selectedItem: TaskType | ActivityType | AdminRole | null;
  onClose: () => void;
  onSave: (item: Partial<TaskType | ActivityType | AdminRole>) => Promise<void>;
}
