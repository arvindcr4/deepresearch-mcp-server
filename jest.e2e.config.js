/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  displayName: 'E2E Tests',
  testMatch: [
    '**/e2e/**/*.test.ts',
    '**/e2e/**/*.e2e.ts',
    '**/*.e2e.test.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.e2e.setup.js'],
  testTimeout: 60000, // E2E tests may take longer
  maxWorkers: 1, // Run E2E tests sequentially
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/index.ts'
  ],
  coverageDirectory: 'coverage-e2e',
  coverageReporters: ['text', 'lcov'],
  // Global setup and teardown for E2E tests
  globalSetup: '<rootDir>/jest.e2e.global-setup.js',
  globalTeardown: '<rootDir>/jest.e2e.global-teardown.js',
  // Environment-specific configuration
  testEnvironmentOptions: {
    NODE_ENV: process.env.NODE_ENV || 'test'
  }
};