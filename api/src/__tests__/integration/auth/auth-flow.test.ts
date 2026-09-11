import request from 'supertest';
import { Express } from 'express';
import {
  seedTestUser,
  cleanupTables,
  cookieHeader,
  testPool,
} from '../setup/integration.setup';

let app: Express;

beforeAll(async () => {
  const appModule = await import('../../../app');
  app = appModule.default;
});

describe('Authentication Flow', () => {
  beforeEach(async () => {
    // Clean up test data before each test
    await cleanupTables(['users', 'session']);
  });

  describe('POST /api/login', () => {
    beforeEach(async () => {
      await seedTestUser();
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app).post('/api/login').send({
        login: 'testuser',
        password: 'password123',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should return 401 with incorrect password', async () => {
      const response = await request(app).post('/api/login').send({
        login: 'testuser',
        password: 'wrongpassword',
      });

      expect(response.status).toBe(401);
    });

    it.each([
      ['inactive', 2],
      ['deleted', 3],
    ])('should return 401 for a %s user', async (_label, statusId) => {
      await testPool.query(
        `UPDATE users SET status_id = $1 WHERE login = 'testuser'`,
        [statusId],
      );

      const response = await request(app).post('/api/login').send({
        login: 'testuser',
        password: 'password123',
      });

      expect(response.status).toBe(401);
    });

    it('should return 401 with non-existent user', async () => {
      const response = await request(app).post('/api/login').send({
        login: 'nonexistent',
        password: 'password123',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/check-session', () => {
    it('should return 401 when not logged in', async () => {
      const response = await request(app).get('/api/check-session');

      expect(response.status).toBe(401);
    });

    it('should return user data when logged in', async () => {
      await seedTestUser();

      // Login first
      const loginResponse = await request(app).post('/api/login').send({
        login: 'testuser',
        password: 'password123',
      });

      const cookies = loginResponse.headers['set-cookie'];

      // Check session
      const sessionResponse = await request(app)
        .get('/api/check-session')
        .set('Cookie', cookieHeader(cookies));

      expect(sessionResponse.status).toBe(200);
      expect(sessionResponse.body).toHaveProperty('user');
      expect(sessionResponse.body).toHaveProperty('permissions');
      expect(sessionResponse.body.user.login).toBe('testuser');
    });
  });

  describe('POST /api/logout', () => {
    it('should logout successfully', async () => {
      await seedTestUser();

      // Login first
      const loginResponse = await request(app).post('/api/login').send({
        login: 'testuser',
        password: 'password123',
      });

      const cookies = loginResponse.headers['set-cookie'];
      const cookie = cookieHeader(cookies);

      // Logout
      const logoutResponse = await request(app)
        .post('/api/logout')
        .set('Cookie', cookie);

      expect(logoutResponse.status).toBe(200);

      // Verify session is destroyed
      const sessionResponse = await request(app)
        .get('/api/check-session')
        .set('Cookie', cookie);

      expect(sessionResponse.status).toBe(401);
    });
  });
});
