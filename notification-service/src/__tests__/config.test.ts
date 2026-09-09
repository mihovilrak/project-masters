import fs from 'fs';
import os from 'os';
import path from 'path';

// config.ts reads the env file the admin UI rewrites, so every case here needs
// its own file and its own fresh import.
const envFilePath = path.join(os.tmpdir(), 'notification-service-test.env');

const writeEnvFile = (contents: string): void => {
  fs.writeFileSync(envFilePath, contents);
};

const loadConfig = async () => {
  jest.resetModules();
  return import('../config');
};

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ENV_FILE_PATH: envFilePath };
    writeEnvFile('');
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  afterAll(() => {
    fs.rmSync(envFilePath, { force: true });
  });

  describe('email settings', () => {
    it('should take the env file over the process environment', async () => {
      process.env.EMAIL_HOST = 'from-process.example.com';
      writeEnvFile('EMAIL_HOST=from-file.example.com\n');

      const { config } = await loadConfig();

      expect(config.email.host).toBe('from-file.example.com');
    });

    it('should fall back to the default port for an unusable EMAIL_PORT', async () => {
      writeEnvFile('EMAIL_PORT=not-a-port\n');

      const { config } = await loadConfig();

      expect(config.email.port).toBe(587);
    });

    it('should reject an out-of-range EMAIL_PORT', async () => {
      writeEnvFile('EMAIL_PORT=70000\n');

      const { config } = await loadConfig();

      expect(config.email.port).toBe(587);
    });
  });

  describe('appBaseUrl', () => {
    it('should prefer APP_BASE_URL and strip trailing slashes', async () => {
      writeEnvFile(
        'APP_BASE_URL=https://app.example.com///\nFE_URL=https://fe.example.com\n',
      );

      const { config } = await loadConfig();

      expect(config.appBaseUrl).toBe('https://app.example.com');
    });

    it('should fall back to FE_URL', async () => {
      delete process.env.APP_BASE_URL;
      writeEnvFile('FE_URL=https://fe.example.com/\n');

      const { config } = await loadConfig();

      expect(config.appBaseUrl).toBe('https://fe.example.com');
    });
  });

  describe('reloadEmailConfig', () => {
    it('should report no change when the file is untouched', async () => {
      writeEnvFile('EMAIL_HOST=smtp.example.com\n');

      const { reloadEmailConfig } = await loadConfig();

      expect(reloadEmailConfig()).toBe(false);
    });

    it('should report a change and apply the new settings', async () => {
      writeEnvFile('EMAIL_HOST=smtp.example.com\nEMAIL_ENABLED=false\n');

      const { config, reloadEmailConfig } = await loadConfig();
      writeEnvFile('EMAIL_HOST=smtp.other.com\nEMAIL_ENABLED=true\n');

      expect(reloadEmailConfig()).toBe(true);
      expect(config.email.host).toBe('smtp.other.com');
      expect(config.app.emailEnabled).toBe(true);
    });
  });

  describe('validateConfig', () => {
    it('should pass when everything required is present', async () => {
      writeEnvFile('EMAIL_ENABLED=false\n');

      const { validateConfig } = await loadConfig();

      expect(() => validateConfig()).not.toThrow();
    });

    it('should list the missing database variables', async () => {
      delete process.env.POSTGRES_HOST;
      delete process.env.POSTGRES_DB;

      const { validateConfig } = await loadConfig();

      expect(() => validateConfig()).toThrow(/POSTGRES_HOST, POSTGRES_DB/);
    });

    it('should require credentials when email is enabled', async () => {
      writeEnvFile('EMAIL_ENABLED=true\nEMAIL_USER=\nEMAIL_PASSWORD=\n');

      const { validateConfig } = await loadConfig();

      expect(() => validateConfig()).toThrow(/EMAIL_USER, EMAIL_PASSWORD/);
    });
  });
});
