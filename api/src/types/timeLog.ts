export interface TimeLog {
  id: number;
  task_id: number;
  user_id: number;
  log_date: Date;
  spent_time: number;
  description: string;
  activity_type_id: number;
  created_on: Date;
  updated_on: Date;
}

export interface TimeLogCreateInput {
  log_date: Date;
  spent_time: number;
  description: string;
  activity_type_id: number;
}

export interface TimeLogUpdateInput {
  log_date?: Date;
  spent_time?: number;
  description?: string;
  activity_type_id?: number;
}

export interface TimeLogQueryFilters {
  startDate?: Date;
  endDate?: Date;
  activity_type_id?: number;
}

export interface SpentTime {
  spent_time: number;
}
