import { Response } from 'express';
import { Pool } from 'pg';
import { CustomRequest } from '../../types/express';
import * as sessionController from '../sessionController';
import { Session } from 'express-session';

jest.mock('../../models/permissionModel', () => ({
  getUserPermissions: jest
    .fn()
    .mockResolvedValue([{ user_id: '1', permission: 'Admin' }]),
}));

describe('SessionController', () => {
  let mockReq: Partial<CustomRequest>;
  let mockRes: Partial<Response>;
  let mockPool: Partial<Pool>;

  beforeEach(() => {
    mockPool = {};
    // Create a partial mock Session object with required properties
    const mockSession = {
      id: 'test-session-id',
      cookie: {
        originalMaxAge: null,
        expires: undefined,
        secure: false,
        httpOnly: true,
        path: '/',
        domain: undefined,
        sameSite: 'strict',
      },
      regenerate: jest.fn((callback: (err: any) => void) => {
        callback(null);
        return mockSession as unknown as Session;
      }),
      destroy: jest.fn((callback: (err: any) => void) => {
        callback(null);
        return mockSession as unknown as Session;
      }),
      reload: jest.fn((callback: (err: any) => void) => {
        callback(null);
        return mockSession as unknown as Session;
      }),
      resetMaxAge: jest.fn().mockReturnThis(),
      touch: jest.fn(),
      save: jest.fn((callback?: (err: any) => void) => {
        if (callback) callback(null);
        return mockSession as unknown as Session;
      }),
      user: undefined,
    } as unknown as Session &
      Partial<{ user: { id: string; login: string; role_id: number } }>;

    mockReq = {
      params: {},
      query: {},
      body: {},
      session: mockSession,
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe('session', () => {
    it('should return user data and permissions when session exists', async () => {
      const mockUser = {
        id: 1,
        login: 'testuser',
        role_id: 1,
      };
      mockReq.session!.user = mockUser as unknown as {
        id: string;
        login: string;
        role_id: number;
      };

      await sessionController.session(
        mockReq as CustomRequest,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        user: mockReq.session!.user,
        permissions: [{ user_id: '1', permission: 'Admin' }],
      });
    });

    it('should return 401 when no session exists', async () => {
      mockReq.session!.user = undefined;

      await sessionController.session(
        mockReq as CustomRequest,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Not authenticated',
      });
    });

    it('should return 500 on internal error', async () => {
      // Create a getter that throws an error
      Object.defineProperty(mockReq.session, 'user', {
        get: () => {
          throw new Error('Session error');
        },
        configurable: true,
      });

      await sessionController.session(
        mockReq as CustomRequest,
        mockRes as Response,
        mockPool as Pool,
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
      });
    });
  });
});
