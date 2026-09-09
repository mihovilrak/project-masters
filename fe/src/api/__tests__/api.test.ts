import axios, { AxiosError } from 'axios';
import { api, AUTH_UNAUTHORIZED_EVENT, handleApiError } from '../api';
import logger from '../../utils/logger';

// Mock axios with interceptors so api.ts can attach 401 handler
jest.mock('axios', () => ({
  create: jest.fn().mockReturnValue({
    defaults: {
      baseURL: '/api',
      withCredentials: true,
    },
    interceptors: {
      response: {
        use: jest.fn(),
      },
    },
  }),
}));

describe('API Configuration', () => {
  it('should export a configured axios instance', () => {
    // Focus only on validating that the API exports what we expect
    expect(api).toBeDefined();
    expect(api.defaults.baseURL).toBe('/api');
    expect(api.defaults.withCredentials).toBe(true);
  });

  it('logs rejected requests once with request context', async () => {
    const error = Object.assign(new Error('Request failed'), {
      config: { method: 'get', url: '/tasks' },
      response: { status: 500 },
    }) as AxiosError;

    await expect(handleApiError(error)).rejects.toBe(error);
    expect(logger.error).toHaveBeenCalledWith('API request failed', {
      method: 'GET',
      url: '/tasks',
      status: 500,
      message: 'Request failed',
    });
  });

  it('uses SPA navigation and emits an auth reset event on 401', async () => {
    window.history.replaceState(null, '', '/tasks');
    const replaceState = jest.spyOn(window.history, 'replaceState');
    const dispatchEvent = jest.spyOn(window, 'dispatchEvent');
    const error = Object.assign(new Error('Unauthorized'), {
      config: { method: 'get', url: '/tasks' },
      response: { status: 401 },
    }) as AxiosError;

    await expect(handleApiError(error)).rejects.toBe(error);

    expect(replaceState).toHaveBeenCalledWith(null, '', '/login');
    expect(dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: AUTH_UNAUTHORIZED_EVENT }),
    );
    expect(dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'popstate' }),
    );
  });
});
