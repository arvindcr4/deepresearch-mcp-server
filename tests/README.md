# Testing Suite

This directory contains the testing suite for the deepresearch-mcp-server project.

## Test Structure

```
tests/
├── setup.ts              # Global test setup and configuration
├── smoke/                 # Smoke tests for basic functionality
│   ├── README.md         # Smoke test documentation
│   ├── basic.smoke.test.ts
│   ├── config.smoke.test.ts
│   ├── database.smoke.test.ts
│   ├── server.smoke.test.ts
│   ├── services.smoke.test.ts
│   ├── tools.smoke.test.ts
│   ├── utils.smoke.test.ts
│   └── integration.smoke.test.ts
└── README.md             # This file
```

## Prerequisites

1. **Neo4j Database Running**
   ```bash
   # Using Docker (recommended)
   npm run docker:up
   
   # Or start your local Neo4j instance
   ```

2. **Environment Variables**
   ```bash
   export NEO4J_URI="bolt://localhost:7687"
   export NEO4J_USER="neo4j"
   export NEO4J_PASSWORD="your_password"
   ```

3. **Dependencies Installed**
   ```bash
   npm install
   ```

4. **Project Built**
   ```bash
   npm run build
   ```

## Running Tests

### All Tests
```bash
npm test
```

### Smoke Tests Only
```bash
npm run test:smoke
```

### With Coverage
```bash
npm run test:coverage
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Specific Test File
```bash
npx jest tests/smoke/basic.smoke.test.ts
```

## Test Types

### Smoke Tests
- **Purpose**: Verify basic functionality works
- **Scope**: High-level checks, not comprehensive
- **Speed**: Fast execution
- **When to run**: Before deployment, after major changes

## Test Environment

Tests run in a controlled environment:
- `NODE_ENV=test`
- `LOG_LEVEL=silent` (reduced logging)
- Same Neo4j database as development (tests clean up after themselves)

## Writing New Tests

### Adding Smoke Tests
1. Create new file in `tests/smoke/` ending with `.smoke.test.ts`
2. Follow the pattern of existing smoke tests
3. Always clean up database resources in `afterAll()`
4. Keep tests simple and focused on "does it work?" rather than edge cases

### Test Patterns
```typescript
import { closeNeo4jConnection } from '../../src/services/neo4j/index.js';

describe('My Feature smoke test', () => {
  afterAll(async () => {
    await closeNeo4jConnection();
  });

  test('should do basic thing without crashing', async () => {
    // Test basic functionality
    expect(result).toBeDefined();
  });
});
```

## Troubleshooting

### "Neo4j connection failed"
- Ensure Neo4j is running: `npm run docker:up`
- Check connection details in environment variables
- Verify Neo4j is accessible at the configured URI

### "Module not found" errors
- Run `npm install` to install dependencies
- Run `npm run build` to compile TypeScript

### Tests hang or timeout
- Check if database connections are being closed properly
- Increase timeout in jest.config.js if needed
- Look for async operations without proper awaiting

### "Cannot find name 'expect'" or Jest globals
- Ensure jest types are installed: `@types/jest`
- Check jest.config.js is properly configured

## CI/CD Integration

For automated testing in CI/CD pipelines:

```bash
# Start Neo4j
docker run -d --name neo4j-test \
  -p 7687:7687 -p 7474:7474 \
  -e NEO4J_AUTH=neo4j/testpassword \
  neo4j:latest

# Wait for Neo4j to be ready
sleep 30

# Run tests
NEO4J_PASSWORD=testpassword npm test

# Cleanup
docker stop neo4j-test && docker rm neo4j-test
```