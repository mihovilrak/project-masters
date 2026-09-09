export type MetricType =
  | 'notificationsSent'
  | 'emailErrors'
  | 'notificationErrors'
  | 'notificationsDeadLettered';

export interface Metrics {
  notificationsSent: number;
  emailErrors: number;
  notificationErrors: number;
  notificationsDeadLettered: number;
  lastProcessingTime: Date | null;
  increment(metric: MetricType): void;
  setProcessingTime(): void;
  scheduleLogMetrics(): void;
}
