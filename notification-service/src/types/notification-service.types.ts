// Shape returned by get_notifications_for_service(): the claimed row plus the
// recipient's address.
export interface DatabaseNotification {
  id: string;
  user_id: string;
  type_id: number;
  type_name: string;
  title: string;
  message: string;
  link: string;
  data: Record<string, unknown> | null;
  email_attempts: number;
  created_on: Date;
  email: string;
  login: string;
}

export type NotificationTemplateType =
  | 'taskDueSoon'
  | 'taskAssigned'
  | 'taskUpdated'
  | 'taskComment'
  | 'taskCompleted'
  | 'projectUpdate'
  | 'default';

// The `data` jsonb column is spread in alongside these, so templates can also
// read per-type fields (taskName, projectName, priority, ...).
export interface NotificationEmailData extends Record<string, unknown> {
  userName: string;
  taskUrl: string;
  title: string;
  message: string;
  typeName: string;
}
