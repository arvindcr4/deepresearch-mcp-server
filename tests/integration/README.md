# Integration Tests

This directory contains integration tests for the deepresearch-mcp-server project.

## Test Structure

### Database Integration Tests
- **`basic.integration.test.ts`**: Tests core database functionality and connection
- **`neo4j.integration.test.ts`**: Tests Neo4j service layer operations
- **`mcp-tools.integration.test.ts`**: Tests MCP tool implementations
- **`mcp-server.integration.test.ts`**: Tests the complete MCP server

## Running Tests

### Prerequisites
1. Neo4j database running on `bolt://localhost:7687`
2. Test database credentials configured in `.env.test`
3. Node.js dependencies installed (`npm install`)

### Commands
```bash
# Run all integration tests
npm run test:integration

# Run specific test file
npm test -- tests/integration/basic.integration.test.ts

# Run with coverage
npm run test:coverage

# Run with verbose output
TEST_VERBOSE=true npm test
```

## Test Environment

Tests use a separate test database configuration to avoid affecting development data:
- Database URI: `NEO4J_TEST_URI` (from `.env.test`)
- Each test starts with a clean database state
- Tests run sequentially to avoid conflicts

## Test Utilities

Global test utilities are available via `globalThis.testUtils`:
- `createTestProject()`: Creates test project data
- `createTestTask()`: Creates test task data  
- `createTestKnowledge()`: Creates test knowledge data
- `waitForAsyncOperation()`: Helper for async operations

## Test Categories

### Unit Integration Tests
- Test individual service methods
- Verify database operations
- Check data consistency

### Tool Integration Tests  
- Test MCP tool implementations
- Verify tool input/output formats
- Test error handling

### Server Integration Tests
- Test complete MCP server functionality
- Verify tool registration and execution
- Test resource management

### Performance Tests
- Test batch operations
- Verify concurrent execution
- Check response times

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure Neo4j is running
   - Check `.env.test` configuration
   - Verify database credentials

2. **Test Timeouts**
   - Increase timeout in `jest.config.js`
   - Check for hanging promises
   - Verify database cleanup

3. **Import/Export Errors**
   - Verify TypeScript compilation
   - Check ES module imports
   - Ensure all dependencies are installed

### Debug Mode
```bash
# Run with debug output
DEBUG=* npm test

# Run with verbose Jest output
npm test -- --verbose

# Run specific test with logs
TEST_VERBOSE=true npm test -- --testNamePattern="should connect"
```

## Adding New Tests

1. Create test file in appropriate category
2. Use `beforeEach` to ensure clean state
3. Import required services and utilities
4. Write descriptive test names
5. Include both success and error cases
6. Add performance considerations for complex operations

## Test Data Management

- All test data is automatically cleaned between tests
- Use unique identifiers to avoid conflicts
- Create minimal test data for focused testing
- Avoid dependencies between test cases