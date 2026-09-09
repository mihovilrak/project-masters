import { User } from './user';
import { Task } from './task';
import { Project } from './project';

export interface ProfileData extends User {
  total_tasks: number;
  completed_tasks: number;
  active_projects: number;
  total_hours: number;
}

export interface ProfileStats {
  totalTasks: number;
  completedTasks: number;
  activeProjects: number;
  totalHours: number;
}

export interface ProfileStatsProps {
  stats: ProfileStats;
  loading: boolean;
}

export interface StatCardProps {
  icon: React.ElementType;
  title: string;
  value: number | string;
  loading: boolean;
}

export interface PasswordChange {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface ProfileProjectListProps {
  projects: Project[];
  loading?: boolean;
}

export interface ProfileHeaderProps {
  user: User;
}

export interface ProfileEditDialogProps {
  open: boolean;
  onClose: () => void;
  profile: ProfileData;
  onProfileUpdate: (data: ProfileFormData) => Promise<void>;
}

export interface ProfileFormData {
  name: string;
  surname: string;
  email: string;
}

export type ProfileUpdateData = Pick<User, 'name' | 'surname' | 'email'>;

export interface ProfileTaskListProps {
  tasks: Task[];
  loading?: boolean;
  onTaskClick: (taskId: number) => void;
}

export interface PasswordChangeDialogProps {
  open: boolean;
  onClose: () => void;
}

export interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  error?: string;
}
