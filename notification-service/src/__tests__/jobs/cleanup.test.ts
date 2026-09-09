describe('Cleanup Job', () => {
  let mockQuery: jest.Mock;
  let mockLogger: { info: jest.Mock; error: jest.Mock; warn: jest.Mock };
  let mockScheduleJob: jest.Mock;
  let cleanupOldNotifications: () => Promise<void>;
  let scheduleCleanup: () => unknown;

  beforeEach(async () => {
    jest.resetModules();

    mockQuery = jest.fn();
    mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
    mockScheduleJob = jest.fn();

    jest.doMock('../../db', () => ({ pool: { query: mockQuery } }));
    jest.doMock('../../utils/logger', () => ({ logger: mockLogger }));
    jest.doMock('node-schedule', () => ({ scheduleJob: mockScheduleJob }));

    const cleanup = await import('../../jobs/cleanup');
    cleanupOldNotifications = cleanup.cleanupOldNotifications;
    scheduleCleanup = cleanup.scheduleCleanup;
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('scheduleCleanup', () => {
    it('should not schedule anything at import time', () => {
      expect(mockScheduleJob).not.toHaveBeenCalled();
    });

    it('should register cleanup job with correct cron expression', () => {
      scheduleCleanup();

      expect(mockScheduleJob).toHaveBeenCalledWith(
        '0 2 * * *',
        cleanupOldNotifications,
      );
    });

    it('should schedule job to run at 2 AM every day', () => {
      scheduleCleanup();

      const cronParts = mockScheduleJob.mock.calls[0][0].split(' ');
      expect(cronParts).toEqual(['0', '2', '*', '*', '*']);
    });
  });

  describe('cleanupOldNotifications', () => {
    it('should execute cleanup query', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 5 });

      await cleanupOldNotifications();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
      );
    });

    it('should only archive active, read notifications older than 30 days', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 10 });

      await cleanupOldNotifications();

      const queryCall = mockQuery.mock.calls[0][0];
      expect(queryCall).toContain('active = false');
      expect(queryCall).toContain('archived_on = NOW()');
      expect(queryCall).toContain('WHERE active');
      expect(queryCall).toContain('30 days');
      expect(queryCall).toMatch(/read_on IS NOT NULL|is_read = true/);
    });

    it('should log number of cleaned up notifications', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 15 });

      await cleanupOldNotifications();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ rowCount: 15 }),
        'Cleaned up old notifications',
      );
    });

    it('should handle cleanup with zero results', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      await cleanupOldNotifications();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ rowCount: 0 }),
        'Cleaned up old notifications',
      );
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(cleanupOldNotifications()).resolves.not.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: dbError }),
        'Error cleaning up notifications',
      );
    });
  });
});
