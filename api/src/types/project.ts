import { User } from './user';
import { TaskDetails } from './task';

export interface Project {
  id: number;
  name: string;
  description: string | null;
  start_date: Date;
  end_date: Date | null;
  due_date: Date;
  created_by: number;
  created_by_name?: string;
  parent_id?: number | null;
  parent_name?: string;
  status_id: number;
  status_name?: string;
  created_on: Date;
  updated_on: Date | null;
  estimated_time?: number;
  spent_time?: number;
  progress?: number;
}

export interface ProjectMember {
  project_id: number;
  user_id: number;
  name?: string;
  surname?: string;
  role?: string;
  created_on?: Date;
  user?: User;
}

export interface ProjectDetails extends Omit<Project, 'updated_on'> {
  updated_on?: Date | null;
  members?: ProjectMember[];
  tasks_count?: number;
  completed_tasks_count?: number;
}

export interface ProjectStatus {
  id: number;
  name: string;
  color?: string;
  order?: number;
}

export interface ProjectCreateInput {
  name: string;
  description: string;
  start_date?: Date;
  due_date?: Date;
  parent_id?: string;
}

export interface ProjectUpdateInput {
  name?: string;
  description?: string;
  start_date?: Date;
  due_date?: Date;
  status?: string;
  parent_id?: string;
}

export interface ProjectTaskFilters {
  status?: string;
  priority?: string;
  assignee?: string;
}

export interface ProjectFilters {
  statusId?: number;
  createdBy?: number;
  parentId?: number;
  startDateFrom?: string;
  startDateTo?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
}

export interface ProjectQueryFilters {
  status_id?: string;
  created_by?: string;
  parent_id?: string;
  start_date_from?: string;
  start_date_to?: string;
  due_date_from?: string;
  due_date_to?: string;
  whereParams?: string | Record<string, unknown>;
}

export type ProjectTask = TaskDetails;
