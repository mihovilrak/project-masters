const base = require('./jest.config');

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  ...base,
  testRegex: '[.]perf[.][tj]sx?$',
  maxWorkers: 2,
  testTimeout: 120000,
  coverageThreshold: undefined,
};
