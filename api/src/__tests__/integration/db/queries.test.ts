import { PoolClient } from 'pg';
import {
  appPool,
  expectPgError,
  inRollback,
  insertProject,
  insertTask,
  insertTimeLog,
  insertUser,
  Row,
} from '../setup/db.helpers';

const namedArgs = (args: Record<string, unknown>) =>
  Object.keys(args)
    .map((key, i) => `${key} => $${i + 1}`)
    .join(', ');

const getTasks = async (client: PoolClient, args: Record<string, unknown>) =>
  (
    await client.query(
      `select * from get_tasks(${namedArgs(args)}) order by id`,
      Object.values(args),
    )
  ).rows;

const spentTime = async (client: PoolClient, args: Record<string, unknown>) =>
  Number(
    (
      await client.query(
        `select get_spent_time(${namedArgs(args)}) as spent`,
        Object.values(args),
      )
    ).rows[0].spent,
  );

const seedTasks = async (client: PoolClient) => {
  const u1 = await insertUser(client);
  const u2 = await insertUser(client);
  const project = await insertProject(client, u1.id);
  const other = await insertProject(client, u1.id);
  const a = await insertTask(client, project.id, u1.id, {
    assignee_id: u1.id,
    start_date: '2030-01-01',
    due_date: '2030-01-05',
    estimated_time: 2,
  });
  const b = await insertTask(client, project.id, u2.id, {
    parent_id: a.id,
    assignee_id: u2.id,
    holder_id: u2.id,
    status_id: 5,
    priority_id: 3,
    type_id: 2,
    start_date: '2030-02-01',
    due_date: '2030-02-05',
    estimated_time: 8,
  });
  const c = await insertTask(client, other.id, u1.id);
  await client.query(
    `update tasks set created_on = '2020-01-01 10:00:00.123+00' where id = $1`,
    [b.id],
  );
  return { u1, u2, project, other, a, b, c };
};

type Seed = Awaited<ReturnType<typeof seedTasks>>;

describe('get_tasks', () => {
  it.each<[string, (s: Seed) => Record<string, unknown>, 'a' | 'b']>([
    ['p_id', (s) => ({ p_id: s.a.id }), 'a'],
    ['p_parent_id', (s) => ({ p_parent_id: s.a.id }), 'b'],
    ['p_assignee_ids', (s) => ({ p_assignee_ids: [s.u2.id] }), 'b'],
    ['p_holder_ids', (s) => ({ p_holder_ids: [s.u2.id] }), 'b'],
    ['p_status_ids', () => ({ p_status_ids: [5] }), 'b'],
    ['p_priority_ids', () => ({ p_priority_ids: [3] }), 'b'],
    ['p_type_ids', () => ({ p_type_ids: [2] }), 'b'],
    ['p_created_by_ids', (s) => ({ p_created_by_ids: [s.u2.id] }), 'b'],
    ['p_active_statuses_only', () => ({ p_active_statuses_only: true }), 'a'],
    ['p_inactive_statuses_only', () => ({ p_inactive_statuses_only: true }), 'b'],
    ['p_due_date_from', () => ({ p_due_date_from: '2030-02-01' }), 'b'],
    ['p_due_date_to', () => ({ p_due_date_to: '2030-01-31' }), 'a'],
    ['p_start_date_from', () => ({ p_start_date_from: '2030-01-15' }), 'b'],
    ['p_start_date_to', () => ({ p_start_date_to: '2030-01-15' }), 'a'],
    ['p_created_from', () => ({ p_created_from: '2021-01-01' }), 'a'],
    ['p_created_to', () => ({ p_created_to: '2021-01-01' }), 'b'],
    ['p_estimated_time_min', () => ({ p_estimated_time_min: 5 }), 'b'],
    ['p_estimated_time_max', () => ({ p_estimated_time_max: 5 }), 'a'],
  ])('%s narrows the result', async (_label, args, expected) => {
    await inRollback(appPool, async (client) => {
      const seed = await seedTasks(client);
      const all = await getTasks(client, { p_project_ids: [seed.project.id] });
      expect(all.map((t) => t.id)).toEqual([seed.a.id, seed.b.id]);

      const rows = await getTasks(client, {
        p_project_ids: [seed.project.id],
        ...args(seed),
      });
      expect(rows.map((t) => t.id)).toEqual([seed[expected].id]);
    });
  });

  it('p_project_ids narrows the result', async () => {
    await inRollback(appPool, async (client) => {
      const { other, c } = await seedTasks(client);

      const rows = await getTasks(client, { p_project_ids: [other.id] });
      expect(rows.map((t) => t.id)).toEqual([c.id]);
    });
  });

  it('p_inactive_statuses_only wins over p_active_statuses_only', async () => {
    await inRollback(appPool, async (client) => {
      const { project, b } = await seedTasks(client);

      const rows = await getTasks(client, {
        p_project_ids: [project.id],
        p_active_statuses_only: true,
        p_inactive_statuses_only: true,
      });
      expect(rows.map((t) => t.id)).toEqual([b.id]);
    });
  });

  it('matches nothing for an empty array and everything for null', async () => {
    await inRollback(appPool, async (client) => {
      const { project, a, b } = await seedTasks(client);

      const empty = await getTasks(client, {
        p_project_ids: [project.id],
        p_status_ids: [],
      });
      const unfiltered = await getTasks(client, {
        p_project_ids: [project.id],
        p_status_ids: null,
      });
      expect(empty).toEqual([]);
      expect(unfiltered.map((t) => t.id)).toEqual([a.id, b.id]);
    });
  });

  it('fills spent_time, parent_name and a second-precision created_on', async () => {
    await inRollback(appPool, async (client) => {
      const { u1, u2, project, a, b } = await seedTasks(client);
      await insertTimeLog(client, a.id, u1.id, 1.5);
      await insertTimeLog(client, a.id, u2.id, 2);

      const [rowA, rowB] = await getTasks(client, {
        p_project_ids: [project.id],
      });
      expect(Number(rowA.spent_time)).toBe(3.5);
      expect(rowB.spent_time).toBeNull();
      expect(rowA.parent_name).toBeNull();
      expect(rowB.parent_name).toBe(a.name);
      expect(rowB.id).toBe(b.id);
      expect(rowB.created_on).toEqual(new Date('2020-01-01T10:00:00.000Z'));
    });
  });
});

describe('get_spent_time', () => {
  it('sums a task, a project, and returns 0 when nothing is logged', async () => {
    await inRollback(appPool, async (client) => {
      const { u1, project, other, a, b, c } = await seedTasks(client);
      await insertTimeLog(client, a.id, u1.id, 1.5);
      await insertTimeLog(client, a.id, u1.id, 2);
      await insertTimeLog(client, b.id, u1.id, 4);

      expect(await spentTime(client, { p_task_id: a.id })).toBe(3.5);
      expect(await spentTime(client, { p_project_id: project.id })).toBe(7.5);
      expect(await spentTime(client, { p_task_id: c.id })).toBe(0);
      expect(await spentTime(client, { p_project_id: other.id })).toBe(0);
      expect(await spentTime(client, {})).toBe(0);
    });
  });
});

describe('permission functions', () => {
  const isAdmin = async (client: PoolClient, userId: number) =>
    (await client.query('select is_admin($1) as ok', [userId])).rows[0].ok;

  const check = async (client: PoolClient, userId: number, name: string) =>
    (await client.query('select permission_check($1, $2) as ok', [userId, name]))
      .rows[0].ok;

  const permissionsOf = async (client: PoolClient, userId: number) =>
    (
      await client.query('select permission from get_user_permissions($1)', [
        userId,
      ])
    ).rows
      .map((r) => r.permission)
      .sort();

  const allPermissions = async (client: PoolClient) =>
    (await client.query('select name from permissions')).rows
      .map((r) => r.name)
      .sort();

  it('Admin implies every permission', async () => {
    await inRollback(appPool, async (client) => {
      const admin = await insertUser(client, { role: 'Admin' });
      const all = await allPermissions(client);

      expect(await isAdmin(client, admin.id)).toBe(true);
      expect(await permissionsOf(client, admin.id)).toEqual(all);
      for (const name of all) {
        expect({ name, ok: await check(client, admin.id, name) }).toEqual({
          name,
          ok: true,
        });
      }
    });
  });

  it('gives a Developer only the permissions its role grants', async () => {
    await inRollback(appPool, async (client) => {
      const dev = await insertUser(client);
      const granted = (
        await client.query(
          `select p.name from roles_permissions rp
           join roles r on r.id = rp.role_id
           join permissions p on p.id = rp.permission_id
           where r.name = 'Developer'`,
        )
      ).rows
        .map((r) => r.name)
        .sort();

      expect(granted.length).toBeGreaterThan(0);
      expect(await isAdmin(client, dev.id)).toBe(false);
      expect(await permissionsOf(client, dev.id)).toEqual(granted);
      for (const name of await allPermissions(client)) {
        expect({ name, ok: await check(client, dev.id, name) }).toEqual({
          name,
          ok: granted.includes(name),
        });
      }
    });
  });

  it('gives an unknown user nothing', async () => {
    await inRollback(appPool, async (client) => {
      expect(await isAdmin(client, -1)).toBe(false);
      expect(await check(client, -1, 'Create tasks')).toBe(false);
      expect(await permissionsOf(client, -1)).toEqual([]);
    });
  });
});

describe('delete_role', () => {
  const deleteRole = async (client: PoolClient, id: number) =>
    (await client.query('select delete_role($1::smallint) as ok', [id])).rows[0]
      .ok;

  it('returns false for a missing role', async () => {
    await inRollback(appPool, async (client) => {
      expect(await deleteRole(client, -1)).toBe(false);
    });
  });

  it('removes the role and its permissions and returns true', async () => {
    await inRollback(appPool, async (client) => {
      const { rows } = await client.query(
        `insert into roles (name) values ($1) returning id`,
        [`Probe ${Date.now()}`],
      );
      const id = rows[0].id;
      await client.query(
        `insert into roles_permissions (role_id, permission_id)
         select $1, id from permissions where name in ('Log time', 'Edit log')`,
        [id],
      );

      expect(await deleteRole(client, id)).toBe(true);
      const left = await client.query(
        `select (select count(*)::int from roles where id = $1) as roles,
           (select count(*)::int from roles_permissions where role_id = $1) as grants`,
        [id],
      );
      expect(left.rows[0]).toEqual({ roles: 0, grants: 0 });
    });
  });
});

describe('status id helpers', () => {
  it.each([
    ['task_status_id', 'task_statuses', 'new', 1],
    ['task_status_id', 'task_statuses', 'in_progress', 2],
    ['task_status_id', 'task_statuses', 'on_hold', 3],
    ['task_status_id', 'task_statuses', 'review', 4],
    ['task_status_id', 'task_statuses', 'done', 5],
    ['task_status_id', 'task_statuses', 'cancelled', 6],
    ['task_status_id', 'task_statuses', 'deleted', 7],
    ['project_status_id', 'project_statuses', 'active', 1],
    ['project_status_id', 'project_statuses', 'inactive', 2],
    ['project_status_id', 'project_statuses', 'deleted', 3],
    ['user_status_id', 'user_statuses', 'active', 1],
    ['user_status_id', 'user_statuses', 'inactive', 2],
    ['user_status_id', 'user_statuses', 'deleted', 3],
  ])('%s matches a %s row for %s', async (fn, table, key, id) => {
    const { rows } = await appPool.query(
      `select s.id, lower(replace(s.name, ' ', '_')) as key
       from ${table} s where s.id = ${fn}($1)`,
      [key.toUpperCase()],
    );
    expect(rows).toEqual([{ id, key }]);
  });

  it.each(['task_status_id', 'project_status_id', 'user_status_id'])(
    '%s raises for an unknown key',
    async (fn) => {
      await expectPgError(appPool.query(`select ${fn}('nope') as id`), 'P0001');
    },
  );
});

describe('comment, user and profile queries', () => {
  const expectNoPassword = (rows: Row[]) => {
    for (const row of rows) {
      expect(row).not.toHaveProperty('password');
    }
  };

  it('get_comments returns only active comments', async () => {
    await inRollback(appPool, async (client) => {
      const user = await insertUser(client);
      const project = await insertProject(client, user.id);
      const task = await insertTask(client, project.id, user.id);
      const insert = async (active: boolean) =>
        (
          await client.query(
            `insert into comments (task_id, user_id, comment, active)
             values ($1, $2, 'c', $3) returning id`,
            [task.id, user.id, active],
          )
        ).rows[0].id;
      const active = await insert(true);
      const inactive = await insert(false);

      const byTask = await client.query(
        'select * from get_comments(p_task_id => $1)',
        [task.id],
      );
      const byId = await client.query('select * from get_comments(p_id => $1)', [
        inactive,
      ]);

      expect(byTask.rows.map((r) => r.id)).toEqual([active]);
      expect(byId.rows).toEqual([]);
      expectNoPassword(byTask.rows);
    });
  });

  it('get_users hides deleted users unless asked', async () => {
    await inRollback(appPool, async (client) => {
      const active = await insertUser(client);
      const inactive = await insertUser(client, { status_id: 2 });
      const deleted = await insertUser(client, { status_id: 3 });
      const ids = [active.id, inactive.id, deleted.id];
      const query = async (args: Record<string, unknown>) =>
        (
          await client.query(
            `select * from get_users(${namedArgs(args)})
             where id = any($${Object.keys(args).length + 1})`,
            [...Object.values(args), ids],
          )
        ).rows;

      const byDefault = await query({});
      expect(byDefault.map((r) => r.id)).toEqual([active.id, inactive.id]);
      expect((await query({ p_include_deleted: true })).map((r) => r.id)).toEqual(
        ids,
      );
      expect((await query({ p_status_id: 3 })).map((r) => r.id)).toEqual([
        deleted.id,
      ]);
      expect(await query({ p_id: deleted.id })).toEqual([]);
      expectNoPassword(byDefault);
    });
  });

  it('get_profile hides deleted users', async () => {
    await inRollback(appPool, async (client) => {
      const active = await insertUser(client);
      const deleted = await insertUser(client, { status_id: 3 });

      const { rows } = await client.query('select * from get_profile($1)', [
        active.id,
      ]);
      const gone = await client.query('select * from get_profile($1)', [
        deleted.id,
      ]);

      expect(rows.map((r) => r.id)).toEqual([active.id]);
      expect(gone.rows).toEqual([]);
      expectNoPassword(rows);
    });
  });
});
