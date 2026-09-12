import { TemplateDelegate } from 'handlebars';
import { Transporter } from 'nodemailer';

export type TemplateData = Record<string, unknown>;

export interface EmailTemplates {
  [key: string]: TemplateDelegate;
}

export interface MailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
}

export interface EmailInfo {
  messageId: string;
  [key: string]: unknown;
}

export interface EmailService {
  transporter: Transporter;
  templates: EmailTemplates;
  initializeTemplates(): Promise<void>;
  loadTemplate(name: string): Promise<TemplateDelegate>;
  sendEmail(
    to: string,
    subject: string,
    templateName: string,
    data: TemplateData,
  ): Promise<EmailInfo | void>;
  sendEmailWithRetry(
    to: string,
    subject: string,
    templateName: string,
    data: TemplateData,
    retries?: number,
  ): Promise<EmailInfo | void>;
}
