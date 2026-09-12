import path from 'path';

describe('EmailService', () => {
  // Store original env
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      EMAIL_USER: 'test@test.com',
      EMAIL_PASSWORD: 'testpassword',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('loadTemplate', () => {
    it('should load and compile a template file', async () => {
      const { emailService } = await import('../../services/emailService');

      const template = await emailService.loadTemplate('taskDueSoon');

      expect(template).toBeDefined();
      expect(typeof template).toBe('function');
    });

    it('should cache loaded templates', async () => {
      const { emailService } = await import('../../services/emailService');

      const template1 = await emailService.loadTemplate('default');
      const template2 = await emailService.loadTemplate('default');

      expect(template1).toBe(template2);
    });

    it('should throw error for non-existent template', async () => {
      const { emailService } = await import('../../services/emailService');

      await expect(
        emailService.loadTemplate('nonExistentTemplate'),
      ).rejects.toThrow();
    });

    it('should load taskAssigned template', async () => {
      const { emailService } = await import('../../services/emailService');

      const template = await emailService.loadTemplate('taskAssigned');

      expect(template).toBeDefined();
      expect(typeof template).toBe('function');
    });

    it('should load taskUpdated template', async () => {
      const { emailService } = await import('../../services/emailService');

      const template = await emailService.loadTemplate('taskUpdated');

      expect(template).toBeDefined();
      expect(typeof template).toBe('function');
    });

    it('should load taskComment template', async () => {
      const { emailService } = await import('../../services/emailService');

      const template = await emailService.loadTemplate('taskComment');

      expect(template).toBeDefined();
      expect(typeof template).toBe('function');
    });

    it('should load taskCompleted template', async () => {
      const { emailService } = await import('../../services/emailService');

      const template = await emailService.loadTemplate('taskCompleted');

      expect(template).toBeDefined();
      expect(typeof template).toBe('function');
    });

    it('should load projectUpdate template', async () => {
      const { emailService } = await import('../../services/emailService');

      const template = await emailService.loadTemplate('projectUpdate');

      expect(template).toBeDefined();
      expect(typeof template).toBe('function');
    });
  });

  describe('initializeTemplates', () => {
    it('should preload every notification template', async () => {
      const { emailService } = await import('../../services/emailService');

      await emailService.initializeTemplates();

      expect(Object.keys(emailService.templates).sort()).toEqual([
        'default',
        'projectUpdate',
        'taskAssigned',
        'taskComment',
        'taskCompleted',
        'taskDueSoon',
        'taskUpdated',
      ]);
    });

    it('should rethrow when the template directory is missing', async () => {
      process.env.TEMPLATES_PATH = path.join(__dirname, 'no-such-dir');
      jest.resetModules();

      const { emailService } = await import('../../services/emailService');

      await expect(emailService.initializeTemplates()).rejects.toThrow();

      delete process.env.TEMPLATES_PATH;
    });
  });

  describe('refreshTransport', () => {
    it('should replace the transporter and close the previous one', async () => {
      const { emailService } = await import('../../services/emailService');

      const previous = emailService.transporter;
      const closeSpy = jest.spyOn(previous, 'close');

      emailService.refreshTransport();

      expect(emailService.transporter).not.toBe(previous);
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('template rendering', () => {
    it('should render template with data', async () => {
      const { emailService } = await import('../../services/emailService');

      const template = await emailService.loadTemplate('default');
      const html = template({
        userName: 'John Doe',
        message: 'Test message',
        taskUrl: 'http://example.com/task/1',
      });

      expect(html).toContain('John Doe');
      expect(html).toContain('http://example.com/task/1');
    });

    it('should render taskDueSoon template correctly', async () => {
      const { emailService } = await import('../../services/emailService');

      const template = await emailService.loadTemplate('taskDueSoon');
      const html = template({
        userName: 'Jane Doe',
        taskName: 'Complete report',
        dueText: 'tomorrow',
        projectName: 'Q1 Project',
        priority: 'High',
        status: 'In Progress',
        taskUrl: 'http://example.com/task/2',
      });

      expect(html).toContain('Jane Doe');
      expect(html).toContain('Complete report');
      expect(html).toContain('tomorrow');
      expect(html).toContain('Q1 Project');
    });
  });

  describe('transporter', () => {
    it('should have transporter defined', async () => {
      const { emailService } = await import('../../services/emailService');

      expect(emailService.transporter).toBeDefined();
    });

    it('should have templates object', async () => {
      const { emailService } = await import('../../services/emailService');

      expect(emailService.templates).toBeDefined();
      expect(typeof emailService.templates).toBe('object');
    });
  });

  describe('sendEmail', () => {
    it('should not send email when email sending is disabled', async () => {
      jest.resetModules();

      const { emailService } = await import('../../services/emailService');

      const result = await emailService.sendEmail(
        'recipient@test.com',
        'Test Subject',
        'default',
        { userName: 'Test User' },
      );

      expect(result).toBeUndefined();
    });
  });

  describe('sendEmailWithRetry', () => {
    it('should call sendEmail method', async () => {
      jest.resetModules();

      const { emailService } = await import('../../services/emailService');
      const sendEmailSpy = jest.spyOn(emailService, 'sendEmail');

      await emailService.sendEmailWithRetry(
        'recipient@test.com',
        'Test Subject',
        'default',
        { userName: 'Test User' },
        1,
      );

      expect(sendEmailSpy).toHaveBeenCalledWith(
        'recipient@test.com',
        'Test Subject',
        'default',
        { userName: 'Test User' },
      );
    });
  });
});
