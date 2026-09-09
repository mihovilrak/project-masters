// Jest setup file for notification-service tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.EMAIL_ENABLED = 'false';
process.env.METRICS_ENABLED = 'false';
process.env.LOG_LEVEL = 'error';
process.env.POSTGRES_HOST = 'localhost';
process.env.POSTGRES_PORT = '5432';
process.env.POSTGRES_DB = 'test_db';
process.env.POSTGRES_USER = 'test_user';
process.env.POSTGRES_PASSWORD = 'test_password';
process.env.EMAIL_HOST = 'smtp.test.com';
process.env.EMAIL_PORT = '587';
process.env.EMAIL_SECURE = 'false';
process.env.EMAIL_USER = 'test@test.com';
process.env.EMAIL_PASSWORD = 'test_password';
process.env.EMAIL_FROM = 'Test <test@test.com>';
process.env.PORT = '5001';

// Increase timeout for async tests
jest.setTimeout(30000);

// Silence console during tests
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});
