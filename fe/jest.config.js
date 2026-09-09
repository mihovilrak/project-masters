// Date-bucketing tests assert local-time hours; pin the zone so they don't
// depend on the developer's machine matching the UTC CI runners.
process.env.TZ = 'UTC';

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jest-fixed-jsdom', // MSW v2 needs Node globals jsdom strips
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  // CI runners are slower; avoid timeout flakiness (default 5000)
  testTimeout: process.env.CI ? 15000 : 5000,
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/__mocks__/fileMock.js',
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        useESM: false,
      },
    ],
    '^.+\\.(js|jsx|mjs|cjs|es\\.js)$': ['babel-jest', { rootMode: 'upward' }],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@mui|@emotion|mui-color-input|react-router-dom|@mswjs|msw|@open-draft|outvariant|headers-polyfill|until-async|rettime|tagged-tag|is-node-process|strict-event-emitter|graphql|yoctocolors-cjs|@inquirer)).+',
  ],
  testRegex: '\\.(test|spec)\\.[tj]sx?$',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/mocks/',
    '/dist/',
    '/build/',
  ],
  coverageThreshold: {
    global: { statements: 80, branches: 60, functions: 75, lines: 80 },
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  clearMocks: true,
  restoreMocks: true,
};
