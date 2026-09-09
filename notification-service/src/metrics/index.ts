import { logger } from '../utils/logger';
import { Metrics, MetricType } from '../types/metrics.types';

const metricsLogger = logger.child({ service: 'notification-metrics' });
const METRICS_DEBOUNCE_MS = 30000;
let metricsFlushScheduled: ReturnType<typeof setTimeout> | null = null;

const metrics: Metrics = {
  notificationsSent: 0,
  emailErrors: 0,
  notificationErrors: 0,
  notificationsDeadLettered: 0,
  lastProcessingTime: null,

  increment(metric: MetricType): void {
    this[metric]++;
    this.scheduleLogMetrics();
  },

  setProcessingTime(): void {
    this.lastProcessingTime = new Date();
    this.scheduleLogMetrics();
  },

  scheduleLogMetrics(): void {
    if (process.env.METRICS_ENABLED !== 'true') return;
    if (metricsFlushScheduled) return;
    metricsFlushScheduled = setTimeout(() => {
      metricsFlushScheduled = null;
      metricsLogger.info({ ...this }, 'metrics_update');
    }, METRICS_DEBOUNCE_MS);
    // A pending flush must never keep the process alive during shutdown.
    metricsFlushScheduled.unref();
  },
};

export { metrics };
