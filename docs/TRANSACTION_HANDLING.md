# Neo4j Transaction Handling Guide

This document describes the transaction rollback handling implementation in the deepresearch-mcp-server.

## Overview

The transaction wrapper provides automatic retry logic with exponential backoff for Neo4j operations. It handles transient failures, deadlocks, and ensures proper rollback on errors to prevent partial writes.

## Features

### 1. Automatic Retry Logic
- Retries operations on specific Neo4j transient errors
- Configurable maximum retry attempts (default: 3)
- Exponential backoff with jitter to prevent thundering herd

### 2. Deadlock Detection
- Automatically detects and retries on deadlock errors
- Logs detailed information about deadlock occurrences
- Prevents infinite retry loops with maximum retry limit

### 3. Transaction Rollback
- Automatic rollback on any error during transaction
- Prevents partial writes by ensuring atomicity
- Session cleanup guaranteed in all scenarios

### 4. Timeout Handling
- Configurable transaction timeout (default: 30 seconds)
- Prevents hanging transactions
- Graceful error handling for timeout scenarios

## Configuration

Configure transaction behavior via environment variables:

```bash
# Maximum number of retry attempts for failed transactions
TRANSACTION_MAX_RETRIES=3

# Initial delay between retries in milliseconds
TRANSACTION_INITIAL_RETRY_DELAY_MS=100

# Maximum delay between retries in milliseconds
TRANSACTION_MAX_RETRY_DELAY_MS=5000

# Exponential backoff multiplier for retry delays
TRANSACTION_BACKOFF_MULTIPLIER=2

# Transaction timeout in milliseconds
TRANSACTION_TIMEOUT_MS=30000
```

## Usage Examples

### Basic Write Transaction with Retry

```typescript
import { neo4jDriver, executeWriteWithRetry } from '../services/neo4j'

const session = await neo4jDriver.getSession()
try {
  const result = await executeWriteWithRetry(session, async (tx) => {
    const queryResult = await tx.run(
      'CREATE (n:Node {id: $id, name: $name}) RETURN n',
      { id: '123', name: 'Test Node' }
    )
    return queryResult.records[0]
  })
  
  console.log('Transaction completed:', result.data)
  console.log('Retry attempts:', result.retries)
} finally {
  await session.close()
}
```

### Read Transaction with Custom Retry Config

```typescript
import { neo4jDriver, executeReadWithRetry } from '../services/neo4j'

const session = await neo4jDriver.getSession()
try {
  const result = await executeReadWithRetry(
    session,
    async (tx) => {
      const queryResult = await tx.run('MATCH (n:Node) RETURN n LIMIT 10')
      return queryResult.records
    },
    {
      maxRetries: 5,
      timeout: 60000, // 60 seconds
    }
  )
  
  console.log('Results:', result.data)
} finally {
  await session.close()
}
```

### Batch Operations with Automatic Rollback

```typescript
import { neo4jDriver, executeBatchWithRetry } from '../services/neo4j'

const session = await neo4jDriver.getSession()
try {
  const operations = [
    // Operation 1: Create project
    async (tx) => {
      const result = await tx.run(
        'CREATE (p:Project {id: $id, name: $name}) RETURN p',
        { id: 'proj_1', name: 'New Project' }
      )
      return result.records[0]
    },
    
    // Operation 2: Create tasks
    async (tx) => {
      const result = await tx.run(
        'MATCH (p:Project {id: $projectId}) ' +
        'CREATE (t1:Task {id: $id1, title: $title1})-[:BELONGS_TO]->(p) ' +
        'CREATE (t2:Task {id: $id2, title: $title2})-[:BELONGS_TO]->(p) ' +
        'RETURN t1, t2',
        {
          projectId: 'proj_1',
          id1: 'task_1',
          title1: 'Task 1',
          id2: 'task_2',
          title2: 'Task 2',
        }
      )
      return result.records
    },
  ]
  
  const result = await executeBatchWithRetry(session, operations)
  console.log('Batch completed successfully:', result.data)
} catch (error) {
  console.error('Batch failed, all operations rolled back:', error)
} finally {
  await session.close()
}
```

### Using the Driver's Custom Retry Method

```typescript
import { neo4jDriver } from '../services/neo4j'

const result = await neo4jDriver.executeWithCustomRetry(
  async (tx) => {
    // Your transaction logic here
    const queryResult = await tx.run('MATCH (n) RETURN count(n) as count')
    return queryResult.records[0].get('count')
  },
  'read', // Transaction type: 'read' or 'write'
  undefined, // Database name (optional)
  {
    maxRetries: 10,
    timeout: 120000, // 2 minutes
  }
)
```

## Retryable Error Codes

The following Neo4j error codes trigger automatic retry:

- `Neo.TransientError.Transaction.Terminated`
- `Neo.TransientError.Transaction.LockClientStopped`
- `Neo.TransientError.Transaction.DeadlockDetected`
- `Neo.TransientError.General.DatabaseUnavailable`
- `Neo.TransientError.Network.CommunicationError`

Additionally, errors matching these patterns are retried:
- Deadlock errors
- Lock client stopped errors
- Database unavailable errors
- Network errors
- Connection lost errors
- Timeout errors

## Best Practices

### 1. Always Close Sessions
```typescript
const session = await neo4jDriver.getSession()
try {
  // Your transaction logic
} finally {
  await session.close() // Always close the session
}
```

### 2. Use Appropriate Transaction Types
```typescript
// For read operations
await executeReadWithRetry(session, async (tx) => {
  // Read-only queries
})

// For write operations
await executeWriteWithRetry(session, async (tx) => {
  // Write queries
})
```

### 3. Handle Errors Gracefully
```typescript
try {
  const result = await executeWriteWithRetry(session, transactionFn)
  // Handle success
} catch (error) {
  if (error.message.includes('timeout')) {
    // Handle timeout specifically
  } else if (error.message.includes('deadlock')) {
    // Handle deadlock after max retries
  } else {
    // Handle other errors
  }
}
```

### 4. Use Batch Operations for Related Changes
```typescript
// Good: All related operations in one transaction
await executeBatchWithRetry(session, [
  createProjectOp,
  createTasksOp,
  createRelationshipsOp,
])

// Bad: Separate transactions that could leave data inconsistent
await executeWriteWithRetry(session, createProjectOp)
await executeWriteWithRetry(session, createTasksOp) // Could fail, leaving project without tasks
```

## Monitoring and Logging

The transaction wrapper provides detailed logging:

- Transaction start and completion
- Retry attempts with delay information
- Error details with error codes
- Performance metrics (duration, retry count)

Events are published via the database event system:
- `WRITE_OPERATION` - Successful write operations
- `READ_OPERATION` - Successful read operations
- `ERROR` - Failed operations with details

## Performance Considerations

1. **Connection Pool Management**: The driver monitors active sessions and warns when approaching pool limits

2. **Retry Delays**: Exponential backoff prevents overwhelming the database during high contention

3. **Timeouts**: Set appropriate timeouts based on query complexity:
   - Simple queries: 5-10 seconds
   - Complex queries: 30-60 seconds
   - Batch operations: 60-120 seconds

4. **Batch Size**: Keep batch operations reasonable (< 100 operations) to avoid long-running transactions

## Migration Guide

To update existing code to use the transaction wrapper:

1. Replace `session.executeWrite()` with `executeWriteWithRetry()`
2. Replace `session.executeRead()` with `executeReadWithRetry()`
3. Update result handling to use `result.data` instead of direct result
4. Add proper error handling for retry exhaustion

Example migration:

```typescript
// Before
const result = await session.executeWrite(async (tx) => {
  const queryResult = await tx.run(query, params)
  return queryResult.records[0]
})

// After
const result = await executeWriteWithRetry(session, async (tx) => {
  const queryResult = await tx.run(query, params)
  return queryResult.records[0]
})
const record = result.data // Access the actual result
```

## Troubleshooting

### High Retry Rates
- Check for lock contention in your queries
- Consider adding indexes to improve query performance
- Review transaction scope - keep transactions small

### Timeout Errors
- Increase timeout for complex queries
- Optimize queries using EXPLAIN
- Consider breaking large operations into smaller batches

### Deadlocks
- Review query patterns for circular dependencies
- Use consistent ordering when updating multiple nodes
- Consider using explicit locking strategies

## Testing

The transaction wrapper includes comprehensive tests. Run tests with:

```bash
npm test src/services/neo4j/__tests__/transactionWrapper.test.ts
```

Test coverage includes:
- Success scenarios
- Retry behavior
- Timeout handling
- Batch operations
- Error scenarios