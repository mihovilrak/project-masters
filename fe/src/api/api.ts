import axios, { AxiosError, AxiosInstance } from 'axios';
import logger from '../utils/logger';
import { AUTH_UNAUTHORIZED_EVENT } from '../constants/auth';

export { AUTH_UNAUTHORIZED_EVENT } from '../constants/auth';

export const api: AxiosInstance = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

export const handleApiError = (error: AxiosError): Promise<never> => {
  const status = error.response?.status;
  const config = error.config;
  logger.error('API request failed', {
    method: config?.method?.toUpperCase(),
    url: config?.url,
    status,
    message: error.message,
  });
  const isLoginRequest =
    config?.url?.includes('/login') && config?.method?.toLowerCase() === 'post';
  const alreadyOnLogin =
    typeof window !== 'undefined' && window.location.pathname === '/login';
  if (status === 401 && !isLoginRequest && !alreadyOnLogin) {
    window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
    window.history.replaceState(null, '', '/login');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
  return Promise.reject(error);
};

api.interceptors.response.use((response) => response, handleApiError);
