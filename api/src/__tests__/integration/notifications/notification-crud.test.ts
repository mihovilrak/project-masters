import request from 'supertest';
import { Express } from 'express';
import {
  cleanupTables,
  cookieHeader,
  seedTestUser,
  testPool,
} from '../setup/integration.setup';

let app: Express;
let user: any;
let authCookies = '';

beforeAll(async () => {
  const appModule = await import('../../../app');
  app = appModule.default;
});

const seedNotification = async (userId: number, title = 'Test notification') => {
  const result = await testPool.query(
    `INSERT INTO notifications (user_id, type_id, title, message)
     VALUES ($1, 1, $2, 'Body') RETURNING *`,
    [userId, title],
  );
  return result.rows[0];
};

beforeEach(async () => {
  await cleanupTables(['notifications', 'projects', 'project_users', 'session', 'users']);

  user = await seedTestUser();

  const loginResponse = await request(app).post('/api/login').send({
    login: 'testuser',
    password: 'password123',
  });
  authCookies = cookieHeader(loginResponse.headers['set-cookie']);
});

describe('GET /api/notifications', () => {
  it('returns 401 when not authenticated', async () => {
    const response = await request(app).get('/api/notifications');
    expect(response.status).toBe(401);
  });

  it('returns an empty array when there are no notifications', async () => {
    const response = await request(app)
      .get('/api/notifications')
      .set('Cookie', authCookies);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('returns notifications with joined type details', async () => {
    await seedNotification(user.id);

    const response = await request(app)
      .get('/api/notifications')
      .set('Cookie', authCookies);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      title: 'Test notification',
      is_read: false,
    });
    expect(response.body[0]).toHaveProperty('type');
    expect(response.body[0]).toHaveProperty('icon');
    expect(response.body[0]).toHaveProperty('color');
  });

  it('respects limit/offset pagination', async () => {
    await seedNotification(user.id, 'First');
    await seedNotification(user.id, 'Second');

    const response = await request(app)
      .get('/api/notifications?limit=1&offset=0')
      .set('Cookie', authCookies);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });
});

describe('PATCH /api/notifications', () => {
  it('returns 401 when not authenticated', async () => {
    const response = await request(app).patch('/api/notifications').send({});
    expect(response.status).toBe(401);
  });

  it('marks all unread notifications as read when notification_id is omitted', async () => {
    await seedNotification(user.id, 'First');
    await seedNotification(user.id, 'Second');

    const response = await request(app)
      .patch('/api/notifications')
      .set('Cookie', authCookies)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body.every((n: any) => n.is_read)).toBe(true);
  });

  it('marks only the specified notification as read', async () => {
    const first = await seedNotification(user.id, 'First');
    await seedNotification(user.id, 'Second');

    const response = await request(app)
      .patch('/api/notifications')
      .set('Cookie', authCookies)
      .send({ notification_id: first.id });

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe(first.id);

    const unread = await testPool.query(
      'SELECT id FROM notifications WHERE is_read = false',
    );
    expect(unread.rows).toHaveLength(1);
  });
});

describe('DELETE /api/notifications/:id', () => {
  it('returns 401 when not authenticated', async () => {
    const response = await request(app).delete('/api/notifications/1');
    expect(response.status).toBe(401);
  });

  it('deletes an owned notification', async () => {
    const notification = await seedNotification(user.id);

    const response = await request(app)
      .delete(`/api/notifications/${notification.id}`)
      .set('Cookie', authCookies);

    expect(response.status).toBe(200);

    const stored = await testPool.query(
      'SELECT active FROM notifications WHERE id = $1',
      [notification.id],
    );
    expect(stored.rows[0].active).toBe(false);
  });

  it('returns 404 for a non-existent notification', async () => {
    const response = await request(app)
      .delete('/api/notifications/999999')
      .set('Cookie', authCookies);
    expect(response.status).toBe(404);
  });
});
