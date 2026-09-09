import { TemplateDelegate } from 'handlebars';
import { Transporter } from 'nodemailer';

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
  [key: string]: any;
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
    data: any,
  ): Promise<EmailInfo | void>;
  sendEmailWithRetry(
    to: string,
    subject: string,
    templateName: string,
    data: any,
    retries?: number,
  ): Promise<EmailInfo | void>;
}
