jest.mock('../db', () => ({
  pool: { query: jest.fn() },
}));

jest.mock('../services/emailService', () => ({
  emailService: { transporter: { verify: jest.fn() } },
}));

jest.mock('../config', () => ({
  config: { app: { emailEnabled: false, port: 0 } },
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import type { Express } from 'express';
import type { AddressInfo } from 'net';

// Each test gets a fresh module registry: the SMTP probe state lives at module
// scope in server.ts.
const load = async () => {
  jest.resetModules();
  const server = await import('../server');
  const { pool } = await import('../db');
  const { config } = await import('../config');
  const { emailService } = await import('../services/emailService');
  return { ...server, pool, config, emailService };
};

const request = async (app: Express, path: string) => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`);
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

describe('server', () => {
  describe('GET /ready', () => {
    it('should return 200 when the database answers', async () => {
      const { createServer, pool } = await load();
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const response = await request(createServer(), '/ready');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ready' });
      expect(pool.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should return 503 when the database is unreachable', async () => {
      const { createServer, pool } = await load();
      (pool.query as jest.Mock).mockRejectedValue(new Error('down'));

      const response = await request(createServer(), '/ready');

      expect(response.status).toBe(503);
      expect(response.body).toEqual({ status: 'not ready' });
    });
  });

  describe('GET /health', () => {
    it('should return 200 before any probe has run', async () => {
      const { createServer } = await load();

      const response = await request(createServer(), '/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'healthy' });
    });

    it('should return 200 while email is disabled', async () => {
      const { createServer, startSmtpProbe, stopSmtpProbe, emailService } =
        await load();
      startSmtpProbe();
      await new Promise((resolve) => setImmediate(resolve));

      const response = await request(createServer(), '/health');
      stopSmtpProbe();

      expect(response.status).toBe(200);
      expect(emailService.transporter.verify).not.toHaveBeenCalled();
    });

    it('should return 503 after a failed SMTP probe', async () => {
      const {
        createServer,
        startSmtpProbe,
        stopSmtpProbe,
        config,
        emailService,
      } = await load();
      config.app.emailEnabled = true;
      (emailService.transporter.verify as jest.Mock).mockRejectedValue(
        new Error('no smtp'),
      );

      startSmtpProbe();
      await new Promise((resolve) => setImmediate(resolve));

      const response = await request(createServer(), '/health');
      stopSmtpProbe();

      expect(response.status).toBe(503);
      expect(response.body).toEqual({ status: 'unhealthy' });
    });

    it('should return 200 after a successful SMTP probe', async () => {
      const {
        createServer,
        startSmtpProbe,
        stopSmtpProbe,
        config,
        emailService,
      } = await load();
      config.app.emailEnabled = true;
      (emailService.transporter.verify as jest.Mock).mockResolvedValue(true);

      startSmtpProbe();
      await new Promise((resolve) => setImmediate(resolve));

      const response = await request(createServer(), '/health');
      stopSmtpProbe();

      expect(response.status).toBe(200);
      expect(emailService.transporter.verify).toHaveBeenCalled();
    });
  });

  describe('smtp probe lifecycle', () => {
    it('should not start a second timer', async () => {
      const { startSmtpProbe, stopSmtpProbe } = await load();
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      startSmtpProbe();
      startSmtpProbe();
      stopSmtpProbe();

      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      setIntervalSpy.mockRestore();
    });

    it('should be safe to stop when not started', async () => {
      const { stopSmtpProbe } = await load();

      expect(() => stopSmtpProbe()).not.toThrow();
    });
  });

  describe('startServer', () => {
    it('should listen and start the probe', async () => {
      const { startServer, stopSmtpProbe } = await load();

      const server = startServer();
      await new Promise((resolve) => server.once('listening', resolve));

      expect(server.listening).toBe(true);

      stopSmtpProbe();
      await new Promise((resolve) => server.close(resolve));
    });
  });
});
