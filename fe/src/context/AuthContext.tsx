import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api } from '../api/api';
import { AUTH_UNAUTHORIZED_EVENT } from '../constants/auth';
import { User } from '../types/user';
import {
  AuthContextType,
  AuthProviderProps,
  UserPermission,
} from '../types/auth';
import logger from '../utils/logger';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);

  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const checkSession = async () => {
      try {
        setPermissionsLoading(true);
        setError(null);

        const response = await api.get('/check-session', {
          signal: controller.signal,
        });

        if (response.status === 200) {
          setCurrentUser(response.data.user);
          setUserPermissions(response.data.permissions ?? []);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        logger.error('Session check failed:', error);
        setCurrentUser(null);
        setUserPermissions([]);
        setError('Failed to load user session');
      } finally {
        if (!controller.signal.aborted) setPermissionsLoading(false);
      }
    };

    checkSession();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const resetUnauthorizedSession = () => {
      setCurrentUser(null);
      setUserPermissions([]);
      setPermissionsLoading(false);
      setError(null);
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, resetUnauthorizedSession);
    return () => {
      window.removeEventListener(
        AUTH_UNAUTHORIZED_EVENT,
        resetUnauthorizedSession,
      );
    };
  }, []);

  const hasPermission = useCallback(
    (requiredPermission: string): boolean => {
      if (permissionsLoading) return false;
      return userPermissions.some((p) => p.permission === requiredPermission);
    },
    [permissionsLoading, userPermissions],
  );

  const login = useCallback(
    async (loginName: string, password: string): Promise<boolean> => {
      try {
        setPermissionsLoading(true);
        setError(null);

        const response = await api.post('/login', {
          login: loginName,
          password,
        });
        if (response && response.data && response.data.user) {
          setCurrentUser(response.data.user);
          setUserPermissions(response.data.permissions ?? []);
          setPermissionsLoading(false);
          return true;
        }
        setCurrentUser(null);
        setUserPermissions([]);
        setError('Login failed. Please check your credentials.');
        setPermissionsLoading(false);
        return false;
      } catch (error) {
        logger.error('Login failed:', error);
        setCurrentUser(null);
        setUserPermissions([]);
        setError('Login failed. Please check your credentials.');
        setPermissionsLoading(false);
        return false;
      }
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      setPermissionsLoading(true);
      await api.post('/logout', {});
    } catch (error) {
      logger.error('Logout failed:', error);
    } finally {
      setCurrentUser(null);
      setUserPermissions([]);

      setPermissionsLoading(false);
    }
  }, []);

  const contextValue = useMemo<AuthContextType>(
    () => ({
      currentUser,
      login,
      logout,
      hasPermission,
      permissionsLoading,
      error,
      userPermissions,
    }),
    [
      currentUser,
      login,
      logout,
      hasPermission,
      permissionsLoading,
      error,
      userPermissions,
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export default AuthProvider;
