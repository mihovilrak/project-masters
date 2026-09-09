import { Request, Response } from 'express';
import { Pool } from 'pg';
import nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import * as settingsModel from '../models/settingsModel';
import { CustomRequest } from '../types/express';
import { SettingsUpdateInput } from '../types/settings';
import logger from '../utils/logger';
import { readEmailConfig } from '../config';

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

// Update System Settings
export const updateSystemSettings = async (
  req: Request,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  try {
    const settings = await settingsModel.updateSystemSettings(
      pool,
      req.body as SettingsUpdateInput,
    );
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

// Allowed env keys to expose. Secrets are masked and not editable.
const ALLOWED_ENV_KEYS = [
  'NODE_ENV',
  'PORT',
  'FE_URL',
  'LOG_LEVEL',
  'EMAIL_ENABLED',
  'EMAIL_HOST',
  'EMAIL_PORT',
  'EMAIL_FROM',
];
const EDITABLE_ENV_KEYS = [
  'PORT',
  'FE_URL',
  'LOG_LEVEL',
  'EMAIL_ENABLED',
  'EMAIL_HOST',
  'EMAIL_PORT',
  'EMAIL_FROM',
];
const SECRET_PATTERNS = /PASSWORD|SECRET|KEY|TOKEN|CREDENTIAL/i;
const LOG_LEVELS = ['error', 'warn', 'info', 'debug'];

function validateEnvValue(
  key: string,
  value: string,
): { valid: boolean; message?: string } {
  if (value === undefined || value === null) {
    return { valid: false, message: 'Value is required' };
  }
  const v = String(value).trim();
  switch (key) {
    case 'PORT': {
      const num = parseInt(v, 10);
      if (Number.isNaN(num) || num < 1 || num > 65535) {
        return {
          valid: false,
          message: 'PORT must be a number between 1 and 65535',
        };
      }
      return { valid: true };
    }
    case 'LOG_LEVEL':
      if (!LOG_LEVELS.includes(v.toLowerCase())) {
        return {
          valid: false,
          message: `LOG_LEVEL must be one of: ${LOG_LEVELS.join(', ')}`,
        };
      }
      return { valid: true };
    case 'EMAIL_PORT': {
      const num = parseInt(v, 10);
      if (Number.isNaN(num) || num < 1 || num > 65535) {
        return {
          valid: false,
          message: 'EMAIL_PORT must be a number between 1 and 65535',
        };
      }
      return { valid: true };
    }
    case 'EMAIL_ENABLED':
      if (v !== 'true' && v !== 'false') {
        return { valid: false, message: 'EMAIL_ENABLED must be true or false' };
      }
      return { valid: true };
    case 'FE_URL':
    case 'EMAIL_HOST':
    case 'EMAIL_FROM':
      if (v.length === 0) {
        return { valid: false, message: `${key} cannot be empty` };
      }
      return { valid: true };
    default:
      return { valid: true };
  }
}

function getEnvFilePath(): string {
  return process.env.ENV_FILE_PATH || path.join(process.cwd(), '.env');
}

// The container filesystem is read-only apart from mounted volumes, so the
// settings file's directory may not exist on first write.
function ensureEnvFileDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readEnvFile(filePath: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return out;
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq > 0) {
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, '');
      out[key] = value;
    }
  }
  return out;
}

function formatEnvValue(value: string): string {
  if (!/[\s#="'\\]/.test(value)) return value;
  return `"${value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')}"`;
}

function writeEnvFile(filePath: string, updates: Record<string, string>): void {
  const original = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, 'utf-8')
    : '';
  const newline = original.includes('\r\n') ? '\r\n' : '\n';
  const hadTrailingNewline = /\r?\n$/.test(original);
  const lines = original ? original.split(/\r?\n/) : [];
  if (hadTrailingNewline) lines.pop();

  const pending = new Map(Object.entries(updates));
  const updatedLines = lines.map((line) => {
    const match = line.match(/^(\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*).*$/);
    if (!match || !pending.has(match[2])) return line;
    const value = pending.get(match[2]) ?? '';
    pending.delete(match[2]);
    return `${match[1]}${formatEnvValue(value)}`;
  });

  for (const [key, value] of pending) {
    updatedLines.push(`${key}=${formatEnvValue(value)}`);
  }

  ensureEnvFileDir(filePath);
  fs.writeFileSync(
    filePath,
    updatedLines.join(newline) + (updatedLines.length ? newline : ''),
    'utf-8',
  );
}

function buildEnvEntries(filePath: string) {
  const values = { ...process.env, ...readEnvFile(filePath) };
  return ALLOWED_ENV_KEYS.map((key) => {
    const value = values[key];
    const masked = SECRET_PATTERNS.test(key) || !value;
    return { key, value: masked ? '****' : (value ?? ''), masked };
  });
}

export const getEnvSettings = async (
  req: Request,
  res: Response,
  _pool: Pool,
): Promise<Response | void> => {
  try {
    res.status(200).json(buildEnvEntries(getEnvFilePath()));
  } catch (error) {
    logger.error({ err: error });
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateEnvSettings = async (
  req: CustomRequest,
  res: Response,
  _pool: Pool,
): Promise<Response | void> => {
  try {
    const body = req.body as { updates?: Record<string, string> };
    const updates =
      body?.updates && typeof body.updates === 'object' ? body.updates : {};
    const filePath = getEnvFilePath();

    for (const key of Object.keys(updates)) {
      if (!EDITABLE_ENV_KEYS.includes(key)) {
        return res.status(400).json({ error: `Key "${key}" is not editable` });
      }
      const value = String(updates[key] ?? '').trim();
      const validation = validateEnvValue(key, value);
      if (!validation.valid) {
        return res
          .status(400)
          .json({ error: validation.message || 'Invalid value' });
      }
    }

    const normalizedUpdates = Object.fromEntries(
      Object.entries(updates).map(([key, value]) => [key, String(value).trim()]),
    );

    // Rewriting the process environment over HTTP is a wide blast radius, so
    // every write leaves a trail naming the actor and the before/after value.
    const previous = readEnvFile(filePath);
    logger.warn(
      {
        actor: {
          id: req.session?.user?.id,
          login: req.session?.user?.login,
        },
        ip: req.ip,
        changes: Object.entries(normalizedUpdates).map(([key, value]) => ({
          key,
          from: SECRET_PATTERNS.test(key) ? '****' : (previous[key] ?? null),
          to: SECRET_PATTERNS.test(key) ? '****' : value,
        })),
      },
      'Environment settings updated',
    );

    writeEnvFile(filePath, normalizedUpdates);

    res.status(200).json({
      entries: buildEnvEntries(filePath),
      restartRequired: true,
      message: 'Settings saved. Restart the application to apply them.',
    });
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

    const emailConfig = readEmailConfig();

    // Check if email is enabled
    if (!emailConfig.enabled) {
      return res.status(400).json({
        success: false,
        message:
          'Email sending is disabled. Set EMAIL_ENABLED=true in environment.',
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
