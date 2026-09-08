import request from 'supertest';
import { Express } from 'express';
import {
  cleanupTables,
  cookieHeader,
  seedLowPrivilegeUser,
  seedTestProject,
  seedTestTask,
  seedTestUser,
  testPool,
} from '../setup/integration.setup';

let app: Express;
let owner: any;
let ownerCookies = '';
let project: any;
let taskId: number;

beforeAll(async () => {
  const appModule = await import('../../../app');
  app = appModule.default;
});

beforeEach(async () => {
  await cleanupTables([
    'comments',
    'files',
    'notifications',
    'time_logs',
    'task_tags',
    'watchers',
    'tasks',
    'project_users',
    'projects',
    'session',
    'users',
  ]);

  owner = await seedTestUser();
  project = await seedTestProject(owner.id);
  taskId = (await seedTestTask(project.id, owner.id)).task_id;

  const loginResponse = await request(app).post('/api/login').send({
    login: 'testuser',
    password: 'password123',
  });
  ownerCookies = cookieHeader(loginResponse.headers['set-cookie']);
});

describe('GET /api/files', () => {
  it('returns 401 when not authenticated', async () => {
    const response = await request(app).get(`/api/files?taskId=${taskId}`);
    expect(response.status).toBe(401);
  });

  it('returns 400 when taskId is missing', async () => {
    const response = await request(app)
      .get('/api/files')
      .set('Cookie', ownerCookies);
    expect(response.status).toBe(400);
  });

  it('returns an empty array when the task has no files', async () => {
    const response = await request(app)
      .get(`/api/files?taskId=${taskId}`)
      .set('Cookie', ownerCookies);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('returns 403 for a task outside the user project', async () => {
    const outsider = await seedLowPrivilegeUser();
    const loginResponse = await request(app).post('/api/login').send({
      login: outsider.login,
      password: 'password123',
    });
    const outsiderCookies = cookieHeader(loginResponse.headers['set-cookie']);

    const response = await request(app)
      .get(`/api/files?taskId=${taskId}`)
      .set('Cookie', outsiderCookies);
    expect(response.status).toBe(403);
  });
});

describe('POST /api/files', () => {
  it('returns 401 when not authenticated', async () => {
    const response = await request(app)
      .post(`/api/files?taskId=${taskId}`)
      .attach('file', Buffer.from('hello'), 'note.txt');
    expect(response.status).toBe(401);
  });

  it('returns 400 when taskId is missing', async () => {
    const response = await request(app)
      .post('/api/files')
      .set('Cookie', ownerCookies)
      .attach('file', Buffer.from('hello'), 'note.txt');
    expect(response.status).toBe(400);
  });

  it('uploads an allowed file type', async () => {
    const response = await request(app)
      .post(`/api/files?taskId=${taskId}`)
      .set('Cookie', ownerCookies)
      .attach('file', Buffer.from('hello world'), 'note.txt');

    expect(response.status).toBe(201);
    expect(response.body.original_name).toBe('note.txt');
    expect(response.body.task_id).toBe(taskId);

    const stored = await testPool.query('SELECT * FROM files WHERE task_id = $1', [
      taskId,
    ]);
    expect(stored.rows).toHaveLength(1);
  });

  it('rejects a disallowed file type', async () => {
    const response = await request(app)
      .post(`/api/files?taskId=${taskId}`)
      .set('Cookie', ownerCookies)
      .attach('file', Buffer.from('MZ'), 'malware.exe');

    expect(response.status).toBe(400);

    const stored = await testPool.query('SELECT * FROM files WHERE task_id = $1', [
      taskId,
    ]);
    expect(stored.rows).toHaveLength(0);
  });

  it('returns 403 for a task outside the user project', async () => {
    const outsider = await seedLowPrivilegeUser();
    const loginResponse = await request(app).post('/api/login').send({
      login: outsider.login,
      password: 'password123',
    });
    const outsiderCookies = cookieHeader(loginResponse.headers['set-cookie']);

    const response = await request(app)
      .post(`/api/files?taskId=${taskId}`)
      .set('Cookie', outsiderCookies)
      .attach('file', Buffer.from('hello'), 'note.txt');
    expect(response.status).toBe(403);
  });
});

describe('GET /api/files/:fileId/download', () => {
  let fileId: number;

  beforeEach(async () => {
    const uploadResponse = await request(app)
      .post(`/api/files?taskId=${taskId}`)
      .set('Cookie', ownerCookies)
      .attach('file', Buffer.from('hello world'), 'note.txt');
    fileId = uploadResponse.body.id;
  });

  it('downloads the file for a project member', async () => {
    const response = await request(app)
      .get(`/api/files/${fileId}/download`)
      .set('Cookie', ownerCookies);

    expect(response.status).toBe(200);
    expect(response.headers['content-disposition']).toContain('note.txt');
  });

  it('returns 404 for a non-existent file', async () => {
    const response = await request(app)
      .get('/api/files/999999/download')
      .set('Cookie', ownerCookies);
    expect(response.status).toBe(404);
  });

  it('returns 403 for a user without task access', async () => {
    const outsider = await seedLowPrivilegeUser();
    const loginResponse = await request(app).post('/api/login').send({
      login: outsider.login,
      password: 'password123',
    });
    const outsiderCookies = cookieHeader(loginResponse.headers['set-cookie']);

    const response = await request(app)
      .get(`/api/files/${fileId}/download`)
      .set('Cookie', outsiderCookies);
    expect(response.status).toBe(403);
  });

  it('returns 401 when not authenticated', async () => {
    const response = await request(app).get(`/api/files/${fileId}/download`);
    expect(response.status).toBe(401);
  });
});

describe('DELETE /api/files/:fileId', () => {
  let fileId: number;

  beforeEach(async () => {
    const uploadResponse = await request(app)
      .post(`/api/files?taskId=${taskId}`)
      .set('Cookie', ownerCookies)
      .attach('file', Buffer.from('hello world'), 'note.txt');
    fileId = uploadResponse.body.id;
  });

  it('deletes the file for its owner', async () => {
    const response = await request(app)
      .delete(`/api/files/${fileId}`)
      .set('Cookie', ownerCookies);

    expect(response.status).toBe(200);

    const stored = await testPool.query('SELECT * FROM files WHERE id = $1', [
      fileId,
    ]);
    expect(stored.rows).toHaveLength(0);
  });

  it('returns 401 when not authenticated', async () => {
    const response = await request(app).delete(`/api/files/${fileId}`);
    expect(response.status).toBe(401);
  });
});
