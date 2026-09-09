import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { server } from './__tests__/mocks/server';

// Configure testing library
configure({
  // Increase the timeout for async operations
  asyncUtilTimeout: 5000,
  // Add custom queries if needed
});

// Add support for act warnings in React 18
// @ts-ignore - Adding React 18 specific environment flag
global.IS_REACT_ACT_ENVIRONMENT = true;

// Mock logger so tests don't depend on real console and logger calls don't leak
jest.mock('./utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock TouchRipple to prevent unwanted act warnings
jest.mock('@mui/material/ButtonBase/TouchRipple', () => {
  return {
    __esModule: true,
    default: function TouchRipple() {
      return null;
    },
  };
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    console.log('MockIntersectionObserver constructor', callback, options);
  }

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

global.IntersectionObserver = MockIntersectionObserver;

// Mock MutationObserver for MUI
global.MutationObserver = class MutationObserver {
  observe() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
};

// Mock for MUI Popper positioning
jest.mock('@mui/material/styles', () => {
  const originalModule = jest.requireActual('@mui/material/styles');
  return {
    ...originalModule,
    useTheme: () => ({
      ...originalModule.useTheme(),
      transitions: { create: () => 'none' },
      components: {},
    }),
  };
});

// Suppress the third-party MUI findDOMNode deprecation warning.
const originalConsoleError = console.error;
console.error = (...args) => {
  if (/Warning: findDOMNode is deprecated in StrictMode/.test(args[0])) {
    return;
  }
  originalConsoleError(...args);
};

// Establish API mocking before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

// Reset any request handlers that are declared as a part of our tests
// (i.e. for testing one-time error scenarios)
afterEach(() => {
  server.resetHandlers();
});

// Clean up after the tests are finished
afterAll(() => {
  server.close();
});
