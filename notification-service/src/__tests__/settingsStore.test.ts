jest.mock('../db', () => ({
  pool: { query: jest.fn() },
}));

jest.mock('../utils/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import { reloadSettings } from '../settingsStore';
import { pool } from '../db';
import { config } from '../config';
import { logger } from '../utils/logger';

const row = {
  sender_email: 'no-reply@example.com',
  app_base_url: 'https://app.example.com',
  email_enabled: true,
  email_host: 'smtp.example.com',
  email_port: 2525,
  email_secure: true,
};

describe('reloadSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should apply the row and report the change', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [row] });

    await expect(reloadSettings()).resolves.toBe(true);
    expect(config.email.host).toBe('smtp.example.com');
    expect(config.appBaseUrl).toBe('https://app.example.com');
  });

  it('should report no change on a second identical load', async () => {
    (pool.query as jest.Mock).mockResolvedValue({ rows: [row] });

    await reloadSettings();

    await expect(reloadSettings()).resolves.toBe(false);
  });

  it('should keep the current values when the query fails', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [row] })
      .mockRejectedValueOnce(new Error('down'));
    await reloadSettings();

    await expect(reloadSettings()).resolves.toBe(false);
    expect(config.email.host).toBe('smtp.example.com');
    expect(logger.error).toHaveBeenCalled();
  });

  it('should warn once when email is enabled without credentials', async () => {
    delete process.env.EMAIL_PASSWORD;
    (pool.query as jest.Mock).mockResolvedValue({ rows: [row] });

    await reloadSettings();
    await reloadSettings();

    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});
