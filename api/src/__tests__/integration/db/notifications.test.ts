import { PoolClient } from 'pg';
import {
  appPool,
  expectPgError,
  inRollback,
  insertProject,
  insertTask,
  insertUser,
} from '../setup/db.helpers';

const typeId = `(select id from notification_types where name = $1)`;

const sortById = <T extends { user_id: number }>(rows: T[]) =>
  [...rows].sort((a, b) => a.user_id - b.user_id);

describe('fan_out_notifications', () => {
  it('notifies every recipient except the actor with "<name> <verb> <subject>"', async () => {
    await inRollback(appPool, async (client) => {
      const actor = await insertUser(client, { name: 'Ana' });
      const b = await insertUser(client);
      const c = await insertUser(client);

      const { rows } = await client.query(
        `select * from fan_out_notifications($2, $3, ${typeId}, 'task "X"', '/tasks/1')`,
        ['Task Comment', [actor.id, b.id, c.id], actor.id],
      );

      expect(sortById(rows)).toEqual([
        expect.objectContaining({
          user_id: b.id,
          title: 'New Comment',
          message: 'Ana commented on task "X"',
          link: '/tasks/1',
        }),
        expect.objectContaining({ user_id: c.id }),
      ]);
    });
  });

  it('raises for a type without a fan-out title/verb', async () => {
    await inRollback(appPool, async (client) => {
      const actor = await insertUser(client);
      const b = await insertUser(client);

      await expectPgError(
        client.query(
          `select * from fan_out_notifications($2, $3, ${typeId}, 'x', null)`,
          ['Task Assigned', [b.id], actor.id],
        ),
        'P0001',
      );
    });
  });
});

describe('watcher and project member notifications', () => {
  it('notifies the task watchers except the actor', async () => {
    await inRollback(appPool, async (client) => {
      const actor = await insertUser(client, { name: 'Ana' });
      const watcher = await insertUser(client);
      const project = await insertProject(client, actor.id);
      const task = await insertTask(client, project.id, actor.id);
      for (const user of [actor, watcher]) {
        await client.query(
          'insert into watchers (task_id, user_id) values ($1, $2)',
          [task.id, user.id],
        );
      }

      const { rows } = await client.query(
        `select * from create_watcher_notifications($2, $3, ${typeId})`,
        ['Task Updated', task.id, actor.id],
      );

      expect(rows).toEqual([
        expect.objectContaining({
          user_id: watcher.id,
          message: `Ana updated task "${task.name}" in project "${project.name}"`,
          link: `/tasks/${task.id}`,
        }),
      ]);
    });
  });

  it('notifies the project members except the actor', async () => {
    await inRollback(appPool, async (client) => {
      const actor = await insertUser(client, { name: 'Ana' });
      const b = await insertUser(client);
      const c = await insertUser(client);
      const project = await insertProject(client, actor.id);
      for (const user of [actor, b, c]) {
        await client.query(
          'insert into project_users (project_id, user_id) values ($1, $2)',
          [project.id, user.id],
        );
      }

      const { rows } = await client.query(
        `select * from create_project_member_notifications($2, $3, ${typeId})`,
        ['Project Update', project.id, actor.id],
      );

      expect(sortById(rows)).toEqual([
        expect.objectContaining({
          user_id: b.id,
          title: 'Project Updated',
          message: `Ana updated project "${project.name}"`,
          link: `/projects/${project.id}`,
        }),
        expect.objectContaining({ user_id: c.id }),
      ]);
    });
  });
});

describe('create_due_soon_notifications', () => {
  const sweep = async (client: PoolClient) =>
    (await client.query('select create_due_soon_notifications() as count'))
      .rows[0].count as number;

  const dates = async (client: PoolClient) =>
    (
      await client.query(
        `select current_date::text as today,
           (current_date + 1)::text as tomorrow,
           (current_date + 2)::text as later`,
      )
    ).rows[0];

  const dueSoonFor = async (client: PoolClient, taskId: number) =>
    (
      await client.query(
        `select n.* from notifications n
         join notification_types nt on nt.id = n.type_id
         where nt.name = 'Task Due Soon' and (n.data ->> 'task_id')::int = $1`,
        [taskId],
      )
    ).rows;

  it('notifies assigned tasks due today or tomorrow once, skipping the rest', async () => {
    await inRollback(appPool, async (client) => {
      // Flush tasks committed by other suites so the counts below are ours.
      await sweep(client);
      const { today, tomorrow, later } = await dates(client);
      const creator = await insertUser(client);
      const assignee = await insertUser(client);
      const project = await insertProject(client, creator.id);
      const task = (overrides: Parameters<typeof insertTask>[3]) =>
        insertTask(client, project.id, creator.id, {
          assignee_id: assignee.id,
          ...overrides,
        });

      const dueToday = await task({ due_date: today });
      const dueTomorrow = await task({ due_date: tomorrow });
      const skipped = [
        await task({ due_date: today, status_id: 5 }),
        await task({ due_date: today, status_id: 6 }),
        await task({ due_date: today, status_id: 7 }),
        await task({ due_date: today, assignee_id: null }),
        await task({ due_date: later }),
      ];

      expect(await sweep(client)).toBe(2);
      expect(await dueSoonFor(client, dueToday.id)).toEqual([
        expect.objectContaining({
          user_id: assignee.id,
          title: 'Task Due Soon',
          message: `Task "${dueToday.name}" in project "${project.name}" is due today`,
          link: `/tasks/${dueToday.id}`,
        }),
      ]);
      expect((await dueSoonFor(client, dueTomorrow.id))[0].message).toMatch(
        /is due tomorrow$/,
      );
      for (const t of skipped) {
        expect(await dueSoonFor(client, t.id)).toEqual([]);
      }

      expect(await sweep(client)).toBe(0);
    });
  });

  it('notifies again after the due date moves or the task is reassigned', async () => {
    await inRollback(appPool, async (client) => {
      await sweep(client);
      const { today, tomorrow } = await dates(client);
      const creator = await insertUser(client);
      const assignee = await insertUser(client);
      const other = await insertUser(client);
      const project = await insertProject(client, creator.id);
      const moved = await insertTask(client, project.id, creator.id, {
        assignee_id: assignee.id,
        due_date: today,
      });
      const reassigned = await insertTask(client, project.id, creator.id, {
        assignee_id: assignee.id,
        due_date: today,
      });
      expect(await sweep(client)).toBe(2);

      await client.query('update tasks set due_date = $1 where id = $2', [
        tomorrow,
        moved.id,
      ]);
      expect(await sweep(client)).toBe(1);

      await client.query('update tasks set assignee_id = $1 where id = $2', [
        other.id,
        reassigned.id,
      ]);
      expect(await sweep(client)).toBe(1);
      expect(
        (await dueSoonFor(client, reassigned.id)).map((n) => n.user_id).sort(),
      ).toEqual([assignee.id, other.id].sort());
    });
  });
});

describe('user_notifications', () => {
  it('returns only the user’s active notifications and supports order/limit', async () => {
    await inRollback(appPool, async (client) => {
      const user = await insertUser(client);
      const other = await insertUser(client);
      const insert = async (
        userId: number,
        minutesAgo: number,
        active = true,
      ) =>
        (
          await client.query(
            `insert into notifications (user_id, type_id, title, message, active, created_on)
             values ($1, (select min(id) from notification_types), 't', 'm', $2,
               current_timestamp - make_interval(mins => $3))
             returning id`,
            [userId, active, minutesAgo],
          )
        ).rows[0].id as number;

      const oldest = await insert(user.id, 30);
      const middle = await insert(user.id, 20);
      const newest = await insert(user.id, 10);
      await insert(user.id, 5, false);
      await insert(other.id, 1);

      const all = await client.query(
        'select id from user_notifications($1) order by id',
        [user.id],
      );
      expect(all.rows.map((r) => r.id)).toEqual([oldest, middle, newest]);

      const page = await client.query(
        'select id from user_notifications($1) order by created_on desc limit 2',
        [user.id],
      );
      expect(page.rows.map((r) => r.id)).toEqual([newest, middle]);
    });
  });
});

describe('get_notifications_for_service', () => {
  it('returns the columns notification-service reads and claims the row', async () => {
    await inRollback(appPool, async (client) => {
      const user = await insertUser(client);
      const { rows: inserted } = await client.query(
        `insert into notifications (user_id, type_id, title, message, link, data)
         values ($1, (select id from notification_types where name = 'Task Assigned'),
           'Title', 'Message', '/tasks/1', '{"taskName":"X"}')
         returning id`,
        [user.id],
      );
      const id = inserted[0].id;
      const claim = async () =>
        (
          await client.query(
            'select * from get_notifications_for_service(1000, 5::int2)',
          )
        ).rows.filter((row) => row.id === id);

      const rows = await claim();

      // Keys of DatabaseNotification in notification-service.
      expect(Object.keys(rows[0]).sort()).toEqual(
        [
          'id',
          'user_id',
          'type_id',
          'type_name',
          'title',
          'message',
          'link',
          'data',
          'email_attempts',
          'created_on',
          'email',
          'login',
        ].sort(),
      );
      expect(rows[0]).toMatchObject({
        user_id: user.id,
        type_name: 'Task Assigned',
        title: 'Title',
        message: 'Message',
        link: '/tasks/1',
        data: { taskName: 'X' },
        email_attempts: 1,
        email: user.email,
        login: user.login,
      });
      // Backoff keeps a just-claimed row out of the next batch.
      expect(await claim()).toEqual([]);
    });
  });

  it('skips users who turned email notifications off', async () => {
    await inRollback(appPool, async (client) => {
      const user = await insertUser(client);
      await client.query(
        'update user_settings set email_notifications_enabled = false where user_id = $1',
        [user.id],
      );
      await client.query(
        `insert into notifications (user_id, type_id, title, message)
         values ($1, (select min(id) from notification_types), 't', 'm')`,
        [user.id],
      );

      const { rows } = await client.query(
        'select * from get_notifications_for_service(1000, 5::int2) where user_id = $1',
        [user.id],
      );
      expect(rows).toEqual([]);
    });
  });
});
