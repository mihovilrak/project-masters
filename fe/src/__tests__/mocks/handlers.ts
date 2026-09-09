import { http, HttpResponse } from 'msw';

type JsonBody = Record<string, unknown>;

/**
 * Default mock data for MSW handlers
 * These can be overridden in individual tests
 */

// Default user data
export const defaultUser = {
  id: 1,
  login: 'testuser',
  name: 'Test',
  surname: 'User',
  email: 'test@example.com',
  role_id: 1,
  status_id: 1,
  created_on: '2025-01-25',
  updated_on: null,
  last_login: null,
  role_name: 'Admin',
  status_name: 'Active',
  status_color: 'green',
};

// Default permissions
export const defaultPermissions = [
  { id: 1, permission: 'VIEW_TASKS', description: 'View tasks' },
  { id: 2, permission: 'EDIT_TASKS', description: 'Edit tasks' },
  { id: 3, permission: 'CREATE_COMMENT', description: 'Create comments' },
  { id: 4, permission: 'MANAGE_USERS', description: 'Manage users' },
  { id: 5, permission: 'MANAGE_PROJECTS', description: 'Manage projects' },
];

// Default project data
export const defaultProject = {
  id: 1,
  name: 'Test Project',
  description: 'Test Description',
  parent_id: null,
  parent_name: null,
  start_date: '2023-01-01',
  due_date: '2023-12-31',
  status_id: 1,
  status_name: 'Active',
  created_by: 1,
  created_by_name: 'Test User',
  created_on: '2023-01-01',
  estimated_time: 40,
  spent_time: 0,
  progress: 0,
};

// Default task data
export const defaultTask = {
  id: 1,
  name: 'Test Task',
  project_id: 1,
  project_name: 'Test Project',
  holder_id: 1,
  holder_name: 'Test Holder',
  assignee_id: 2,
  assignee_name: 'Test Assignee',
  parent_id: null,
  parent_name: null,
  description: 'Test Description',
  type_id: 1,
  type_name: 'Feature',
  status_id: 1,
  status_name: 'To Do',
  priority_id: 1,
  priority_name: 'High',
  start_date: '2025-01-25',
  due_date: '2025-02-25',
  end_date: null,
  spent_time: 0,
  progress: 0,
  created_by: 1,
  created_by_name: 'Test Creator',
  created_on: '2025-01-25',
  estimated_time: 8,
};

/**
 * Default MSW handlers for all API endpoints
 * These provide default responses that can be overridden in tests
 */
export const handlers = [
  // Auth endpoints
  http.get('/api/check-session', () => HttpResponse.json({ user: defaultUser })),

  http.post('/api/login', async ({ request }) => {
    const body = (await request.json()) as { login: string; password: string };
    if (body.login === 'testuser' && body.password === 'password123') {
      return HttpResponse.json({ user: defaultUser });
    }
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }),

  http.post('/api/logout', () => HttpResponse.json({})),

  // User permissions
  http.get('/api/users/permissions', () =>
    HttpResponse.json(defaultPermissions),
  ),

  // Users endpoints
  http.get('/api/users', () => HttpResponse.json([defaultUser])),

  http.get('/api/users/:id', ({ params }) =>
    HttpResponse.json({ ...defaultUser, id: Number(params.id) }),
  ),

  http.post('/api/users', async ({ request }) => {
    const body = (await request.json()) as JsonBody;
    return HttpResponse.json({ ...defaultUser, ...body, id: Date.now() });
  }),

  http.put('/api/users/:id', async ({ request, params }) => {
    const body = (await request.json()) as JsonBody;
    return HttpResponse.json({
      ...defaultUser,
      id: Number(params.id),
      ...body,
    });
  }),

  http.delete('/api/users/:id', () => HttpResponse.json({})),

  http.patch('/api/users/:id/status', ({ params }) =>
    HttpResponse.json({ ...defaultUser, id: Number(params.id) }),
  ),

  http.get('/api/users/:id/roles', () => HttpResponse.json(['Admin'])),

  http.put('/api/users/:id/roles', () => HttpResponse.json({})),

  // Projects endpoints
  http.get('/api/projects', () => HttpResponse.json([defaultProject])),

  http.get('/api/projects/:id', ({ params }) =>
    HttpResponse.json({ ...defaultProject, id: Number(params.id) }),
  ),

  http.get('/api/projects/:id/details', ({ params }) =>
    HttpResponse.json({ ...defaultProject, id: Number(params.id) }),
  ),

  http.post('/api/projects', async ({ request }) => {
    const body = (await request.json()) as JsonBody;
    return HttpResponse.json({ ...defaultProject, ...body, id: Date.now() });
  }),

  http.put('/api/projects/:id', async ({ request, params }) => {
    const body = (await request.json()) as JsonBody;
    return HttpResponse.json({
      ...defaultProject,
      id: Number(params.id),
      ...body,
    });
  }),

  http.delete('/api/projects/:id', () => HttpResponse.json({})),

  http.patch('/api/projects/:id/status', ({ params }) =>
    HttpResponse.json({ ...defaultProject, id: Number(params.id) }),
  ),

  http.get('/api/projects/:id/members', () => HttpResponse.json([])),

  http.post('/api/projects/:id/members', async ({ request, params }) => {
    const body = (await request.json()) as { userId: number };
    return HttpResponse.json({
      user_id: body.userId,
      project_id: Number(params.id),
      role: 'Member',
      name: 'Test',
      surname: 'User',
      created_on: new Date().toISOString(),
    });
  }),

  http.delete('/api/projects/:id/members', () => HttpResponse.json({})),

  http.put('/api/projects/:id/members/:userId', async ({ request, params }) => {
    const body = (await request.json()) as { role: string };
    return HttpResponse.json({
      user_id: Number(params.userId),
      project_id: Number(params.id),
      role: body.role,
      name: 'Test',
      surname: 'User',
      created_on: new Date().toISOString(),
    });
  }),

  http.get('/api/projects/:id/subprojects', () => HttpResponse.json([])),

  http.get('/api/projects/:id/spent-time', () => HttpResponse.json(0)),

  http.get('/api/projects/:id/tasks', ({ params }) =>
    HttpResponse.json([{ ...defaultTask, project_id: Number(params.id) }]),
  ),

  http.get('/api/projects/statuses', () =>
    HttpResponse.json([
      { id: 1, name: 'Active' },
      { id: 2, name: 'Inactive' },
    ]),
  ),

  // Tasks endpoints
  http.get('/api/tasks', () => HttpResponse.json([defaultTask])),

  http.get('/api/tasks/:id', ({ params }) =>
    HttpResponse.json({ ...defaultTask, id: Number(params.id) }),
  ),

  http.post('/api/tasks', async ({ request }) => {
    const body = (await request.json()) as JsonBody;
    return HttpResponse.json({ ...defaultTask, ...body, id: Date.now() });
  }),

  http.put('/api/tasks/:id', async ({ request, params }) => {
    const body = (await request.json()) as JsonBody;
    return HttpResponse.json({
      ...defaultTask,
      id: Number(params.id),
      ...body,
    });
  }),

  http.delete('/api/tasks/:id', () => HttpResponse.json({})),

  http.get('/api/tasks/:id/subtasks', () => HttpResponse.json([])),

  http.get('/api/tasks/calendar', () => HttpResponse.json([defaultTask])),

  http.patch('/api/tasks/:id/dates', async ({ request, params }) => {
    const body = (await request.json()) as JsonBody;
    return HttpResponse.json({
      ...defaultTask,
      id: Number(params.id),
      ...body,
    });
  }),

  http.get('/api/tasks/active', () => HttpResponse.json([defaultTask])),

  http.patch('/api/tasks/:id/change-status', async ({ request, params }) => {
    const body = (await request.json()) as { statusId: number };
    return HttpResponse.json({
      ...defaultTask,
      id: Number(params.id),
      status_id: body.statusId,
      status_name: 'In Progress',
    });
  }),

  http.get('/api/tasks/statuses', () =>
    HttpResponse.json([
      { id: 1, name: 'To Do', color: '#FF0000' },
      { id: 2, name: 'In Progress', color: '#00FF00' },
      { id: 3, name: 'Done', color: '#0000FF' },
    ]),
  ),

  http.get('/api/tasks/priorities', () =>
    HttpResponse.json([
      { id: 1, name: 'High', color: '#FF0000' },
      { id: 2, name: 'Medium', color: '#FFFF00' },
      { id: 3, name: 'Low', color: '#00FF00' },
    ]),
  ),

  http.put('/api/tasks/:id/tags', () => HttpResponse.json({})),

  http.post('/api/tasks/:id/tags', () => HttpResponse.json([])),

  http.delete('/api/tasks/:id/tags/:tagId', () => HttpResponse.json({})),

  http.get('/api/tasks/:id/tags', () => HttpResponse.json([])),

  // Comments endpoints
  http.get('/api/tasks/:id/comments', () => HttpResponse.json([])),

  http.post('/api/tasks/:id/comments', async ({ request }) => {
    const body = (await request.json()) as { comment: string };
    return HttpResponse.json({
      id: Date.now(),
      task_id: 1,
      comment: body.comment,
      user_id: 1,
      created_on: new Date().toISOString(),
      updated_on: null,
      active: true,
    });
  }),

  http.put('/api/tasks/:id/comments/:commentId', async ({ request }) => {
    const body = (await request.json()) as { comment: string };
    return HttpResponse.json({
      id: 1,
      task_id: 1,
      comment: body.comment,
      user_id: 1,
      created_on: new Date().toISOString(),
      updated_on: new Date().toISOString(),
      active: true,
    });
  }),

  http.delete('/api/tasks/:id/comments/:commentId', () =>
    HttpResponse.json({}),
  ),

  // Files endpoints
  http.get('/api/files', () => HttpResponse.json([])),

  http.post('/api/files', () =>
    HttpResponse.json({
      id: 1,
      task_id: 1,
      user_id: 1,
      name: 'test-file.txt',
      original_name: 'test-file.txt',
      size: 1024,
      mime_type: 'text/plain',
      uploaded_by: 'Test User',
      uploaded_on: new Date().toISOString(),
    }),
  ),

  http.get(
    '/api/files/:id/download',
    () =>
      new HttpResponse('test content', {
        headers: {
          'content-disposition': 'attachment; filename="test-file.txt"',
        },
      }),
  ),

  http.delete('/api/files/:id', () => HttpResponse.json({})),

  // Notifications endpoints
  http.get('/api/notifications/:userId', () => HttpResponse.json([])),

  http.patch('/api/notifications/:userId', () => HttpResponse.json({})),

  http.delete('/api/notifications/:id', () => HttpResponse.json({})),

  // Time logs endpoints
  http.get('/api/time-logs', () => HttpResponse.json([])),

  http.get('/api/time-logs/tasks/:id/logs', () => HttpResponse.json([])),

  http.get('/api/time-logs/tasks/:id/spent-time', () =>
    HttpResponse.json({ total: 0, hours: 0, minutes: 0 }),
  ),

  http.get('/api/time-logs/projects/:id/logs', () => HttpResponse.json([])),

  http.get('/api/time-logs/projects/:id/spent-time', () =>
    HttpResponse.json({ total: 0, hours: 0, minutes: 0 }),
  ),

  http.post('/api/time-logs/tasks/:id/logs', async ({ request }) => {
    const body = (await request.json()) as {
      log_date: string;
      spent_time: number;
      description: string;
      activity_type_id?: number;
    };
    return HttpResponse.json({
      id: Date.now(),
      task_id: 1,
      user_id: 1,
      activity_type_id: body.activity_type_id || 1,
      log_date: body.log_date,
      spent_time: body.spent_time,
      description: body.description,
      created_on: new Date().toISOString(),
      updated_on: null,
      activity_type_name: 'Development',
      activity_type_color: '#4CAF50',
      activity_type_icon: 'code',
    });
  }),

  http.get('/api/time-logs/user/logs', () => HttpResponse.json([])),

  http.put('/api/time-logs/:id', async ({ request, params }) => {
    const body = (await request.json()) as {
      log_date: string;
      spent_time: number;
      description: string;
      activity_type_id?: number;
    };
    return HttpResponse.json({
      id: Number(params.id),
      task_id: 1,
      user_id: 1,
      activity_type_id: body.activity_type_id || 1,
      log_date: body.log_date,
      spent_time: body.spent_time,
      description: body.description,
      created_on: new Date().toISOString(),
      updated_on: new Date().toISOString(),
      activity_type_name: 'Development',
      activity_type_color: '#4CAF50',
      activity_type_icon: 'code',
    });
  }),

  http.delete('/api/time-logs/:id', () => HttpResponse.json({})),

  // Roles endpoints
  http.get('/api/roles', () =>
    HttpResponse.json([
      {
        id: 1,
        name: 'Admin',
        permissions: [1, 2, 3, 4, 5],
        created_on: '2025-01-25',
        updated_on: null,
      },
      {
        id: 2,
        name: 'Manager',
        permissions: [1, 2, 3],
        created_on: '2025-01-25',
        updated_on: null,
      },
      {
        id: 3,
        name: 'User',
        permissions: [1],
        created_on: '2025-01-25',
        updated_on: null,
      },
    ]),
  ),

  http.post('/api/roles', async ({ request }) => {
    const body = (await request.json()) as JsonBody;
    return HttpResponse.json({
      id: Date.now(),
      ...body,
      created_on: new Date().toISOString(),
      updated_on: null,
    });
  }),

  http.put('/api/roles/:id', async ({ request, params }) => {
    const body = (await request.json()) as JsonBody;
    return HttpResponse.json({
      id: Number(params.id),
      ...body,
      updated_on: new Date().toISOString(),
    });
  }),

  http.delete('/api/roles/:id', () => HttpResponse.json({})),

  // Settings endpoints
  http.get('/api/settings/user_settings', () =>
    HttpResponse.json({
      theme: 'light',
      language: 'en',
      notifications: true,
    }),
  ),

  http.put('/api/settings/user_settings', () => HttpResponse.json({})),

  http.get('/api/settings/app_settings', () =>
    HttpResponse.json({
      id: 1,
      app_name: 'Project Manager',
      company_name: 'Test Company',
      sender_email: 'noreply@test.com',
      time_zone: 'UTC',
      theme: 'light',
      welcome_message: 'Welcome to Project Manager',
      created_on: '2025-01-26',
    }),
  ),

  http.put('/api/settings/app_settings', () => HttpResponse.json({})),

  http.post('/api/settings/test-smtp', () =>
    HttpResponse.json({
      success: true,
      message: 'SMTP test successful',
    }),
  ),

  // Profile endpoints
  http.get('/api/profile', () =>
    HttpResponse.json({
      ...defaultUser,
      total_tasks: 10,
      completed_tasks: 5,
      active_projects: 3,
      total_hours: 40,
    }),
  ),

  http.put('/api/profile', async ({ request }) => {
    const body = (await request.json()) as JsonBody;
    return HttpResponse.json({ ...defaultUser, ...body });
  }),

  http.put('/api/profile/password', () => HttpResponse.json({})),

  http.get('/api/profile/tasks', () => HttpResponse.json([defaultTask])),

  http.get('/api/profile/projects', () => HttpResponse.json([defaultProject])),

  // Permissions endpoint
  http.get('/api/admin/permissions', () =>
    HttpResponse.json(defaultPermissions),
  ),

  // Task types endpoints
  http.get('/api/admin/task-types', () =>
    HttpResponse.json([
      {
        id: 1,
        name: 'Bug',
        color: '#ff0000',
        icon: 'bug',
        description: 'Software bug',
        active: true,
      },
      {
        id: 2,
        name: 'Feature',
        color: '#00ff00',
        icon: 'star',
        description: 'New feature',
        active: true,
      },
    ]),
  ),

  http.get('/api/admin/task-types/:id', ({ params }) =>
    HttpResponse.json({
      id: Number(params.id),
      name: 'Bug',
      color: '#ff0000',
      icon: 'bug',
      description: 'Software bug',
      active: true,
    }),
  ),

  http.post('/api/admin/task-types', async ({ request }) => {
    const body = (await request.json()) as JsonBody;
    return HttpResponse.json({
      id: Date.now(),
      ...body,
      active: true,
    });
  }),

  http.put('/api/admin/task-types/:id', async ({ request, params }) => {
    const body = (await request.json()) as JsonBody;
    return HttpResponse.json({
      id: Number(params.id),
      ...body,
    });
  }),

  http.delete('/api/admin/task-types/:id', () => HttpResponse.json({})),

  // Activity types endpoints
  http.get('/api/admin/activity-types', () =>
    HttpResponse.json([
      {
        id: 1,
        name: 'Development',
        color: '#4CAF50',
        icon: 'code',
        description: 'Software development',
        active: true,
      },
      {
        id: 2,
        name: 'Testing',
        color: '#2196F3',
        icon: 'test',
        description: 'Software testing',
        active: true,
      },
    ]),
  ),

  http.post('/api/admin/activity-types', async ({ request }) => {
    const body = (await request.json()) as JsonBody;
    return HttpResponse.json({
      id: Date.now(),
      ...body,
      active: true,
    });
  }),

  http.put('/api/admin/activity-types/:id', async ({ request, params }) => {
    const body = (await request.json()) as JsonBody;
    return HttpResponse.json({
      id: Number(params.id),
      ...body,
    });
  }),

  http.delete('/api/admin/activity-types/:id', () => HttpResponse.json({})),

  // Watchers endpoints
  http.get('/api/tasks/:id/watchers', () => HttpResponse.json([])),

  http.post('/api/tasks/:id/watchers', async ({ request }) => {
    const body = (await request.json()) as { userId: number };
    return HttpResponse.json({
      task_id: 1,
      user_id: body.userId,
      user_name: 'Test Watcher',
      role: 'Developer',
    });
  }),

  http.delete('/api/tasks/:id/watchers/:userId', () => HttpResponse.json({})),

  // Tags endpoints
  http.get('/api/tags', () => HttpResponse.json([])),

  http.post('/api/tags', async ({ request }) => {
    const body = (await request.json()) as JsonBody;
    return HttpResponse.json({
      id: Date.now(),
      ...body,
      active: true,
    });
  }),

  // User endpoint (for current user)
  http.get('/api/user', () => HttpResponse.json(defaultUser)),
];
