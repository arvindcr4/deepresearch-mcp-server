/**
 * Jest Test Setup
 * Runs before each test to configure the testing environment
 */

import { jest } from '@jest/globals';

// Load test environment variables
try {
  const { config } = await import('dotenv');
  config({ path: '.env.test' });
} catch (error) {
  // dotenv is optional for tests
}

// Mock console methods to reduce noise in test output
(global as any).console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set default environment variables for testing
if (typeof process !== 'undefined') {
  process.env.NODE_ENV = 'test';
  process.env.NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
  process.env.NEO4J_USERNAME = process.env.NEO4J_USERNAME || 'neo4j';
  process.env.NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'testpassword';
  process.env.MCP_SERVER_NAME = 'test-server';
  process.env.SECURITY_AUTH_REQUIRED = 'false';
}

// Set reasonable timeouts for async operations
jest.setTimeout(30000);

// Global test utilities
declare global {
  var testUtils: {
    delay: (ms: number) => Promise<void>;
    generateTestId: () => string;
    mockNeo4jDriver: any;
  };
}

(global as any).testUtils = {
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  generateTestId: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  mockNeo4jDriver: null, // Will be set up in individual tests
};