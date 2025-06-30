import { config } from '../src/config/index.js';
import { neo4jDriver, clearNeo4jDatabase, initializeNeo4jSchema } from '../src/services/neo4j/index.js';

// Suppress logs during testing unless explicitly enabled
if (process.env.TEST_VERBOSE !== 'true') {
  // Minimize console output during tests
  const noop = () => {};
  global.console = {
    ...console,
    log: noop,
    info: noop,
    warn: noop,
    debug: noop,
  };
}

beforeAll(async () => {
  // Ensure we're using test database configuration
  if (!process.env.NEO4J_TEST_URI) {
    throw new Error('NEO4J_TEST_URI environment variable must be set for testing');
  }
  
  // Override config for testing
  (config as any).neo4jUri = process.env.NEO4J_TEST_URI;
  (config as any).environment = 'test';
  
  // Initialize test database schema
  await initializeNeo4jSchema();
});

beforeEach(async () => {
  // Clear database before each test for clean state
  await clearNeo4jDatabase();
});

afterEach(async () => {
  // Additional cleanup if needed
});

afterAll(async () => {
  // Close database connection
  await neo4jDriver.close();
});

// Global test utilities
declare global {
  namespace globalThis {
    var testUtils: {
      createTestProject: () => any;
      createTestTask: () => any;
      createTestKnowledge: () => any;
      waitForAsyncOperation: (ms?: number) => Promise<void>;
    };
  }
}

globalThis.testUtils = {
  createTestProject: () => ({
    mode: 'single',
    name: 'Test Project',
    description: 'A test project for integration testing',
    status: 'active',
    completionRequirements: 'Complete all test scenarios successfully',
    outputFormat: 'Test results and documentation',
    taskType: 'testing'
  }),
  
  createTestTask: () => ({
    mode: 'single',
    title: 'Test Task',
    description: 'A test task for integration testing',
    status: 'active',
    priority: 'medium',
    taskType: 'testing',
    projectId: 'test-project-id',
    completionRequirements: 'Execute test scenarios'
  }),
  
  createTestKnowledge: () => ({
    title: 'Test Knowledge',
    description: 'Test knowledge for integration testing',
    content: 'This is test content for knowledge management testing',
    tags: ['test', 'integration'],
    metadata: {
      source: 'integration-test',
      confidence: 'high'
    }
  }),
  
  waitForAsyncOperation: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms))
};