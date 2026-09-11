import { Pool } from 'pg';
import * as projectModel from '../projectModel';

// Helper to create mock query result
const mockQueryResult = (rows: unknown[]) => ({
  rows,
  rowCount: rows.length,
  command: '',
  oid: 0,
  fields: [],
});

describe('ProjectModel', () => {
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    } as unknown as jest.Mocked<Pool>;
    jest.clearAllMocks();
  });

  describe('getProjects', () => {
    it('should return all projects without filters', async () => {
      const mockProjects = [
        { id: '1', name: 'Project 1' },
        { id: '2', name: 'Project 2' },
      ];
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult(mockProjects),
      );

      const result = await projectModel.getProjects(mockPool);

      const query = (mockPool.query as jest.Mock).mock.calls[0][0];
      expect(query).toContain('FROM projects p');
      expect(query).toContain('project_details(p.id)');
      expect(query).toContain('status_name');
      expect(query).toContain('created_by_name');
      expect((mockPool.query as jest.Mock).mock.calls[0][1]).toEqual([500, 0]);
      expect(result).toEqual(mockProjects);
    });

    it('should return filtered projects', async () => {
      const mockProjects = [{ id: '1', name: 'Project 1', status_id: 1 }];
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult(mockProjects),
      );

      const result = await projectModel.getProjects(mockPool, { statusId: 1 });

      const query = (mockPool.query as jest.Mock).mock.calls[0][0];
      expect(query).toContain('p.status_id = $1');
      expect((mockPool.query as jest.Mock).mock.calls[0][1]).toEqual([1, 500, 0]);
      expect(result).toEqual(mockProjects);
    });

    it('should ignore undefined filters', async () => {
      const mockProjects = [{ id: '1', name: 'Project 1' }];
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult(mockProjects),
      );

      const result = await projectModel.getProjects(mockPool, {
        statusId: 1,
        createdBy: undefined,
      });

      const query = (mockPool.query as jest.Mock).mock.calls[0][0];
      expect(query).toContain('p.status_id = $1');
      expect((mockPool.query as jest.Mock).mock.calls[0][1]).toEqual([1, 500, 0]);
      expect(result).toEqual(mockProjects);
    });
  });

  describe('getProjects scoping', () => {
    it('restricts the listing to the projects a scoped user may see', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await projectModel.getProjects(mockPool, {}, undefined, '7');

      const [sql, params] = (mockPool.query as jest.Mock).mock.calls[0];
      expect(sql).toContain('p.id IN (');
      expect(params).toEqual(['7', 500, 0]);
    });

    it('leaves the listing unscoped when no user is given', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await projectModel.getProjects(mockPool);

      expect((mockPool.query as jest.Mock).mock.calls[0][0]).not.toContain(
        'p.id IN (',
      );
    });
  });

  describe('getProjectById', () => {
    it('should return a project by ID', async () => {
      const mockProject = { id: '1', name: 'Project 1' };
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult([mockProject]),
      );

      const result = await projectModel.getProjectById(mockPool, '1');

      expect(result).toEqual(mockProject);
    });

    it('should return null when project not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      const result = await projectModel.getProjectById(mockPool, '999');

      expect(result).toBeNull();
    });
  });

  describe('getProjectDetails', () => {
    it('should return project details', async () => {
      const mockDetails = { id: '1', name: 'Project 1', task_count: 5 };
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult([mockDetails]),
      );

      const result = await projectModel.getProjectDetails(mockPool, '1');

      expect(mockPool.query).toHaveBeenCalledWith(
        `SELECT * FROM project_details($1)`,
        ['1'],
      );
      expect(result).toEqual(mockDetails);
    });
  });

  describe('createProject', () => {
    it('should create a new project', async () => {
      const mockProject = { id: '1', name: 'New Project' };
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult([mockProject]),
      );

      const result = await projectModel.createProject(
        mockPool,
        'New Project',
        'Description',
        new Date(),
        new Date(),
        '1',
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO projects'),
        expect.any(Array),
      );
      expect(result).toEqual(mockProject);
    });
  });

  describe('changeProjectStatus', () => {
    it('should change project status', async () => {
      const mockMessage = { message: 'Project status changed to inactive.' };
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult([mockMessage]),
      );

      const result = await projectModel.changeProjectStatus(mockPool, '1', 2);

      expect(mockPool.query).toHaveBeenCalledWith(
        `SELECT * FROM change_project_status($1, $2)`,
        ['1', 2],
      );
      expect(result).toEqual(mockMessage);
    });
  });

  describe('updateProject', () => {
    it('should update a project', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const result = await projectModel.updateProject(
        mockPool,
        { name: 'Updated' },
        '1',
      );

      expect(result).toBe(1);
    });

    it('should return null when no allowed update keys', async () => {
      const result = await projectModel.updateProject(
        mockPool,
        { evil_key: 'x' } as any,
        '1',
      );

      expect(result).toBeNull();
      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });

  describe('deleteProject', () => {
    it('should delete a project', async () => {
      const mockProject = { id: '1' };
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult([mockProject]),
      );

      const result = await projectModel.deleteProject(mockPool, '1');

      expect(mockPool.query).toHaveBeenCalledWith(
        `SELECT * FROM delete_project($1)`,
        ['1'],
      );
      expect(result).toEqual(mockProject);
    });
  });

  describe('getProjectMembers', () => {
    it('should return project members', async () => {
      const mockMembers = [{ user_id: '1', name: 'User 1' }];
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult(mockMembers),
      );

      const result = await projectModel.getProjectMembers(mockPool, '1');

      expect(result).toEqual(mockMembers);
    });
  });

  describe('getSubprojects', () => {
    it('should return subprojects', async () => {
      const mockSubprojects = [{ id: '2', parent_id: '1' }];
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult(mockSubprojects),
      );

      const result = await projectModel.getSubprojects(mockPool, '1');

      expect(result).toEqual(mockSubprojects);
    });
  });

  describe('addProjectMember', () => {
    it('should add a project member', async () => {
      const mockMember = { project_id: '1', user_id: '2' };
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult([mockMember]),
      );

      const result = await projectModel.addProjectMember(mockPool, '1', '2');

      expect(result).toEqual(mockMember);
    });
  });

  describe('deleteProjectMember', () => {
    it('should delete a project member', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const result = await projectModel.deleteProjectMember(mockPool, '1', '2');

      expect(result).toBe(1);
    });
  });

  describe('getProjectTasks', () => {
    it('should return project tasks', async () => {
      const mockTasks = [{ id: '1', title: 'Task 1' }];
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult(mockTasks),
      );

      const result = await projectModel.getProjectTasks(mockPool, '1');

      expect(result).toEqual(mockTasks);
    });

    it('should apply only allowed filter keys', async () => {
      const mockTasks = [{ id: '1', title: 'Task 1' }];
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult(mockTasks),
      );

      await projectModel.getProjectTasks(mockPool, '1', {
        status: '1',
        evil_key: 'x',
      } as any);

      const query = (mockPool.query as jest.Mock).mock.calls[0][0];
      expect(query).toContain('get_tasks');
      expect(query).not.toContain('evil_key');
      // Only status mapped to status_id; project_id, assignee_id, priority_id
      const values = (mockPool.query as jest.Mock).mock.calls[0][1];
      expect(values).toEqual(['1', null, [1], null, 500, 0]);
    });
  });

  describe('getProjectStatuses', () => {
    it('should return project statuses', async () => {
      const mockStatuses = [{ id: 1, name: 'Active' }];
      (mockPool.query as jest.Mock).mockResolvedValue(
        mockQueryResult(mockStatuses),
      );

      const result = await projectModel.getProjectStatuses(mockPool);

      expect(result).toEqual(mockStatuses);
    });
  });
});
