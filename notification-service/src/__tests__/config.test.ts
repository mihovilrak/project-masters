import { AppSettingsRow } from '../types/config.types';

const loadConfig = async () => {
  jest.resetModules();
  return import('../config');
};

const row = (overrides: Partial<AppSettingsRow> = {}): AppSettingsRow => ({
  sender_email: 'no-reply@example.com',
  app_base_url: 'https://app.example.com',
  email_enabled: true,
  email_host: 'smtp.example.com',
  email_port: 2525,
  email_secure: true,
  ...overrides,
});

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('applySettings', () => {
    it('should take SMTP settings from the database row', async () => {
      const { config, applySettings } = await loadConfig();

      expect(applySettings(row())).toBe(true);
      expect(config.email.host).toBe('smtp.example.com');
      expect(config.email.port).toBe(2525);
      expect(config.email.secure).toBe(true);
      expect(config.email.from).toBe('no-reply@example.com');
      expect(config.app.emailEnabled).toBe(true);
    });

    it('should keep credentials in the environment', async () => {
      process.env.EMAIL_USER = 'user@example.com';
      process.env.EMAIL_PASSWORD = 'secret';

      const { config, applySettings } = await loadConfig();
      applySettings(row());

      expect(config.email.auth).toEqual({
        user: 'user@example.com',
        pass: 'secret',
      });
    });

    it('should fall back to defaults for an unusable port', async () => {
      const { config, applySettings } = await loadConfig();

      applySettings(row({ email_port: 0 }));

      expect(config.email.port).toBe(587);
    });

    it('should strip trailing slashes from the base URL', async () => {
      const { config, applySettings } = await loadConfig();

      applySettings(row({ app_base_url: 'https://app.example.com///' }));

      expect(config.appBaseUrl).toBe('https://app.example.com');
    });

    it('should report no change when only non-SMTP fields differ', async () => {
      const { applySettings } = await loadConfig();
      applySettings(row());

      expect(applySettings(row({ app_base_url: 'https://other.example.com' })))
        .toBe(false);
    });

    it('should fall back to defaults when there is no row', async () => {
      const { config, applySettings } = await loadConfig();
      applySettings(row());

      applySettings(null);

      expect(config.email.host).toBe('smtp.gmail.com');
      expect(config.app.emailEnabled).toBe(false);
      expect(config.appBaseUrl).toBe('http://localhost:3000');
    });
  });

  describe('validateConfig', () => {
    it('should pass when everything required is present', async () => {
      const { validateConfig } = await loadConfig();

      expect(() => validateConfig()).not.toThrow();
    });

    it('should list the missing database variables', async () => {
      delete process.env.POSTGRES_HOST;
      delete process.env.POSTGRES_DB;

      const { validateConfig } = await loadConfig();

      expect(() => validateConfig()).toThrow(/POSTGRES_HOST, POSTGRES_DB/);
    });
  });
});
