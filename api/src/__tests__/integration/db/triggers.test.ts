import { PoolClient } from 'pg';
import {
  appPool,
  expectPgError,
  inRollback,
  insertProject,
  insertTask,
  insertUser,
} from '../setup/db.helpers';
import { testPool } from '../setup/integration.setup';

const notificationsFor = async (
  client: PoolClient,
  userId: number,
  type: string,
) => {
  const { rows } = await client.query(
    `select n.* from notifications n
     join notification_types nt on nt.id = n.type_id
     where n.user_id = $1 and nt.name = $2`,
    [userId, type],
  );
  return rows;
};

const setup = async (client: PoolClient) => {
  const creator = await insertUser(client);
  const assignee = await insertUser(client);
  const project = await insertProject(client, creator.id);
  const task = await insertTask(client, project.id, creator.id);
  return { creator, assignee, task };
};

describe('task_notifications trigger', () => {
  it('notifies the new assignee', async () => {
    await inRollback(appPool, async (client) => {
      const { assignee, task } = await setup(client);

      await client.query('update tasks set assignee_id = $1 where id = $2', [
        assignee.id,
        task.id,
      ]);

      const rows = await notificationsFor(client, assignee.id, 'Task Assigned');
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        title: 'Task Assigned',
        message: `You have been assigned to task: ${task.name}`,
        link: `/tasks/${task.id}`,
      });
    });
  });

  it('notifies nobody when the same assignee is set again', async () => {
    await inRollback(appPool, async (client) => {
      const { assignee, task } = await setup(client);
      await client.query('update tasks set assignee_id = $1 where id = $2', [
        assignee.id,
        task.id,
      ]);
      const before = await client.query('select count(*)::int from notifications');

      await client.query('update tasks set assignee_id = $1 where id = $2', [
        assignee.id,
        task.id,
      ]);

      const after = await client.query('select count(*)::int from notifications');
      expect(after.rows[0].count).toBe(before.rows[0].count);
    });
  });

  it('notifies the assignee of a status change', async () => {
    await inRollback(appPool, async (client) => {
      const { assignee, task } = await setup(client);
      await client.query('update tasks set assignee_id = $1 where id = $2', [
        assignee.id,
        task.id,
      ]);

      await client.query(
        `update tasks set status_id = task_status_id('in_progress') where id = $1`,
        [task.id],
      );

      const rows = await notificationsFor(client, assignee.id, 'Task Updated');
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        title: 'Task Status Updated',
        message: `Task ${task.name} status has been updated`,
      });
    });
  });

  it('notifies created_by once when the task moves to Done', async () => {
    await inRollback(appPool, async (client) => {
      const { creator, task } = await setup(client);

      await client.query(
        `update tasks set status_id = task_status_id('done') where id = $1`,
        [task.id],
      );
      await client.query(
        `update tasks set status_id = task_status_id('done'), name = name || '!'
         where id = $1`,
        [task.id],
      );

      const rows = await notificationsFor(client, creator.id, 'Task Completed');
      expect(rows).toHaveLength(1);
      expect(rows[0].message).toBe(`Task ${task.name} has been completed`);
    });
  });

  it('aborts the task update when the notification fails', async () => {
    await inRollback(testPool, async (client) => {
      const { assignee, task } = await setup(client);
      await client.query(
        'alter table notifications add constraint notifications_reject check (false) not valid',
      );

      await expectPgError(
        client.query('update tasks set assignee_id = $1 where id = $2', [
          assignee.id,
          task.id,
        ]),
        '23514',
      );
    });
  });
});

describe('updated_on trigger', () => {
  it('exists on every base table with an updated_on column', async () => {
    const { rows: tables } = await appPool.query(
      `select c.table_name
       from information_schema.columns c
       join information_schema.tables t using (table_schema, table_name)
       where c.table_schema = 'public'
         and c.column_name = 'updated_on'
         and t.table_type = 'BASE TABLE'`,
    );
    const { rows: missing } = await appPool.query(
      `select c.table_name
       from information_schema.columns c
       join information_schema.tables t using (table_schema, table_name)
       where c.table_schema = 'public'
         and c.column_name = 'updated_on'
         and t.table_type = 'BASE TABLE'
         and not exists (
           select 1 from pg_trigger tg
           where tg.tgrelid = format('public.%I', c.table_name)::regclass
             and tg.tgname = c.table_name || '_updated_on'
         )`,
    );

    expect(tables.length).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });

  it('is null after insert and set after a real update', async () => {
    await inRollback(appPool, async (client) => {
      const { task } = await setup(client);
      expect(task.updated_on).toBeNull();

      const { rows } = await client.query(
        `update tasks set name = name || '!' where id = $1 returning updated_on`,
        [task.id],
      );
      expect(rows[0].updated_on).toBeInstanceOf(Date);
    });
  });

  it('stays null after an update with the same values', async () => {
    await inRollback(appPool, async (client) => {
      const { task } = await setup(client);

      const { rows } = await client.query(
        'update tasks set name = name where id = $1 returning updated_on',
        [task.id],
      );
      expect(rows[0].updated_on).toBeNull();
    });
  });
});

describe('user_settings trigger', () => {
  it('creates exactly one settings row for a new user', async () => {
    await inRollback(appPool, async (client) => {
      const user = await insertUser(client);

      const { rows } = await client.query(
        'select count(*)::int from user_settings where user_id = $1',
        [user.id],
      );
      expect(rows[0].count).toBe(1);
    });
  });

  it('does not fail when a settings row already exists', async () => {
    await inRollback(testPool, async (client) => {
      const { rows: next } = await client.query(
        'select coalesce(max(id), 0) + 1000 as id from users',
      );
      const id = next[0].id;

      // Replica mode skips the FK so the settings row can precede its user.
      await client.query('set local session_replication_role = replica');
      await client.query('insert into user_settings (user_id) values ($1)', [id]);
      await client.query('set local session_replication_role = origin');

      await client.query(
        `insert into users (id, login, email, password, name, surname, role_id)
         overriding system value
         values ($1, $2, $3, 'x', 'Test', 'User',
           (select id from roles where name = 'Developer'))`,
        [id, `replay_${id}`, `replay_${id}@example.com`],
      );

      const { rows } = await client.query(
        'select count(*)::int from user_settings where user_id = $1',
        [id],
      );
      expect(rows[0].count).toBe(1);
    });
  });
});
