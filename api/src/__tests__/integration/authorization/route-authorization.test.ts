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

type Method = 'post' | 'put' | 'patch' | 'delete';

let app: Express;
let limitedCookies = '';
let owner: any;
let limitedUser: any;
let memberProject: any;
let privateProject: any;
let memberTaskId: number;
let privateTaskId: number;
let ownerCommentId: number;
let ownerTimeLogId: number;
let ownerFileId: number;
let ownerNotificationId: number;

beforeAll(async () => {
  const appModule = await import('../../../app');
  app = appModule.default;

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
  limitedUser = await seedLowPrivilegeUser();
  memberProject = await seedTestProject(owner.id);
  privateProject = await seedTestProject(owner.id);

  await testPool.query(
    'INSERT INTO project_users (project_id, user_id) VALUES ($1, $2)',
    [memberProject.id, limitedUser.id],
  );

  memberTaskId = (await seedTestTask(memberProject.id, owner.id)).task_id;
  privateTaskId = (await seedTestTask(privateProject.id, owner.id)).task_id;

  ownerCommentId = (
    await testPool.query(
      `INSERT INTO comments (task_id, user_id, comment)
       VALUES ($1, $2, 'Owner comment') RETURNING id`,
      [memberTaskId, owner.id],
    )
  ).rows[0].id;

  ownerTimeLogId = (
    await testPool.query(
      `INSERT INTO time_logs
       (task_id, user_id, spent_time, description, activity_type_id)
       VALUES ($1, $2, 1, 'Owner time', 1) RETURNING id`,
      [memberTaskId, owner.id],
    )
  ).rows[0].id;

  ownerFileId = (
    await testPool.query(
      `INSERT INTO files
       (task_id, user_id, original_name, stored_name, size, mime_type, file_path)
       VALUES ($1, $2, 'owner.txt', 'owner.txt', 1, 'text/plain', 'uploads/owner.txt')
       RETURNING id`,
      [memberTaskId, owner.id],
    )
  ).rows[0].id;

  ownerNotificationId = (
    await testPool.query(
      `INSERT INTO notifications (user_id, type_id, title, message)
       VALUES ($1, 1, 'Owner notification', 'Private') RETURNING id`,
      [owner.id],
    )
  ).rows[0].id;

  const loginResponse = await request(app).post('/api/login').send({
    login: 'limiteduser',
    password: 'password123',
  });
  expect(loginResponse.status).toBe(200);
  limitedCookies = cookieHeader(loginResponse.headers['set-cookie']);
});

const requestAsLimitedUser = (method: Method, path: string, body = {}) =>
  request(app)[method](path).set('Cookie', limitedCookies).send(body);

describe('route authorization', () => {
  const adminMutations: Array<[Method, string, object]> = [
    ['post', '/api/users', { login: 'blocked' }],
    ['put', `/api/users/1`, { role_id: 1 }],
    ['patch', `/api/users/1/status`, { status_id: 2 }],
    ['delete', `/api/users/1`, {}],
    ['post', '/api/roles', { name: 'Blocked' }],
    ['put', '/api/roles/2', { name: 'Blocked' }],
    ['delete', '/api/roles/2', {}],
    ['post', '/api/tags', { name: 'Blocked' }],
    ['put', '/api/tags/1', { name: 'Blocked' }],
    ['delete', '/api/tags/1', {}],
    ['put', '/api/settings/app_settings', { app_name: 'Blocked' }],
    ['post', '/api/settings/test-smtp', { email: 'blocked@example.com' }],
    ['post', '/api/admin/task-types', { name: 'Blocked' }],
    ['put', '/api/admin/task-types/1', { name: 'Blocked' }],
    ['delete', '/api/admin/task-types/1', {}],
    ['post', '/api/admin/activity-types', { name: 'Blocked' }],
    ['put', '/api/admin/activity-types/1', { name: 'Blocked' }],
    ['delete', '/api/admin/activity-types/1', {}],
  ];

  it.each(adminMutations)(
    '%s %s rejects a non-admin',
    async (method, path, body) => {
      const response = await requestAsLimitedUser(method, path, body);
      expect(response.status).toBe(403);
    },
  );

  it('rejects project mutations without project permissions', async () => {
    const cases: Array<[Method, string, object]> = [
      ['post', '/api/projects', { name: 'Blocked' }],
      ['put', `/api/projects/${memberProject.id}`, { name: 'Blocked' }],
      ['patch', `/api/projects/${memberProject.id}/status`, {}],
      ['delete', `/api/projects/${memberProject.id}`, {}],
      [
        'post',
        `/api/projects/${memberProject.id}/members`,
        { user_id: owner.id },
      ],
      [
        'delete',
        `/api/projects/${memberProject.id}/members`,
        { user_id: owner.id },
      ],
    ];

    for (const [method, path, body] of cases) {
      const response = await requestAsLimitedUser(method, path, body);
      expect(response.status).toBe(403);
    }
  });

  it('rejects task and nested mutations outside the user project', async () => {
    const cases: Array<[Method, string, object]> = [
      ['post', '/api/tasks', { project_id: privateProject.id }],
      ['put', `/api/tasks/${privateTaskId}`, { name: 'Blocked' }],
      ['patch', `/api/tasks/${privateTaskId}`, { name: 'Blocked' }],
      ['patch', `/api/tasks/${privateTaskId}/change-status`, { statusId: 2 }],
      ['delete', `/api/tasks/${privateTaskId}`, {}],
      ['post', `/api/tasks/${privateTaskId}/comments`, { comment: 'Blocked' }],
      ['put', `/api/tasks/${privateTaskId}/comments/1`, { comment: 'Blocked' }],
      ['delete', `/api/tasks/${privateTaskId}/comments/1`, {}],
      ['post', `/api/tasks/${privateTaskId}/files`, {}],
      ['post', `/api/tasks/${privateTaskId}/tags`, { tagIds: [1] }],
      ['delete', `/api/tasks/${privateTaskId}/tags/1`, {}],
      [
        'post',
        `/api/tasks/${privateTaskId}/watchers`,
        { userId: limitedUser.id },
      ],
      ['delete', `/api/tasks/${privateTaskId}/watchers/${limitedUser.id}`, {}],
      ['post', `/api/time-logs/tasks/${privateTaskId}/logs`, { spent_time: 1 }],
    ];

    for (const [method, path, body] of cases) {
      const response = await requestAsLimitedUser(method, path, body);
      expect(response.status).toBe(403);
    }
  });

  it("rejects mutations of another project member's records", async () => {
    const cases: Array<[Method, string, object]> = [
      [
        'put',
        `/api/tasks/${memberTaskId}/comments/${ownerCommentId}`,
        { comment: 'Blocked' },
      ],
      ['delete', `/api/tasks/${memberTaskId}/comments/${ownerCommentId}`, {}],
      ['put', `/api/time-logs/${ownerTimeLogId}`, { spent_time: 2 }],
      ['delete', `/api/time-logs/${ownerTimeLogId}`, {}],
      ['delete', `/api/files/${ownerFileId}`, {}],
    ];

    for (const [method, path, body] of cases) {
      const response = await requestAsLimitedUser(method, path, body);
      expect(response.status).toBe(403);
    }
  });

  it("does not expose or mutate another user's notification", async () => {
    const listResponse = await request(app)
      .get('/api/notifications')
      .set('Cookie', limitedCookies);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: ownerNotificationId }),
      ]),
    );

    const markResponse = await requestAsLimitedUser(
      'patch',
      '/api/notifications',
      {
        notification_id: ownerNotificationId,
      },
    );
    expect(markResponse.status).toBe(200);
    expect(markResponse.body).toEqual([]);

    const deleteResponse = await requestAsLimitedUser(
      'delete',
      `/api/notifications/${ownerNotificationId}`,
    );
    expect(deleteResponse.status).toBe(404);

    const notification = await testPool.query(
      'SELECT is_read, active FROM notifications WHERE id = $1',
      [ownerNotificationId],
    );
    expect(notification.rows[0]).toEqual({ is_read: false, active: true });
  });
});
