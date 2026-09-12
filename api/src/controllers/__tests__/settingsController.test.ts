import { Request, Response } from 'express';
import { Pool } from 'pg';
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

    const enabledSettings = {
      email_enabled: true,
      email_host: 'smtp.test.com',
      email_port: 587,
      email_secure: false,
      sender_email: 'Test <test@test.com>',
    };

    beforeEach(() => {
      process.env = {
        ...originalEnv,
        EMAIL_USER: 'test@test.com',
        EMAIL_PASSWORD: 'testpassword',
      };
      (settingsModel.getSystemSettings as jest.Mock).mockResolvedValue(
        enabledSettings,
      );
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
      (settingsModel.getSystemSettings as jest.Mock).mockResolvedValue({
        ...enabledSettings,
        email_enabled: false,
      });
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
          'Email sending is disabled. Enable it in System Settings.',
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
        (settingsModel.getSystemSettings as jest.Mock).mockResolvedValue(
          enabledSettings,
        );
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

  describe('runtime settings', () => {
    const invalidInputs: [string, Record<string, unknown>][] = [
      ['unknown log level', { log_level: 'trace' }],
      ['out of range port', { email_port: 70000 }],
      ['non-integer port', { email_port: 25.5 }],
      ['non-boolean email_enabled', { email_enabled: 'yes' }],
      ['non-boolean email_secure', { email_secure: 1 }],
      ['blank app_base_url', { app_base_url: '  ' }],
      ['blank email_host', { email_host: '' }],
      ['unknown theme', { theme: 'neon' }],
    ];

    it.each(invalidInputs)('rejects %s', async (_label, body) => {
      mockReq.body = body;
      await settingsController.updateSystemSettings(
        mockReq,
        mockRes as Response,
        mockPool as Pool,
      );
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(settingsModel.updateSystemSettings).not.toHaveBeenCalled();
    });

    it('accepts valid runtime values', async () => {
      mockReq.body = {
        log_level: 'debug',
        email_port: 465,
        email_enabled: true,
        email_secure: true,
        app_base_url: 'https://pm.example.com',
        email_host: 'smtp.example.com',
      };
      (settingsModel.getSystemSettings as jest.Mock).mockResolvedValue({});
      (settingsModel.updateSystemSettings as jest.Mock).mockResolvedValue(
        mockReq.body,
      );
      await settingsController.updateSystemSettings(
        mockReq,
        mockRes as Response,
        mockPool as Pool,
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('audit-logs each changed runtime key with its previous value', async () => {
      mockReq.body = { email_host: 'smtp.new', app_name: 'Renamed' };
      (settingsModel.getSystemSettings as jest.Mock).mockResolvedValue({
        email_host: 'smtp.old',
      });
      (settingsModel.updateSystemSettings as jest.Mock).mockResolvedValue({});

      await settingsController.updateSystemSettings(
        mockReq,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          actor: { id: '1', login: 'test' },
          changes: [{ key: 'email_host', from: 'smtp.old', to: 'smtp.new' }],
        }),
        'Runtime settings updated',
      );
    });

    it('does not audit-log when only cosmetic fields change', async () => {
      mockReq.body = { app_name: 'Renamed', theme: 'dark' };
      (settingsModel.updateSystemSettings as jest.Mock).mockResolvedValue({});

      await settingsController.updateSystemSettings(
        mockReq,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(logger.warn).not.toHaveBeenCalled();
      expect(settingsModel.getSystemSettings).not.toHaveBeenCalled();
    });

    it('logs a null previous value when settings do not exist yet', async () => {
      mockReq.body = { log_level: 'warn' };
      (settingsModel.getSystemSettings as jest.Mock).mockResolvedValue(null);
      (settingsModel.updateSystemSettings as jest.Mock).mockResolvedValue({});

      await settingsController.updateSystemSettings(
        mockReq,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          changes: [{ key: 'log_level', from: null, to: 'warn' }],
        }),
        'Runtime settings updated',
      );
    });

    it('treats a missing body as an empty update', async () => {
      mockReq.body = undefined;
      (settingsModel.updateSystemSettings as jest.Mock).mockResolvedValue({});

      await settingsController.updateSystemSettings(
        mockReq,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });
});
