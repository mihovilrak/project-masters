import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW server for Node.js (Jest) environment
 * This intercepts HTTP requests in tests
 */
export const server = setupServer(...handlers);
