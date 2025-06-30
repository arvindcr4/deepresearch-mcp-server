# Smoke Tests

This directory contains smoke tests for the deepresearch-mcp-server project. Smoke tests are high-level tests that check if the basic functionality of the application works without going into detailed testing.

## Test Files

- **basic.smoke.test.ts** - Tests core configuration, logger, and environment setup
- **config.smoke.test.ts** - Tests configuration loading and validation 
- **database.smoke.test.ts** - Tests Neo4j database connectivity and basic operations
- **server.smoke.test.ts** - Tests MCP server initialization and shutdown
- **services.smoke.test.ts** - Tests core service classes and their methods
- **tools.smoke.test.ts** - Tests MCP tool loading and basic execution
- **utils.smoke.test.ts** - Tests utility functions like ID generation and logging

## Running Smoke Tests

```bash
# Run all tests
npm test

# Run only smoke tests
npm run test:smoke

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Requirements

Before running the tests, ensure:

1. Neo4j database is running and accessible
2. Environment variables are set (or using defaults):
   - `NEO4J_URI` (default: bolt://localhost:7687)
   - `NEO4J_USER` (default: neo4j)
   - `NEO4J_PASSWORD` (required)
3. Node.js dependencies are installed (`npm install`)

## Test Environment

The tests use a separate test configuration:
- `NODE_ENV=test`
- `LOG_LEVEL=silent` (to reduce noise during testing)
- Database connection uses the same Neo4j instance but can be configured separately

## What Smoke Tests Check

These tests verify:
- ✅ Application can start without crashing
- ✅ Configuration loads properly
- ✅ Database connection works
- ✅ Core services can be instantiated
- ✅ MCP server can be created and shut down
- ✅ Basic tool operations don't throw errors
- ✅ Utility functions work as expected

Smoke tests are **not** comprehensive - they don't test complex business logic, edge cases, or error scenarios. They're designed to catch obvious problems quickly.