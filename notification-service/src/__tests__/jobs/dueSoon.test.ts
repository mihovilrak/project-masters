describe('Due Soon Job', () => {
  let mockQuery: jest.Mock;
  let mockLogger: { info: jest.Mock; error: jest.Mock; warn: jest.Mock };
  let mockScheduleJob: jest.Mock;
  let createDueSoonNotifications: () => Promise<void>;
  let scheduleDueSoon: () => unknown;

  beforeEach(async () => {
    jest.resetModules();

    mockQuery = jest.fn();
    mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
    mockScheduleJob = jest.fn();

    jest.doMock('../../db', () => ({ pool: { query: mockQuery } }));
    jest.doMock('../../utils/logger', () => ({ logger: mockLogger }));
    jest.doMock('node-schedule', () => ({ scheduleJob: mockScheduleJob }));

    const dueSoon = await import('../../jobs/dueSoon');
    createDueSoonNotifications = dueSoon.createDueSoonNotifications;
    scheduleDueSoon = dueSoon.scheduleDueSoon;
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('should not schedule anything at import time', () => {
    expect(mockScheduleJob).not.toHaveBeenCalled();
  });

  it('should register the sweep hourly', () => {
    scheduleDueSoon();

    expect(mockScheduleJob).toHaveBeenCalledWith(
      '5 * * * *',
      createDueSoonNotifications,
    );
  });

  it('should call the database sweep and log the count', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ created: 3 }] });

    await createDueSoonNotifications();

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('create_due_soon_notifications()'),
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      { created: 3 },
      'Created due soon notifications',
    );
  });

  it('should log database errors instead of throwing', async () => {
    const dbError = new Error('Database connection failed');
    mockQuery.mockRejectedValueOnce(dbError);

    await expect(createDueSoonNotifications()).resolves.toBeUndefined();

    expect(mockLogger.error).toHaveBeenCalledWith(
      { err: dbError },
      'Error creating due soon notifications',
    );
  });
});
