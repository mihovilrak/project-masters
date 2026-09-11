import { Request, Response } from 'express';
import { Pool } from 'pg';
import fs from 'fs';
import os from 'os';
import path from 'path';
import nodemailer from 'nodemailer';
import * as settingsController from '../settingsController';
import * as settingsModel from '../../models/settingsModel';
import { Session } from 'express-session';
import { CustomRequest } from '../../types/express';

import logger from '../../utils/logger';

jest.mock('../../models/settingsModel');
jest.mock('nodemailer');
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

describe('SettingsController', () => {
  let mockReq: any;
  let mockRes: Partial<Response>;
  let mockPool: Partial<Pool>;

  beforeEach(() => {
    const mockSession = {
      id: 'test-session-id',
      cookie: { originalMaxAge: null },
      user: { id: '1', login: 'test', role_id: 1 },
    } as unknown as Session;

    mockReq = { params: {}, query: {}, body: {}, session: mockSession };
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    mockPool = {};
    jest.clearAllMocks();
  });

  describe('getSystemSettings', () => {
    it('should return system settings', async () => {
      const mockSettings = { app_name: 'Test App', theme: 'dark' };
      (settingsModel.getSystemSettings as jest.Mock).mockResolvedValue(
        mockSettings,
      );
      await settingsController.getSystemSettings(
        mockReq,
        mockRes as Response,
        mockPool as Pool,
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockSettings);
    });

    it('should handle errors', async () => {
      (settingsModel.getSystemSettings as jest.Mock).mockRejectedValue(
        new Error('DB error'),
      );
      await settingsController.getSystemSettings(
        mockReq,
        mockRes as Response,
        mockPool as Pool,
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAppTheme', () => {
    it('should return app theme', async () => {
      const mockSettings = { app_name: 'Test App', theme: 'dark' };
      (settingsModel.getSystemSettings as jest.Mock).mockResolvedValue(
        mockSettings,
      );
      await settingsController.getAppTheme(
        mockReq,
        mockRes as Response,
        mockPool as Pool,
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ theme: 'dark' });
    });

    it('should return default theme when no settings found', async () => {
      (settingsModel.getSystemSettings as jest.Mock).mockResolvedValue(null);
      await settingsController.getAppTheme(
        mockReq,
        mockRes as Response,
        mockPool as Pool,
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ theme: 'light' });
    });

    it('should return default theme when theme is not set', async () => {
      const mockSettings = { app_name: 'Test App' };
      (settingsModel.getSystemSettings as jest.Mock).mockResolvedValue(
        mockSettings,
      );
      await settingsController.getAppTheme(
        mockReq,
        mockRes as Response,
        mockPool as Pool,
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ theme: 'light' });
    });

    it('should handle errors', async () => {
      (settingsModel.getSystemSettings as jest.Mock).mockRejectedValue(
        new Error('DB error'),
      );
      await settingsController.getAppTheme(
        mockReq,
        mockRes as Response,
        mockPool as Pool,
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateSystemSettings', () => {
    it('should update system settings', async () => {
      mockReq.body = { app_name: 'New App Name' };
      const updatedSettings = { app_name: 'New App Name' };
      (settingsModel.updateSystemSettings as jest.Mock).mockResolvedValue(
        updatedSettings,
      );
      await settingsController.updateSystemSettings(
        mockReq,
        mockRes as Response,
        mockPool as Pool,
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle errors', async () => {
      mockReq.body = { app_name: 'New App Name' };
      (settingsModel.updateSystemSettings as jest.Mock).mockRejectedValue(
        new Error('DB error'),
      );
      await settingsController.updateSystemSettings(
        mockReq,
        mockRes as Response,
        mockPool as Pool,
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getUserSettings', () => {
    it('should return user settings', async () => {
      const mockSettings = { theme: 'light', notifications: true };
      (settingsModel.getUserSettings as jest.Mock).mockResolvedValue(
        mockSettings,
      );
      await settingsController.getUserSettings(
        mockReq,
        mockRes as Response,
        mockPool as Pool,
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockSettings);
    });

    it('should return 401 when not authenticated', async () => {
      mockReq.session.user = undefined;
      await settingsController.getUserSettings(
        mockReq,
        mockRes as Response,
        mockPool as Pool,
      );
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return empty object when no settings', async () => {
      (settingsModel.getUserSettings as jest.Mock).mockResolvedValue(null);
      await settingsController.getUserSettings(
        mockReq,
        mockRes as Response,
        mockPool as Pool,
      );
      expect(mockRes.json).toHaveBeenCalledWith({});
    });

    it('should handle errors', async () => {
      (settingsModel.getUserSettings as jest.Mock).mockRejectedValue(
        new Error('DB error'),
      );
      await settingsController.getUserSettings(
        mockReq,
        mockRes as Response,
        mockPool as Pool,
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
      });
    });
  });

  describe('updateUserSettings', () => {
    it('should update user settings', async () => {
      mockReq.body = { theme: 'dark' };
      const updatedSettings = { theme: 'dark' };
      (settingsModel.updateUserSettings as jest.Mock).mockResolvedValue(
        updatedSettings,
      );
      await settingsController.updateUserSettings(
        mockReq,
        mockRes as Response,
        mockPool as Pool,
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 401 when not authenticated', async () => {
      mockReq.session.user = undefined;
      mockReq.body = { theme: 'dark' };
      await settingsController.updateUserSettings(
        mockReq,
        mockRes as Response,
        mockPool as Pool,
      );
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should handle errors', async () => {
      mockReq.body = { theme: 'dark' };
      (settingsModel.updateUserSettings as jest.Mock).mockRejectedValue(
        new Error('DB error'),
      );
      await settingsController.updateUserSettings(
        mockReq,
        mockRes as Response,
        mockPool as Pool,
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
      });
    });
  });

  describe('getTimezones', () => {
    it('should return list of timezones', async () => {
      const mockTimezones = [
        {
          name: 'Europe/Zagreb',
          region: 'Europe',
          abbrev: 'CET',
          utcOffsetSeconds: 3600,
          isDst: false,
          label: 'Europe/Zagreb (UTC+01:00)',
        },
      ];
      (settingsModel.getTimezones as jest.Mock).mockResolvedValue(
        mockTimezones,
      );

      await settingsController.getTimezones(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockTimezones);
    });

    it('should handle errors', async () => {
      (settingsModel.getTimezones as jest.Mock).mockRejectedValue(
        new Error('DB error'),
      );

      await settingsController.getTimezones(
        mockReq as Request,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
      });
    });
  });

  describe('testSmtpConnection', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = {
        ...originalEnv,
        EMAIL_ENABLED: 'true',
        EMAIL_HOST: 'smtp.test.com',
        EMAIL_PORT: '587',
        EMAIL_SECURE: 'false',
        EMAIL_USER: 'test@test.com',
        EMAIL_PASSWORD: 'testpassword',
        EMAIL_FROM: 'Test <test@test.com>',
      };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return 400 when email is missing', async () => {
      mockReq.body = {};
      await settingsController.testSmtpConnection(
        mockReq,
        mockRes as Response,
        mockPool as Pool,
      );
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email address is required',
      });
    });

    it('should return 400 for invalid email format', async () => {
      mockReq.body = { email: 'invalid-email' };
      await settingsController.testSmtpConnection(
        mockReq,
        mockRes as Response,
        mockPool as Pool,
      );
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid email address format',
      });
    });

    it('should return 400 when email is disabled', async () => {
      process.env.EMAIL_ENABLED = 'false';
      mockReq.body = { email: 'test@example.com' };
      await settingsController.testSmtpConnection(
        mockReq,
        mockRes as Response,
        mockPool as Pool,
      );
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message:
          'Email sending is disabled. Set EMAIL_ENABLED=true in environment.',
      });
    });

    it('should send test email successfully', async () => {
      const mockSendMail = jest
        .fn()
        .mockResolvedValue({ messageId: 'test-message-id' });
      const mockVerify = jest.fn().mockResolvedValue(true);
      const mockTransporter = {
        sendMail: mockSendMail,
        verify: mockVerify,
      };

      (nodemailer.createTransport as jest.Mock).mockReturnValue(
        mockTransporter,
      );

      mockReq.body = { email: 'recipient@example.com' };
      await settingsController.testSmtpConnection(
        mockReq,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(mockVerify).toHaveBeenCalled();
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'recipient@example.com',
          subject: 'SMTP Test - Project Management App',
        }),
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Test email sent successfully to recipient@example.com',
        messageId: 'test-message-id',
      });
    });

    it('should handle SMTP connection failure', async () => {
      const mockVerify = jest
        .fn()
        .mockRejectedValue(new Error('Connection refused'));
      const mockTransporter = {
        verify: mockVerify,
        sendMail: jest.fn(),
      };

      (nodemailer.createTransport as jest.Mock).mockReturnValue(
        mockTransporter,
      );

      mockReq.body = { email: 'recipient@example.com' };
      await settingsController.testSmtpConnection(
        mockReq,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'SMTP test failed. See the server logs for details.',
      });
    });

    it('should handle email sending failure', async () => {
      const mockVerify = jest.fn().mockResolvedValue(true);
      const mockSendMail = jest
        .fn()
        .mockRejectedValue(new Error('Authentication failed'));
      const mockTransporter = {
        verify: mockVerify,
        sendMail: mockSendMail,
      };

      (nodemailer.createTransport as jest.Mock).mockReturnValue(
        mockTransporter,
      );

      mockReq.body = { email: 'recipient@example.com' };
      await settingsController.testSmtpConnection(
        mockReq,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'SMTP test failed. See the server logs for details.',
      });
    });

    it('should validate various email formats correctly', async () => {
      const validEmails = [
        'user@example.com',
        'user.name@domain.org',
        'user+tag@sub.domain.com',
      ];
      const invalidEmails = [
        'invalid',
        '@example.com',
        'user@',
        'user @example.com',
      ];

      for (const email of validEmails) {
        mockReq.body = { email };
        const mockVerify = jest.fn().mockResolvedValue(true);
        const mockSendMail = jest
          .fn()
          .mockResolvedValue({ messageId: 'test-id' });
        (nodemailer.createTransport as jest.Mock).mockReturnValue({
          verify: mockVerify,
          sendMail: mockSendMail,
        });

        await settingsController.testSmtpConnection(
          mockReq,
          mockRes as Response,
          mockPool as Pool,
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
        jest.clearAllMocks();
        mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      }

      for (const email of invalidEmails) {
        mockReq.body = { email };
        await settingsController.testSmtpConnection(
          mockReq,
          mockRes as Response,
          mockPool as Pool,
        );
        expect(mockRes.status).toHaveBeenCalledWith(400);
        jest.clearAllMocks();
        mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      }
    });
  });

  describe('env settings', () => {
    let envDir: string;
    let envPath: string;
    const originalEnvFilePath = process.env.ENV_FILE_PATH;

    beforeEach(() => {
      envDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-settings-'));
      envPath = path.join(envDir, '.env');
      fs.writeFileSync(
        envPath,
        ['# comment', 'PORT=5000', 'LOG_LEVEL=info', 'FE_URL=http://old']
          .map((line) => line + '\n')
          .join(''),
        'utf-8',
      );
      process.env.ENV_FILE_PATH = envPath;
    });

    afterEach(() => {
      if (originalEnvFilePath === undefined) {
        delete process.env.ENV_FILE_PATH;
      } else {
        process.env.ENV_FILE_PATH = originalEnvFilePath;
      }
      fs.rmSync(envDir, { recursive: true, force: true });
    });

    const readEnv = () => fs.readFileSync(envPath, 'utf-8');

    describe('getEnvSettings', () => {
      it('returns the allowed keys with their file values', async () => {
        await settingsController.getEnvSettings(
          mockReq,
          mockRes as Response,
          mockPool as Pool,
        );

        expect(mockRes.status).toHaveBeenCalledWith(200);
        const entries = (mockRes.json as jest.Mock).mock.calls[0][0];
        expect(entries).toEqual(
          expect.arrayContaining([
            { key: 'PORT', value: '5000', masked: false },
            { key: 'FE_URL', value: 'http://old', masked: false },
          ]),
        );
      });

      it('masks keys with no value', async () => {
        await settingsController.getEnvSettings(
          mockReq,
          mockRes as Response,
          mockPool as Pool,
        );

        const entries = (mockRes.json as jest.Mock).mock.calls[0][0];
        const emailFrom = entries.find(
          (entry: { key: string }) => entry.key === 'EMAIL_FROM',
        );
        expect(emailFrom).toEqual({
          key: 'EMAIL_FROM',
          value: '****',
          masked: true,
        });
      });

      it('reports the failure without leaking the error', async () => {
        jest.spyOn(fs, 'existsSync').mockImplementationOnce(() => {
          throw new Error('disk error');
        });

        await settingsController.getEnvSettings(
          mockReq,
          mockRes as Response,
          mockPool as Pool,
        );

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Internal server error',
        });
      });
    });

    describe('updateEnvSettings', () => {
      const update = (updates: Record<string, string>) => {
        mockReq.body = { updates };
        return settingsController.updateEnvSettings(
          mockReq,
          mockRes as Response,
          mockPool as Pool,
        );
      };

      it('rewrites existing keys in place and appends new ones', async () => {
        await update({ PORT: '6000', EMAIL_HOST: 'smtp.example.com' });

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(readEnv()).toContain('PORT=6000');
        expect(readEnv()).toContain('EMAIL_HOST=smtp.example.com');
        expect(readEnv()).toContain('LOG_LEVEL=info');
      });

      it('rejects a key that is not editable', async () => {
        await update({ NODE_ENV: 'production' });

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(readEnv()).not.toContain('NODE_ENV');
      });

      it('rejects an invalid value without touching the file', async () => {
        const before = readEnv();
        await update({ PORT: '99999' });

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(readEnv()).toBe(before);
      });

      it('rejects an invalid LOG_LEVEL', async () => {
        await update({ LOG_LEVEL: 'verbose' });

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: expect.stringContaining('LOG_LEVEL must be one of'),
        });
      });

      it('rejects an out-of-range EMAIL_PORT', async () => {
        await update({ EMAIL_PORT: '0' });

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'EMAIL_PORT must be a number between 1 and 65535',
        });
      });

      it('rejects a non-boolean EMAIL_ENABLED', async () => {
        await update({ EMAIL_ENABLED: 'yes' });

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'EMAIL_ENABLED must be true or false',
        });
      });

      it('rejects an empty FE_URL', async () => {
        await update({ FE_URL: '   ' });

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'FE_URL cannot be empty',
        });
      });

      it('accepts a valid EMAIL_ENABLED and LOG_LEVEL', async () => {
        await update({ EMAIL_ENABLED: 'true', LOG_LEVEL: 'debug' });

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(readEnv()).toContain('EMAIL_ENABLED=true');
        expect(readEnv()).toContain('LOG_LEVEL=debug');
      });

      it('quotes values containing special characters', async () => {
        await update({ EMAIL_FROM: 'Name, Inc <a@b.com>' });

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(readEnv()).toContain(
          'EMAIL_FROM="Name, Inc <a@b.com>"',
        );
      });

      it('audit-logs the actor and the before/after of every write', async () => {
        await update({ PORT: '6000' });

        expect(logger.warn).toHaveBeenCalledWith(
          expect.objectContaining({
            actor: { id: '1', login: 'test' },
            changes: [{ key: 'PORT', from: '5000', to: '6000' }],
          }),
          'Environment settings updated',
        );
      });

      it('does not audit-log a rejected write', async () => {
        await update({ PORT: 'not-a-port' });

        expect(logger.warn).not.toHaveBeenCalled();
      });

      it('reports the failure without leaking the error', async () => {
        // writeEnvFile creates a missing parent directory itself (the
        // container filesystem may be read-only outside mounted volumes), so
        // that alone doesn't fail. Force a write failure the directory
        // auto-create can't route around.
        jest.spyOn(fs, 'writeFileSync').mockImplementationOnce(() => {
          throw new Error('disk error');
        });

        await update({ PORT: '6000' });

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Internal server error',
        });
      });
    });
  });
});
