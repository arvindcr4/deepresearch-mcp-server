# Unit Testing Setup for DeepResearch MCP Server

## Overview

This document outlines the comprehensive unit testing setup created for the DeepResearch MCP Server. The testing infrastructure provides robust test coverage for all major components of the system, including services, tools, utilities, and schemas.

## Testing Framework

- **Testing Framework**: Jest with TypeScript support
- **Test Runner**: Jest with ts-jest for TypeScript compilation
- **Coverage**: Comprehensive code coverage reporting
- **Environment**: Node.js test environment with ESM module support

## Dependencies Added

```json
{
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.2"
  }
}
```

## Configuration Files

### Jest Configuration (`jest.config.js`)
- TypeScript ESM module support
- Custom module name mapping for imports
- Test file discovery patterns
- Coverage collection settings
- Setup file for global test utilities

### Test Setup (`src/__tests__/setup.ts`)
- Global test environment configuration
- Mock configurations for external dependencies
- Test utility functions for creating mock data
- Environment variable setup for testing

## Test Structure Overview

```
src/
├── __tests__/
│   └── setup.ts                    # Global test setup
├── utils/__tests__/
│   ├── logger.test.ts              # Logger utility tests
│   ├── errorHandler.test.ts        # Error handling tests
│   └── idGenerator.test.ts         # ID generation tests
├── services/neo4j/__tests__/
│   ├── projectService.test.ts      # Project service tests
│   └── taskService.test.ts         # Task service tests
├── schemas/__tests__/
│   └── validation.test.ts          # Schema validation tests
├── mcp/tools/__tests__/
│   ├── atlas_project_create.test.ts
│   └── atlas_task_create.test.ts
└── types/
    └── jest.d.ts                   # TypeScript declarations
```

## Test Categories

### 1. Utility Tests

#### Logger Tests (`src/utils/__tests__/logger.test.ts`)
- Tests for debug, info, warn, and error logging
- Singleton pattern verification
- Context parameter handling
- Mock-based testing to prevent file system operations

#### Error Handler Tests (`src/utils/__tests__/errorHandler.test.ts`)
- Tool error handling and formatting
- Error sanitization for sensitive data
- Standardized error response creation
- Unknown error handling

#### ID Generator Tests (`src/utils/__tests__/idGenerator.test.ts`)
- Unique ID generation verification
- ID format and character validation
- Performance testing with large ID sets
- Entity-specific ID generation (projects, tasks, knowledge)

### 2. Service Layer Tests

#### Project Service Tests (`src/services/neo4j/__tests__/projectService.test.ts`)
- CRUD operations (Create, Read, Update, Delete)
- Database transaction handling
- Error handling and rollback scenarios
- Data validation and sanitization
- Filtering and pagination
- Mock Neo4j driver interactions

#### Task Service Tests (`src/services/neo4j/__tests__/taskService.test.ts`)
- Task creation with and without project association
- Task status and priority management
- Task dependency handling
- Filtering by project and status
- Database error scenarios

### 3. Schema Validation Tests

#### Validation Tests (`src/schemas/__tests__/validation.test.ts`)
- Project schema validation
- Task schema validation
- Knowledge schema validation
- Search parameter validation
- Error handling for malformed data
- Detailed error message verification

### 4. MCP Tool Tests

#### Atlas Project Create Tests (`src/mcp/tools/__tests__/atlas_project_create.test.ts`)
- Valid project creation scenarios
- Input validation and error handling
- Database error scenarios
- Tag sanitization and validation
- Priority and status validation

#### Atlas Task Create Tests (`src/mcp/tools/__tests__/atlas_task_create.test.ts`)
- Task creation with various configurations
- Validation of task properties
- Dependency management
- Edge case handling (long names, special characters)

## Testing Patterns

### 1. Mocking Strategy
- **Database Mocking**: Neo4j driver and sessions are mocked to prevent actual database operations
- **Logger Mocking**: Winston logger is mocked to prevent file system operations
- **Service Mocking**: Individual services are mocked when testing higher-level components

### 2. Test Data Generation
- Global test utilities for creating mock objects
- Consistent data structure across tests
- Randomized IDs for test isolation

### 3. Error Testing
- Comprehensive error scenario testing
- Database connection failures
- Validation errors
- Edge cases and boundary conditions

### 4. Assertion Patterns
- Successful operation verification
- Error response structure validation
- Mock function call verification
- Data transformation validation

## Test Utilities

### Global Test Utilities
```typescript
global.testUtils = {
  generateMockId: () => string,
  createMockProject: (overrides?) => MockProject,
  createMockTask: (overrides?) => MockTask,
  createMockKnowledge: (overrides?) => MockKnowledge,
}
```

## Running Tests

### Available Scripts
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Commands
- `npm test`: Runs the complete test suite
- `npm run test:watch`: Runs tests in watch mode for development
- `npm run test:coverage`: Generates detailed coverage reports

## Coverage Goals

The test suite aims to achieve:
- **Line Coverage**: >90%
- **Function Coverage**: >95%
- **Branch Coverage**: >85%
- **Statement Coverage**: >90%

## Best Practices Implemented

### 1. Test Organization
- Tests are co-located with source files in `__tests__` directories
- Clear test naming conventions
- Logical grouping with `describe` blocks

### 2. Test Isolation
- Each test is independent and can run in isolation
- Mocks are reset between tests
- No shared state between tests

### 3. Mock Management
- Comprehensive mocking of external dependencies
- Consistent mock implementations
- Dynamic imports to ensure proper mock application

### 4. Error Scenarios
- Every public method includes error scenario testing
- Database failures are simulated and handled
- Input validation errors are thoroughly tested

### 5. Edge Cases
- Testing with boundary values
- Special character handling
- Empty and null value scenarios
- Large data set handling

## Future Enhancements

### 1. Integration Tests
- End-to-end workflow testing
- Real database integration tests
- MCP protocol compliance testing

### 2. Performance Tests
- Load testing for database operations
- Memory usage validation
- Response time benchmarks

### 3. Contract Tests
- API contract validation
- Schema compliance testing
- Inter-service communication testing

## Maintenance

### Adding New Tests
1. Create test file in appropriate `__tests__` directory
2. Follow existing naming conventions
3. Use global test utilities for mock data
4. Include both success and failure scenarios

### Updating Existing Tests
1. Maintain test isolation
2. Update mocks when interfaces change
3. Preserve test coverage levels
4. Update documentation when test patterns change

## Development Workflow

### Test-Driven Development
1. Write failing tests for new features
2. Implement minimal code to pass tests
3. Refactor while maintaining test coverage
4. Ensure all tests pass before merging

### Continuous Integration
- Tests run automatically on code changes
- Coverage reports generated and monitored
- Test failures block deployments
- Performance regression detection

This comprehensive testing setup ensures the reliability, maintainability, and quality of the DeepResearch MCP Server codebase.