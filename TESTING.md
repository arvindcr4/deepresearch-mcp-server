# Testing Infrastructure Documentation

This document provides comprehensive information about the automation testing infrastructure for the Deep Research MCP Server.

## 🎯 Overview

The testing infrastructure provides complete coverage for the MCP server including:
- **Unit Tests**: Individual service and utility functions
- **Integration Tests**: MCP tool interactions and workflows
- **End-to-End Tests**: Complete server functionality
- **Performance Tests**: Concurrency and load testing
- **Security Tests**: Input validation and authorization

## 📁 Test Structure

```
deepresearch-mcp-server/
├── src/__tests__/
│   ├── setup.ts                    # Jest test setup
│   ├── globalSetup.ts             # Global test initialization
│   ├── globalTeardown.ts          # Global test cleanup
│   ├── mocks/
│   │   └── neo4j.mock.ts          # Neo4j driver mock
│   ├── utils/
│   │   └── testRunner.ts          # Custom test runner
│   ├── unit/
│   │   └── services/              # Unit tests for services
│   │       ├── projectService.test.ts
│   │       └── taskService.test.ts
│   ├── integration/
│   │   └── mcp-tools/             # Integration tests for MCP tools
│   │       ├── atlas-project-create.test.ts
│   │       └── atlas-task-create.test.ts
│   └── e2e/
│       └── mcp-server.test.ts     # End-to-end server tests
├── scripts/
│   └── run-tests.ts               # Test runner script
├── jest.config.js                 # Jest configuration
├── .env.test                      # Test environment variables
└── TESTING.md                     # This documentation
```

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

The following test dependencies are automatically installed:
- `jest`: Test framework
- `ts-jest`: TypeScript support for Jest
- `@jest/globals`: Jest globals for ESM
- `@types/jest`: TypeScript definitions
- `supertest`: HTTP testing utilities

### 2. Environment Configuration

Create a `.env.test` file (already provided) with test-specific configuration:

```env
NODE_ENV=test
LOG_LEVEL=error
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=testpassword
SECURITY_AUTH_REQUIRED=false
```

### 3. Database Setup (Optional)

For integration tests, you can either:
- **Use Mocks** (default): Tests use the provided Neo4j mock
- **Use Real Database**: Set up a test Neo4j instance

## 🚀 Running Tests

### Jest Test Suite

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e
```

### Custom Test Runner

```bash
# Run comprehensive test suite
npx ts-node --esm scripts/run-tests.ts

# Or make it executable and run directly
chmod +x scripts/run-tests.ts
./scripts/run-tests.ts
```

## 📊 Test Categories

### Unit Tests

**Location**: `src/__tests__/unit/`
**Purpose**: Test individual components in isolation

**Coverage**:
- ProjectService: CRUD operations, validation, dependencies
- TaskService: Task management, filtering, relationships
- KnowledgeService: Knowledge base operations
- SearchService: Search functionality
- Utilities: Helper functions and validation

**Example**:
```typescript
describe('ProjectService', () => {
  it('should create a new project successfully', async () => {
    const projectData = {
      name: 'Test Project',
      description: 'A test project',
      status: 'active' as const,
    };
    
    const result = await ProjectService.createProject(projectData);
    
    expect(result).toBeDefined();
    expect(result.name).toBe(projectData.name);
    expect(result.status).toBe(projectData.status);
  });
});
```

### Integration Tests

**Location**: `src/__tests__/integration/`
**Purpose**: Test MCP tool interactions and workflows

**Coverage**:
- All 14 Atlas MCP tools
- Tool registration and validation
- Parameter handling and responses
- Cross-tool workflows

**Example**:
```typescript
describe('Atlas Project Create Tool Integration', () => {
  it('should handle valid project creation request', async () => {
    const requestArgs = {
      name: 'atlas_project_create',
      arguments: {
        name: 'Integration Test Project',
        description: 'A project created during integration testing',
        status: 'active',
      },
    };
    
    const result = await server.callTool(requestArgs);
    expect(result.isError).toBeFalsy();
  });
});
```

### End-to-End Tests

**Location**: `src/__tests__/e2e/`
**Purpose**: Test complete server functionality

**Coverage**:
- Server startup and shutdown
- Tool registration and availability
- Complete project workflows
- Error handling and recovery
- Security and authorization

### Performance Tests

**Included in**: Custom test runner
**Purpose**: Test system performance and concurrency

**Coverage**:
- Concurrent operations
- Large data handling
- Memory usage
- Response times

### Security Tests

**Included in**: End-to-end and custom tests
**Purpose**: Validate security measures

**Coverage**:
- Input validation
- SQL injection protection
- XSS prevention
- Rate limiting
- Authorization checks

## 🔧 Test Utilities

### Neo4j Mock

**Location**: `src/__tests__/mocks/neo4j.mock.ts`

Provides a complete mock of the Neo4j driver with:
- In-memory data store
- Query simulation
- Transaction support
- Relationship handling

**Usage**:
```typescript
import { mockNeo4jDriver, resetMockDataStore } from '../mocks/neo4j.mock.js';

beforeEach(() => {
  resetMockDataStore();
});
```

### Custom Test Runner

**Location**: `src/__tests__/utils/testRunner.ts`

Features:
- Test suite organization
- Async test execution
- Timeout handling
- Error reporting
- Performance metrics

**Usage**:
```typescript
import { TestRunner, createTestSuite, createTestCase, assert } from './testRunner.js';

const runner = new TestRunner();
const suite = createTestSuite('My Test Suite');

suite.tests.push(
  createTestCase('should do something', async () => {
    assert.equals(1 + 1, 2);
  })
);

runner.addSuite(suite);
const report = await runner.runAllSuites();
```

## 📈 Coverage Reports

### Generating Coverage

```bash
npm run test:coverage
```

Coverage reports are generated in:
- `coverage/`: HTML reports
- Terminal output for quick overview

### Coverage Targets

Current thresholds:
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## 🐛 Debugging Tests

### Debug Mode

```bash
# Enable debug logging
DEBUG=* npm test

# Run specific test file
npm test -- --testPathPattern=projectService.test.ts

# Run with verbose output
npm test -- --verbose
```

### Common Issues

1. **Mock Import Issues**: Ensure mocks are imported before the actual modules
2. **Async Test Timeouts**: Increase timeout for slow operations
3. **Environment Variables**: Check `.env.test` configuration
4. **TypeScript Errors**: Ensure all types are properly imported

## 🔄 Continuous Integration

### GitHub Actions (Recommended)

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
```

### Local Pre-commit Hooks

```bash
# Install husky
npm install --save-dev husky

# Add pre-commit hook
npx husky add .husky/pre-commit "npm test"
```

## 📝 Writing New Tests

### Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  it('should do something specific', async () => {
    // Arrange
    const input = 'test data';
    
    // Act
    const result = await functionUnderTest(input);
    
    // Assert
    expect(result).toBeDefined();
  });
});
```

### Best Practices

1. **Clear Test Names**: Use descriptive test names that explain what is being tested
2. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification
3. **Isolation**: Each test should be independent and not rely on other tests
4. **Mock External Dependencies**: Use mocks for databases, APIs, and external services
5. **Edge Cases**: Test boundary conditions and error scenarios
6. **Performance**: Include performance-sensitive tests for critical paths

### Adding New Test Suites

1. Create test file in appropriate directory
2. Follow naming convention: `*.test.ts`
3. Import required testing utilities
4. Write comprehensive test cases
5. Update this documentation if needed

## 🏆 Test Quality Metrics

### Code Coverage

- **Unit Tests**: Aim for 90%+ coverage
- **Integration Tests**: Focus on critical workflows
- **E2E Tests**: Cover main user journeys

### Test Performance

- **Unit Tests**: < 100ms per test
- **Integration Tests**: < 1s per test
- **E2E Tests**: < 10s per test

### Maintenance

- **Regular Updates**: Keep tests updated with code changes
- **Refactoring**: Regularly refactor test code for maintainability
- **Documentation**: Update test documentation as features evolve

## 🎯 Method Cardio: Testing Practice

Just like JavaScript array methods need practice, testing requires regular exercise! Here are some "cardio" exercises for testing skills:

### Basic Testing Exercises

1. **Assertion Workout**: Write 10 different assertions for the same function
2. **Mock Marathon**: Create mocks for complex dependencies
3. **Edge Case Exploration**: Find and test 5 edge cases for each function
4. **Error Handling**: Test every possible error condition
5. **Performance Testing**: Measure and optimize slow tests

### Advanced Testing Challenges

1. **Concurrency Testing**: Test race conditions and concurrent access
2. **Integration Choreography**: Test complex multi-service workflows
3. **Security Testing**: Validate input sanitization and authorization
4. **Load Testing**: Simulate high-traffic scenarios
5. **Chaos Engineering**: Test system resilience under failure conditions

### Daily Testing Routine

- **Morning**: Run unit tests while drinking coffee ☕
- **Midday**: Write integration tests for new features
- **Evening**: Review and refactor existing tests
- **Weekend**: Explore new testing techniques and tools

## 📚 Resources

### Documentation

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/)
- [Node.js Testing Best Practices](https://github.com/goldbergyoni/nodebestpractices#-6-testing-and-overall-quality-practices)

### Tools

- **Jest**: Primary testing framework
- **Supertest**: HTTP testing
- **ts-jest**: TypeScript support
- **Coverage**: Built-in coverage reporting

### Community

- Join testing communities and forums
- Follow testing best practices blogs
- Contribute to open-source testing tools
- Share your testing experiences

---

## 🎉 Conclusion

This comprehensive testing infrastructure provides robust coverage for the Deep Research MCP Server. The combination of unit tests, integration tests, end-to-end tests, and performance tests ensures high code quality and system reliability.

Remember: **Good tests are not just about finding bugs—they're about building confidence in your code!**

Happy Testing! 🧪✨