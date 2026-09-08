import { Response, NextFunction, RequestHandler } from 'express';
import { Pool } from 'pg';
import { Session } from 'express-session';
import {
  requireProjectAccess,
  requireTaskAccess,
  requireTaskAccessBy,
  requireCommentOwnership,
  requireTimeLogOwnership,
} from '../projectAccessMiddleware';
import { CustomRequest } from '../../types/express';
import * as permissionModel from '../../models/permissionModel';
import * as accessModel from '../../models/accessModel';

jest.mock('../../models/permissionModel');
jest.mock('../../models/accessModel');

describe('projectAccessMiddleware', () => {
  let mockReq: Partial<CustomRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockPool: Partial<Pool>;

  const run = (middleware: RequestHandler): Promise<void> =>
    (
      middleware as unknown as (
        req: CustomRequest,
        res: Response,
        next: NextFunction,
      ) => Promise<void>
    )(mockReq as CustomRequest, mockRes as Response, mockNext);

  beforeEach(() => {
    mockReq = {
      params: {},
      body: {},
      query: {},
      session: {
        user: { id: '7', login: 'test', role_id: 2 },
      } as unknown as Session,
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    mockPool = {};
    (permissionModel.hasPermission as jest.Mock).mockResolvedValue(false);
  });

  describe('authentication and id resolution', () => {
    it('rejects an unauthenticated request with 401', async () => {
      mockReq.session = {} as unknown as Session;
      mockReq.params = { id: '3' };

      await run(requireProjectAccess(mockPool as Pool));

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('rejects a request with no id with 400', async () => {
      await run(requireProjectAccess(mockPool as Pool));

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid id' });
      expect(accessModel.isProjectMember).not.toHaveBeenCalled();
    });

    it('rejects a non-numeric id with 400', async () => {
      mockReq.params = { id: '3; DROP TABLE projects' };

      await run(requireProjectAccess(mockPool as Pool));

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('reads the id from route params first', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { id: '2' };
      mockReq.query = { id: '3' };
      (accessModel.isProjectMember as jest.Mock).mockResolvedValue(true);

      await run(requireProjectAccess(mockPool as Pool));

      expect(accessModel.isProjectMember).toHaveBeenCalledWith(
        mockPool,
        '1',
        '7',
      );
    });

    it('falls back to the body when params has no id', async () => {
      mockReq.body = { id: '2' };
      mockReq.query = { id: '3' };
      (accessModel.isProjectMember as jest.Mock).mockResolvedValue(true);

      await run(requireProjectAccess(mockPool as Pool));

      expect(accessModel.isProjectMember).toHaveBeenCalledWith(
        mockPool,
        '2',
        '7',
      );
    });

    it('falls back to the query string last', async () => {
      mockReq.query = { taskId: '3' };
      (accessModel.isTaskProjectMember as jest.Mock).mockResolvedValue(true);

      await run(requireTaskAccess(mockPool as Pool, 'taskId'));

      expect(accessModel.isTaskProjectMember).toHaveBeenCalledWith(
        mockPool,
        '3',
        '7',
      );
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('treats an empty string as a missing id', async () => {
      mockReq.params = { id: '' };
      mockReq.body = { id: '5' };
      (accessModel.isProjectMember as jest.Mock).mockResolvedValue(true);

      await run(requireProjectAccess(mockPool as Pool));

      expect(accessModel.isProjectMember).toHaveBeenCalledWith(
        mockPool,
        '5',
        '7',
      );
    });

    it('coerces a numeric id to a string', async () => {
      mockReq.body = { id: 9 };
      (accessModel.isProjectMember as jest.Mock).mockResolvedValue(true);

      await run(requireProjectAccess(mockPool as Pool));

      expect(accessModel.isProjectMember).toHaveBeenCalledWith(
        mockPool,
        '9',
        '7',
      );
    });
  });

  describe('admin bypass', () => {
    it('calls next() without a membership check for an Admin', async () => {
      mockReq.params = { id: '4' };
      (permissionModel.hasPermission as jest.Mock).mockResolvedValue(true);

      await run(requireProjectAccess(mockPool as Pool));

      expect(permissionModel.hasPermission).toHaveBeenCalledWith(
        mockPool,
        '7',
        'Admin',
      );
      expect(accessModel.isProjectMember).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('still rejects an Admin when the id is invalid', async () => {
      mockReq.params = { id: 'abc' };
      (permissionModel.hasPermission as jest.Mock).mockResolvedValue(true);

      await run(requireProjectAccess(mockPool as Pool));

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(permissionModel.hasPermission).not.toHaveBeenCalled();
    });
  });

  describe('membership and ownership checks', () => {
    it('returns 403 when the user is not a project member', async () => {
      mockReq.params = { id: '4' };
      (accessModel.isProjectMember as jest.Mock).mockResolvedValue(false);

      await run(requireProjectAccess(mockPool as Pool));

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Access denied' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('requireTaskAccess uses the task membership check', async () => {
      mockReq.params = { id: '11' };
      (accessModel.isTaskProjectMember as jest.Mock).mockResolvedValue(false);

      await run(requireTaskAccess(mockPool as Pool));

      expect(accessModel.isTaskProjectMember).toHaveBeenCalledWith(
        mockPool,
        '11',
        '7',
      );
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('requireTaskAccessBy uses the supplied resolver', async () => {
      mockReq.params = { somethingElse: '12' };
      (accessModel.isTaskProjectMember as jest.Mock).mockResolvedValue(true);

      await run(
        requireTaskAccessBy(
          mockPool as Pool,
          (req) => (req.params as Record<string, string>).somethingElse,
        ),
      );

      expect(accessModel.isTaskProjectMember).toHaveBeenCalledWith(
        mockPool,
        '12',
        '7',
      );
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('requireCommentOwnership uses the comment author check', async () => {
      mockReq.params = { id: '13' };
      (accessModel.isCommentAuthor as jest.Mock).mockResolvedValue(true);

      await run(requireCommentOwnership(mockPool as Pool));

      expect(accessModel.isCommentAuthor).toHaveBeenCalledWith(
        mockPool,
        '13',
        '7',
      );
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('requireTimeLogOwnership defaults to the timeLogId key', async () => {
      mockReq.params = { timeLogId: '14' };
      (accessModel.isTimeLogOwner as jest.Mock).mockResolvedValue(false);

      await run(requireTimeLogOwnership(mockPool as Pool));

      expect(accessModel.isTimeLogOwner).toHaveBeenCalledWith(
        mockPool,
        '14',
        '7',
      );
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('error propagation', () => {
    it('forwards a permission lookup failure to next()', async () => {
      mockReq.params = { id: '4' };
      const error = new Error('permission lookup failed');
      (permissionModel.hasPermission as jest.Mock).mockRejectedValue(error);

      await run(requireProjectAccess(mockPool as Pool));

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('forwards a membership lookup failure to next()', async () => {
      mockReq.params = { id: '4' };
      const error = new Error('membership lookup failed');
      (accessModel.isProjectMember as jest.Mock).mockRejectedValue(error);

      await run(requireProjectAccess(mockPool as Pool));

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
