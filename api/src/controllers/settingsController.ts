import { Request, Response } from 'express';
import { Pool } from 'pg';
import nodemailer from 'nodemailer';
import * as settingsModel from '../models/settingsModel';
import { CustomRequest } from '../types/express';
import { SettingsUpdateInput } from '../types/settings';
import logger from '../utils/logger';
import { buildEmailConfig } from '../config';

// Get System Settings
export const getSystemSettings = async (
  req: Request,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  try {
    const settings = await settingsModel.getSystemSettings(pool);
    res.status(200).json(settings);
  } catch (error) {
    logger.error({ err: error });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get available timezones (cached)
export const getTimezones = async (
  req: Request,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  try {
    const timezones = await settingsModel.getTimezones(pool);
    return res.status(200).json(timezones);
  } catch (error) {
    logger.error({ err: error });
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get App Theme (public endpoint, no admin permission required)
export const getAppTheme = async (
  req: Request,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  try {
    const settings = await settingsModel.getSystemSettings(pool);
    if (!settings) {
      return res.status(200).json({ theme: 'light' });
    }
    res.status(200).json({ theme: settings.theme || 'light' });
  } catch (error) {
    logger.error({ err: error });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const LOG_LEVELS = ['error', 'warn', 'info', 'debug'];

// Fields the admin UI can change that alter how the app behaves at runtime,
// rather than only how it looks. Kept separate so they can be audit-logged.
const RUNTIME_KEYS = [
  'app_base_url',
  'log_level',
  'email_enabled',
  'email_host',
  'email_port',
  'email_secure',
  'sender_email',
] as const;

function validateSettings(input: SettingsUpdateInput): string | null {
  const nonEmpty: (keyof SettingsUpdateInput)[] = [
    'app_name',
    'company_name',
    'sender_email',
    'time_zone',
    'app_base_url',
    'email_host',
  ];
  for (const key of nonEmpty) {
    const value = input[key];
    if (value !== undefined && String(value).trim() === '') {
      return `${key} cannot be empty`;
    }
  }
  if (input.log_level !== undefined && !LOG_LEVELS.includes(input.log_level)) {
    return `log_level must be one of: ${LOG_LEVELS.join(', ')}`;
  }
  if (input.email_port !== undefined) {
    const port = Number(input.email_port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return 'email_port must be a number between 1 and 65535';
    }
  }
  for (const key of ['email_enabled', 'email_secure'] as const) {
    if (input[key] !== undefined && typeof input[key] !== 'boolean') {
      return `${key} must be true or false`;
    }
  }
  if (input.theme !== undefined && !['light', 'dark', 'system'].includes(input.theme)) {
    return 'theme must be one of: light, dark, system';
  }
  return null;
}

// Update System Settings
export const updateSystemSettings = async (
  req: CustomRequest,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  try {
    const input = (req.body ?? {}) as SettingsUpdateInput;
    const invalid = validateSettings(input);
    if (invalid) {
      return res.status(400).json({ error: invalid });
    }

    const changedRuntimeKeys = RUNTIME_KEYS.filter(
      (key) => input[key] !== undefined,
    );
    if (changedRuntimeKeys.length > 0) {
      const previous = await settingsModel.getSystemSettings(pool);
      // Changing SMTP or the public base URL over HTTP has a wide blast radius,
      // so every write leaves a trail naming the actor and the before/after value.
      logger.warn(
        {
          actor: {
            id: req.session?.user?.id,
            login: req.session?.user?.login,
          },
          ip: req.ip,
          changes: changedRuntimeKeys.map((key) => ({
            key,
            from: previous?.[key] ?? null,
            to: input[key],
          })),
        },
        'Runtime settings updated',
      );
    }

    const settings = await settingsModel.updateSystemSettings(pool, input);
    res.status(200).json(settings);
  } catch (error) {
    logger.error({ err: error });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get User Settings
export const getUserSettings = async (
  req: CustomRequest,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const settings = await settingsModel.getUserSettings(pool, userId);
    res.status(200).json(settings || {});
  } catch (error) {
    logger.error({ err: error });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update User Settings
export const updateUserSettings = async (
  req: CustomRequest,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const settings = await settingsModel.updateUserSettings(
      pool,
      userId,
      req.body as SettingsUpdateInput,
    );
    res.status(200).json(settings);
  } catch (error) {
    logger.error({ err: error });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Test SMTP Connection
export const testSmtpConnection = async (
  req: Request,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address format',
      });
    }

    const emailConfig = buildEmailConfig(
      await settingsModel.getSystemSettings(pool),
    );

    if (!emailConfig.enabled) {
      return res.status(400).json({
        success: false,
        message: 'Email sending is disabled. Enable it in System Settings.',
      });
    }

    // Create transporter with environment config
    const transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.password,
      },
    });

    // First verify the connection
    await transporter.verify();

    // Send test email
    const info = await transporter.sendMail({
      from: emailConfig.from,
      to: email,
      subject: 'SMTP Test - Project Management App',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4caf50; padding: 20px; text-align: center; color: white; }
            .content { padding: 20px; }
            .success { color: #4caf50; font-size: 24px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>SMTP Test Successful</h2>
            </div>
            <div class="content">
              <p class="success">&#10004; Your SMTP configuration is working correctly!</p>
              <p>This is a test email from your Project Management application.</p>
              <p>If you received this email, your email notifications are properly configured.</p>
              <hr>
              <p><small>Sent at: ${new Date().toISOString()}</small></p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    res.status(200).json({
      success: true,
      message: `Test email sent successfully to ${email}`,
      messageId: info.messageId,
    });
  } catch (error) {
    logger.error({ err: error }, 'SMTP test failed');
    // The raw SMTP error names the host, port and auth outcome; return only the
    // transport's short code and keep the detail in the server log.
    const code = (error as { code?: string })?.code;
    res.status(500).json({
      success: false,
      message: 'SMTP test failed. See the server logs for details.',
      ...(typeof code === 'string' && { code }),
    });
  }
};
