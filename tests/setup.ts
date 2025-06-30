import { config } from '../src/config/index.js';
import { logger } from '../src/utils/logger.js';

// Set up test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
process.env.NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
process.env.NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';

// Global test timeout
jest.setTimeout(30000);

// Suppress console logs during tests unless explicitly needed
beforeAll(() => {
  // Tests will use LOG_LEVEL='silent' from environment setup above
});

afterAll(() => {
  // Clean up any global resources
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});