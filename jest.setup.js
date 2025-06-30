// Jest setup file for test environment configuration
const dotenv = require('dotenv')

// Load test environment variables
dotenv.config({ path: '.env.test' })

// Set default test environment variables
process.env.NODE_ENV = 'test'
process.env.LOG_LEVEL = 'error' // Reduce log noise during tests
process.env.NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687'
process.env.NEO4J_USER = process.env.NEO4J_USER || 'neo4j'
process.env.NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'testpassword'

// Increase timeout for tests that might need more time
jest.setTimeout(30000)

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Keep console.error and console.warn for debugging
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
}

// Global test utilities
global.testUtils = {
  // Add any global test utilities here
  delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),

  // Generate test data helpers
  generateTestId: () =>
    `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

  // Mock data generators
  mockProject: () => ({
    id: global.testUtils.generateTestId(),
    name: 'Test Project',
    description: 'A test project',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),

  mockTask: () => ({
    id: global.testUtils.generateTestId(),
    title: 'Test Task',
    description: 'A test task',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),

  mockKnowledge: () => ({
    id: global.testUtils.generateTestId(),
    title: 'Test Knowledge',
    content: 'Test knowledge content',
    type: 'note',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
})

// Clean up after tests
afterEach(() => {
  jest.clearAllMocks()
})

// Global teardown for each test
beforeEach(() => {
  // Reset any global state if needed
})
