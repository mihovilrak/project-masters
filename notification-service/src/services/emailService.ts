import nodemailer from 'nodemailer';
import handlebars, { TemplateDelegate } from 'handlebars';
import { promises as fs } from 'fs';
import path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';
import {
  EmailService as IEmailService,
  EmailTemplates,
  MailOptions,
  EmailInfo,
} from '../types/email.types';

class EmailService implements IEmailService {
  public transporter: nodemailer.Transporter;
  public templates: EmailTemplates;
  private templateDir: string;

  constructor() {
    this.transporter = EmailService.createTransport();
    this.templates = {};
    // The Docker image sets TEMPLATES_PATH; the fallback matches the compiled
    // layout, where templates sit beside services/ under dist/.
    this.templateDir =
      process.env.TEMPLATES_PATH ?? path.join(__dirname, '..', 'templates');
  }

  private static createTransport(): nodemailer.Transporter {
    return nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: config.email.auth,
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });
  }

  // Called when the admin UI changes SMTP settings; the old pool is closed so
  // its keep-alive connections do not outlive the credentials they used.
  refreshTransport(): void {
    const previous = this.transporter;
    this.transporter = EmailService.createTransport();
    previous.close();
  }

  async initializeTemplates(): Promise<void> {
    try {
      const files = await fs.readdir(this.templateDir);

      for (const file of files) {
        if (file.endsWith('.hbs')) {
          const templateName = path.basename(file, '.hbs');
          await this.loadTemplate(templateName);
        }
      }
    } catch (error) {
      logger.error(
        { err: error, templateDir: this.templateDir },
        'Failed to initialize email templates',
      );
      throw error;
    }
  }

  async loadTemplate(name: string): Promise<TemplateDelegate> {
    if (this.templates[name]) {
      return this.templates[name];
    }

    const templatePath = path.join(this.templateDir, `${name}.hbs`);
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    this.templates[name] = handlebars.compile(templateContent);
    return this.templates[name];
  }

  async sendEmail(
    to: string,
    subject: string,
    templateName: string,
    data: any,
  ): Promise<EmailInfo | void> {
    if (!config.app.emailEnabled) {
      logger.info('Email sending is disabled');
      return;
    }

    try {
      const template = await this.loadTemplate(templateName);
      const html = template(data);

      const mailOptions: MailOptions = {
        from: config.email.from,
        to,
        subject,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info({ messageId: info.messageId }, 'Email sent');
      return info;
    } catch (error) {
      logger.error({ err: error }, 'Failed to send email');
      throw error;
    }
  }

  async sendEmailWithRetry(
    to: string,
    subject: string,
    templateName: string,
    data: any,
    retries = 3,
  ): Promise<EmailInfo | void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await this.sendEmail(to, subject, templateName, data);
      } catch (error) {
        logger.warn({ err: error, attempt }, 'Email attempt failed');
        if (attempt === retries) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
}

export const emailService = new EmailService();
