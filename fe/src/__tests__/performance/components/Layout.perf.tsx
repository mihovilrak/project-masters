import React from 'react';
import { render } from '@testing-library/react';
import { Profiler } from 'react';
import { TestWrapper } from '../../TestWrapper';
import Layout from '../../../components/Layout/Layout';
import { User } from '../../../types/user';
import AuthProvider from '../../../context/AuthContext';

// Mock auth module
jest.mock('../../../context/AuthContext', () => {
  const originalModule = jest.requireActual('../../../context/AuthContext');
  return {
    ...originalModule,
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => {
      return children;
    },
    useAuth: () => ({
      currentUser: mockCurrentUser,
      login: jest.fn(),
      logout: jest.fn(),
      loading: false,
      error: null,
      userPermissions: [],
      permissionsLoading: false,
      hasPermission: jest.fn().mockReturnValue(true),
    }),
  };
});

// Mock data
const mockCurrentUser: User = {
  id: 1,
  login: 'testuser',
  email: 'test@example.com',
  name: 'Test',
  surname: 'User',
  role_id: 1,
  status_id: 1,
  avatar_url: null,
  created_on: new Date().toISOString(),
  updated_on: null,
  last_login: null,
};

// Performance measurement callback
const onRenderCallback = (
  id: string,
  phase: 'mount' | 'update' | 'nested-update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number,
) => {
  // Log performance metrics
  console.log(`${id} - ${phase}`);
  console.log(`Actual duration: ${actualDuration.toFixed(2)}ms`);
  console.log(`Base duration: ${baseDuration.toFixed(2)}ms`);
  console.log(`Commit time: ${commitTime}ms`);
};

// Helper function to measure render performance
const measurePerformance = (
  Component: React.ComponentType<any>,
  props = {},
) => (
  <TestWrapper>
    <AuthProvider>
      <Profiler id={Component.name} onRender={onRenderCallback}>
        <Component {...props} />
      </Profiler>
    </AuthProvider>
  </TestWrapper>
);

describe('Layout Components Performance', () => {
  describe('Layout', () => {
    it('renders efficiently with default configuration', () => {
      render(
        measurePerformance(Layout, {
          children: <div>Test Content</div>,
        }),
      );
    });

    it('renders efficiently with multiple children', () => {
      render(
        measurePerformance(Layout, {
          children: (
            <>
              <div>Child 1</div>
              <div>Child 2</div>
              <div>Child 3</div>
            </>
          ),
        }),
      );
    });
  });

});
