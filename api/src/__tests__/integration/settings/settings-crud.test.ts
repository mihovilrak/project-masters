import request from 'supertest';
import { Express } from 'express';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  cleanupTables,
  cookieHeader,
  seedTestUser,
  testPool,
} from '../setup/integration.setup';

let app: Express;
let admin: any;
let adminCookies = '';
let regularUser: any;
let regularCookies = '';
let envFilePath: string;

beforeAll(async () => {
  const appModule = await import('../../../app');
  app = appModule.default;
});

const seedAdminUser = async () => {
  const result = await testPool.query(`
    INSERT INTO users (login, email, password, name, surname, role_id, status_id)
    VALUES ('adminuser', 'admin@example.com', crypt(
      'password123',
      gen_salt('bf', 12)
    ), 'Admin', 'User', (SELECT id FROM roles WHERE name = 'Admin'), 1)
    ON CONFLICT (login) DO UPDATE SET
      password = EXCLUDED.password,
      role_id = EXCLUDED.role_id,
      updated_on = CURRENT_TIMESTAMP
    RETURNING *
  `);
  return result.rows[0];
};

beforeAll(async () => {
  await cleanupTables(['projects', 'project_users', 'session', 'users']);

  admin = await seedAdminUser();
  regularUser = await seedTestUser();

  const adminLogin = await request(app).post('/api/login').send({
    login: 'adminuser',
    password: 'password123',
  });
  adminCookies = cookieHeader(adminLogin.headers['set-cookie']);

  const regularLogin = await request(app).post('/api/login').send({
    login: 'testuser',
    password: 'password123',
  });
  regularCookies = cookieHeader(regularLogin.headers['set-cookie']);
});

beforeEach(async () => {
  envFilePath = path.join(
    os.tmpdir(),
    `pm-settings-test-${process.pid}-${Date.now()}.env`,
  );
  process.env.ENV_FILE_PATH = envFilePath;
  fs.writeFileSync(
    envFilePath,
    ['NODE_ENV=test', 'PORT=3000', 'LOG_LEVEL=info', 'EMAIL_ENABLED=false'].join('\n') + '\n',
    'utf-8',
  );
});

afterEach(() => {
  delete process.env.ENV_FILE_PATH;
  if (envFilePath && fs.existsSync(envFilePath)) {
    fs.unlinkSync(envFilePath);
  }
});

describe('GET/PUT /api/settings/app_settings', () => {
  it('returns 401 when not authenticated', async () => {
    const response = await request(app).get('/api/settings/app_settings');
    expect(response.status).toBe(401);
  });

  it('returns 403 for a non-admin user', async () => {
    const response = await request(app)
      .get('/api/settings/app_settings')
      .set('Cookie', regularCookies);
    expect(response.status).toBe(403);
  });

  it('gets and updates system settings as admin', async () => {
    const getResponse = await request(app)
      .get('/api/settings/app_settings')
      .set('Cookie', adminCookies);
    expect(getResponse.status).toBe(200);

    const putResponse = await request(app)
      .put('/api/settings/app_settings')
      .set('Cookie', adminCookies)
      .send({
        app_name: 'Updated App',
        company_name: 'Updated Co',
        sender_email: 'sender@example.com',
        time_zone: 'UTC',
        theme: 'dark',
        welcome_message: 'Welcome!',
      });

    expect(putResponse.status).toBe(200);
    expect(putResponse.body).toMatchObject({
      app_name: 'Updated App',
      company_name: 'Updated Co',
      theme: 'dark',
    });
  });
});

describe('GET /api/settings/app_theme and /timezones', () => {
  it('returns 401 for app_theme when not authenticated', async () => {
    const response = await request(app).get('/api/settings/app_theme');
    expect(response.status).toBe(401);
  });

  it('returns the theme for any authenticated user', async () => {
    const response = await request(app)
      .get('/api/settings/app_theme')
      .set('Cookie', regularCookies);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('theme');
  });

  it('returns timezones for any authenticated user', async () => {
    const response = await request(app)
      .get('/api/settings/timezones')
      .set('Cookie', regularCookies);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});

describe('GET/PUT /api/settings/user_settings', () => {
  it('returns 401 when not authenticated', async () => {
    const response = await request(app).get('/api/settings/user_settings');
    expect(response.status).toBe(401);
  });

  it('creates settings on first PUT and partially updates them after', async () => {
    const firstPut = await request(app)
      .put('/api/settings/user_settings')
      .set('Cookie', regularCookies)
      .send({ theme: 'dark', language: 'en', notifications_enabled: true });

    expect(firstPut.status).toBe(200);
    expect(firstPut.body).toMatchObject({
      theme: 'dark',
      language: 'en',
      notifications_enabled: true,
    });

    const secondPut = await request(app)
      .put('/api/settings/user_settings')
      .set('Cookie', regularCookies)
      .send({ theme: 'light' });

    expect(secondPut.status).toBe(200);
    expect(secondPut.body).toMatchObject({
      theme: 'light',
      language: 'en',
      notifications_enabled: true,
    });

    const getResponse = await request(app)
      .get('/api/settings/user_settings')
      .set('Cookie', regularCookies);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body).toMatchObject({ theme: 'light' });
  });
});

describe('GET/PATCH /api/settings/env', () => {
  it('returns 401 when not authenticated', async () => {
    const response = await request(app).get('/api/settings/env');
    expect(response.status).toBe(401);
  });

  it('returns 403 for a non-admin user', async () => {
    const response = await request(app)
      .get('/api/settings/env')
      .set('Cookie', regularCookies);
    expect(response.status).toBe(403);
  });

  it('reads entries with masked secrets', async () => {
    const response = await request(app)
      .get('/api/settings/env')
      .set('Cookie', adminCookies);
    expect(response.status).toBe(200);
    const port = response.body.find((entry: any) => entry.key === 'PORT');
    expect(port).toMatchObject({ value: '3000', masked: false });
  });

  it('updates editable keys and persists them to the env file', async () => {
    const response = await request(app)
      .patch('/api/settings/env')
      .set('Cookie', adminCookies)
      .send({ updates: { PORT: '4000', LOG_LEVEL: 'debug' } });

    expect(response.status).toBe(200);
    expect(response.body.restartRequired).toBe(true);

    const written = fs.readFileSync(envFilePath, 'utf-8');
    expect(written).toContain('PORT=4000');
    expect(written).toContain('LOG_LEVEL=debug');
  });

  it('rejects an invalid PORT value', async () => {
    const response = await request(app)
      .patch('/api/settings/env')
      .set('Cookie', adminCookies)
      .send({ updates: { PORT: '99999' } });
    expect(response.status).toBe(400);
  });

  it('rejects an invalid LOG_LEVEL value', async () => {
    const response = await request(app)
      .patch('/api/settings/env')
      .set('Cookie', adminCookies)
      .send({ updates: { LOG_LEVEL: 'verbose' } });
    expect(response.status).toBe(400);
  });

  it('rejects a non-editable key', async () => {
    const response = await request(app)
      .patch('/api/settings/env')
      .set('Cookie', adminCookies)
      .send({ updates: { NODE_ENV: 'production' } });
    expect(response.status).toBe(400);
  });
});

describe('POST /api/settings/test-smtp', () => {
  it('returns 401 when not authenticated', async () => {
    const response = await request(app)
      .post('/api/settings/test-smtp')
      .send({ email: 'someone@example.com' });
    expect(response.status).toBe(401);
  });

  it('returns 403 for a non-admin user', async () => {
    const response = await request(app)
      .post('/api/settings/test-smtp')
      .set('Cookie', regularCookies)
      .send({ email: 'someone@example.com' });
    expect(response.status).toBe(403);
  });

  it('returns 400 when email is missing', async () => {
    const response = await request(app)
      .post('/api/settings/test-smtp')
      .set('Cookie', adminCookies)
      .send({});
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('returns 400 for an invalid email format', async () => {
    const response = await request(app)
      .post('/api/settings/test-smtp')
      .set('Cookie', adminCookies)
      .send({ email: 'not-an-email' });
    expect(response.status).toBe(400);
  });

  it('returns 400 when email sending is disabled', async () => {
    const response = await request(app)
      .post('/api/settings/test-smtp')
      .set('Cookie', adminCookies)
      .send({ email: 'someone@example.com' });
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/disabled/i);
  });
});
