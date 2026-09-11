import fs from 'fs';
import path from 'path';
import * as adminModel from '../../../models/adminModel';
import * as notificationModel from '../../../models/notificationModel';
import * as permissionModel from '../../../models/permissionModel';
import * as projectModel from '../../../models/projectModel';
import * as settingsModel from '../../../models/settingsModel';
import * as tagModel from '../../../models/tagModel';
import * as taskModel from '../../../models/taskModel';
import {
  cleanupTables,
  seedTestProject,
  seedTestTask,
  seedTestUser,
  testPool,
} from '../setup/integration.setup';
import { CommentWithUser } from '../../../types/comment';
import { Profile } from '../../../types/profile';
import { ProjectDetails, ProjectMember } from '../../../types/project';
import { TaskDetails } from '../../../types/task';
import { TimeLog } from '../../../types/timeLog';
import { User } from '../../../types/user';

const fields = <T>(...keys: (keyof T & string)[]) => keys;

const columnsOf = async (call: string, params: unknown[] = []) =>
  (
    await testPool.query(`select * from ${call} limit 0`, params)
  ).fields.map((field) => field.name);

let owner: any;
let admin: any;
let project: any;
let taskId: number;

beforeAll(async () => {
  await cleanupTables([
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
  admin = (
    await testPool.query(
      `INSERT INTO users (login, email, password, name, surname, role_id, status_id)
       VALUES ('contractadmin', 'contractadmin@example.com', crypt(
         'password123', gen_salt('bf', 12)
       ), 'Contract', 'Admin', (SELECT id FROM roles WHERE name = 'Admin'), 1)
       RETURNING *`,
    )
  ).rows[0];
  project = await seedTestProject(owner.id);
  taskId = (await seedTestTask(project.id, owner.id)).task_id;
});

describe('model/database contracts for previously broken runtime paths', () => {
  it('changes a project to the requested status through the stored function', async () => {
    const result = await projectModel.changeProjectStatus(
      testPool,
      String(project.id),
      2,
    );
    const stored = await projectModel.getProjectById(
      testPool,
      String(project.id),
    );

    expect(result?.message).toContain('inactive');
    expect(stored?.status_id).toBe(2);
  });

  it('soft-deletes tasks with the real Deleted status and excludes them from active results', async () => {
    const deleted = await taskModel.deleteTask(testPool, String(taskId));
    const active = await taskModel.getTasks(testPool);

    expect(deleted?.status_id).toBe(7);
    expect(active).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: taskId })]),
    );
  });

  it('creates tags using columns that exist in the real schema', async () => {
    const tag = await tagModel.createTag(
      testPool,
      `Contract tag ${Date.now()}`,
      '#123456',
    );
    expect(tag).toEqual(expect.objectContaining({ color: '#123456' }));
  });

  it('updates the real email_notifications_enabled user-setting column', async () => {
    const settings = await settingsModel.updateUserSettings(
      testPool,
      String(owner.id),
      { email_notifications_enabled: false },
    );

    expect(settings).toEqual(
      expect.objectContaining({ email_notifications_enabled: false }),
    );
  });

  it('keeps projects_for_user return columns aligned and removes owner/member duplicates', async () => {
    await testPool.query(
      `INSERT INTO project_users (project_id, user_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [project.id, owner.id],
    );

    const result = await testPool.query(
      'SELECT * FROM projects_for_user($1) WHERE id = $2',
      [owner.id, project.id],
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toHaveProperty('parent_id');
    expect(result.rows[0]).toHaveProperty('updated_on');
  });

  it('keeps user_notifications return columns aligned with notification data', async () => {
    const inserted = (
      await testPool.query(
        `INSERT INTO notifications (user_id, type_id, title, message, data)
         VALUES ($1, 1, 'Contract', 'Contract message', '{"source":"test"}')
         RETURNING id`,
        [owner.id],
      )
    ).rows[0];

    const notifications = await notificationModel.getNotificationsByUserId(
      testPool,
      String(owner.id),
    );

    expect(notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: inserted.id, data: { source: 'test' } }),
      ]),
    );
  });

  it('keeps notification creation functions aligned with their declared rows', async () => {
    await testPool.query(
      `INSERT INTO watchers (task_id, user_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [taskId, admin.id],
    );
    await testPool.query(
      `INSERT INTO project_users (project_id, user_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [project.id, admin.id],
    );

    const watcherNotifications =
      await notificationModel.createWatcherNotifications(testPool, {
        task_id: taskId,
        action_user_id: owner.id,
        type_id: 3,
      });
    const projectNotifications =
      await notificationModel.createProjectMemberNotifications(testPool, {
        project_id: project.id,
        action_user_id: owner.id,
        type_id: 6,
      });

    expect(watcherNotifications).toEqual(
      expect.arrayContaining([expect.objectContaining({ user_id: admin.id })]),
    );
    expect(projectNotifications).toEqual(
      expect.arrayContaining([expect.objectContaining({ user_id: admin.id })]),
    );
  });

  it('uses SQL-side timestamp defaults when system-log dates are omitted', async () => {
    await expect(adminModel.getSystemLogs(testPool)).resolves.toEqual(
      expect.any(Array),
    );
  });

  it('returns each permission once for administrators', async () => {
    const permissions = await permissionModel.getUserPermissions(
      testPool,
      String(admin.id),
    );
    const names = permissions.map((permission) => permission.permission);

    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain('Admin');
  });
});

describe('function columns cover the fields their models return', () => {
  it('get_tasks ↔ taskModel (TaskDetails)', async () => {
    // updated_on is optional on Task and not returned.
    const expected = fields<TaskDetails>(
      'id',
      'name',
      'project_id',
      'project_name',
      'holder_id',
      'holder_name',
      'assignee_id',
      'assignee_name',
      'parent_id',
      'parent_name',
      'description',
      'type_id',
      'type_name',
      'status_id',
      'status_name',
      'status_color',
      'priority_id',
      'priority_name',
      'start_date',
      'due_date',
      'end_date',
      'spent_time',
      'progress',
      'created_by',
      'created_by_name',
      'created_on',
      'estimated_time',
    );

    expect(await columnsOf('get_tasks()')).toEqual(
      expect.arrayContaining(expected),
    );
  });

  it('get_comments ↔ commentModel (CommentWithUser)', async () => {
    const expected = fields<CommentWithUser>(
      'id',
      'task_id',
      'user_id',
      'user_name',
      'comment',
      'active',
      'created_on',
      'updated_on',
    );

    expect(await columnsOf('get_comments()')).toEqual(
      expect.arrayContaining(expected),
    );
  });

  it('get_users ↔ userModel (User)', async () => {
    const expected = fields<User>(
      'id',
      'login',
      'name',
      'surname',
      'email',
      'status_id',
      'role_id',
      'created_on',
      'updated_on',
    );

    expect(await columnsOf('get_users()')).toEqual(
      expect.arrayContaining(expected),
    );
  });

  it('get_profile ↔ profileModel (Profile)', async () => {
    // updated_on and active are optional on Profile and not returned.
    const expected = fields<Profile>(
      'id',
      'name',
      'surname',
      'email',
      'login',
      'role_name',
      'created_on',
      'last_login',
      'total_tasks',
      'completed_tasks',
      'active_projects',
      'total_hours',
    );

    expect(await columnsOf('get_profile($1)', [owner.id])).toEqual(
      expect.arrayContaining(expected),
    );
  });

  it('get_time_logs ↔ timeLogModel (TimeLog)', async () => {
    const expected = fields<TimeLog>(
      'id',
      'task_id',
      'user_id',
      'log_date',
      'spent_time',
      'description',
      'activity_type_id',
      'created_on',
      'updated_on',
    );

    expect(await columnsOf('get_time_logs()')).toEqual(
      expect.arrayContaining(expected),
    );
  });

  it('project_details ↔ projectModel (ProjectDetails)', async () => {
    // updated_on, members, tasks_count and completed_tasks_count are
    // optional on ProjectDetails and not returned here.
    const expected = fields<ProjectDetails>(
      'id',
      'name',
      'description',
      'start_date',
      'end_date',
      'due_date',
      'parent_id',
      'parent_name',
      'status_id',
      'status_name',
      'created_by',
      'created_by_name',
      'created_on',
      'estimated_time',
      'spent_time',
      'progress',
    );

    expect(await columnsOf('project_details($1)', [project.id])).toEqual(
      expect.arrayContaining(expected),
    );
  });

  it('get_project_members ↔ projectModel (ProjectMember)', async () => {
    // created_on is optional on ProjectMember and not returned here.
    const expected = fields<ProjectMember>(
      'project_id',
      'user_id',
      'name',
      'surname',
      'role',
    );

    expect(await columnsOf('get_project_members($1)', [project.id])).toEqual(
      expect.arrayContaining(expected),
    );
  });
});

describe('db/init functions', () => {
  it('each exist with exactly one overload', async () => {
    const initDir = path.join(__dirname, '../../../../../db/init');
    const names = new Set<string>();
    for (const file of fs.readdirSync(initDir).filter((f) => f.endsWith('.sql'))) {
      const sql = fs.readFileSync(path.join(initDir, file), 'utf8');
      for (const match of sql.matchAll(
        /create\s+or\s+replace\s+function\s+(?:public\.)?"?(\w+)"?/gi,
      )) {
        names.add(match[1].toLowerCase());
      }
    }

    const { rows } = await testPool.query(
      `select name, count(p.oid)::int as overloads
       from unnest($1::text[]) as name
       left join pg_proc p on p.proname = name
         and p.pronamespace = 'public'::regnamespace
       group by name
       having count(p.oid) <> 1`,
      [[...names]],
    );

    expect(names.size).toBeGreaterThan(0);
    expect(rows).toEqual([]);
  });
});
