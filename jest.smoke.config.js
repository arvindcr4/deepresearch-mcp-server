/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  displayName: 'Smoke Tests',
  testMatch: [
    '**/smoke/**/*.test.ts',
    '**/smoke/**/*.smoke.ts',
    '**/*.smoke.test.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.smoke.setup.js'],
  testTimeout: 30000,
  maxWorkers: 1, // Run smoke tests sequentially
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  // No coverage collection for smoke tests
  collectCoverage: false,
  // Smoke tests should be fast and minimal
  bail: true, // Stop on first failure
  // Environment-specific configuration
  testEnvironmentOptions: {
    NODE_ENV: process.env.NODE_ENV || 'production'
  }
};