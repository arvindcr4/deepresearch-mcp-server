import { Session, ManagedTransaction } from 'neo4j-driver'
import { logger } from '../../utils/logger.js'
import { databaseEvents, DatabaseEventType } from './events.js'

/**
 * Configuration for transaction retry behavior
 */
export interface TransactionRetryConfig {
  maxRetries?: number
  initialRetryDelayMs?: number
  maxRetryDelayMs?: number
  backoffMultiplier?: number
  timeout?: number
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: Required<TransactionRetryConfig> = {
  maxRetries: 3,
  initialRetryDelayMs: 100,
  maxRetryDelayMs: 5000,
  backoffMultiplier: 2,
  timeout: 30000, // 30 seconds default timeout
}

/**
 * Error codes that should trigger a retry
 */
const RETRYABLE_ERROR_CODES = [
  'Neo.TransientError.Transaction.Terminated',
  'Neo.TransientError.Transaction.LockClientStopped',
  'Neo.TransientError.Transaction.DeadlockDetected',
  'Neo.TransientError.General.DatabaseUnavailable',
  'Neo.TransientError.Network.CommunicationError',
]

/**
 * Check if an error is retryable based on Neo4j error codes
 */
function isRetryableError(error: any): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  // Check Neo4j error code
  const errorCode = error.code || error.errorCode
  if (errorCode && RETRYABLE_ERROR_CODES.includes(errorCode)) {
    return true
  }

  // Check error message for common transient patterns
  const message = error.message || ''
  const retryablePatterns = [
    /deadlock/i,
    /lock.*client.*stopped/i,
    /database.*unavailable/i,
    /network.*error/i,
    /connection.*lost/i,
    /timeout/i,
  ]

  return retryablePatterns.some((pattern) => pattern.test(message))
}

/**
 * Calculate retry delay with exponential backoff
 */
function calculateRetryDelay(
  attempt: number,
  config: Required<TransactionRetryConfig>
): number {
  const delay = Math.min(
    config.initialRetryDelayMs *
      Math.pow(config.backoffMultiplier, attempt - 1),
    config.maxRetryDelayMs
  )
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * delay
  return Math.floor(delay + jitter)
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Transaction execution result
 */
export interface TransactionResult<T> {
  data: T
  retries: number
  duration: number
}

/**
 * Execute a transaction with automatic retry and rollback handling
 */
export async function executeWithRetry<T>(
  session: Session,
  transactionFn: (tx: ManagedTransaction) => Promise<T>,
  config: TransactionRetryConfig = {},
  transactionType: 'read' | 'write' = 'write'
): Promise<TransactionResult<T>> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  const startTime = Date.now()
  let lastError: Error | null = null
  let attempt = 0

  while (attempt <= retryConfig.maxRetries) {
    attempt++
    const attemptStartTime = Date.now()

    try {
      logger.debug('Starting transaction attempt', {
        attempt,
        maxRetries: retryConfig.maxRetries,
        transactionType,
      })

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(`Transaction timeout after ${retryConfig.timeout}ms`)
            ),
          retryConfig.timeout
        )
      })

      // Execute transaction with timeout
      let resultPromise: Promise<T>
      if (transactionType === 'read') {
        resultPromise = session.executeRead(transactionFn)
      } else {
        resultPromise = session.executeWrite(transactionFn)
      }

      const data = await Promise.race([resultPromise, timeoutPromise])

      const duration = Date.now() - startTime

      // Log successful transaction
      logger.debug('Transaction completed successfully', {
        attempt,
        duration,
        transactionType,
      })

      // Publish success event
      databaseEvents.publish(
        transactionType === 'read'
          ? DatabaseEventType.READ_OPERATION
          : DatabaseEventType.WRITE_OPERATION,
        {
          timestamp: new Date().toISOString(),
          success: true,
          attempts: attempt,
          duration,
        }
      )

      return {
        data,
        retries: attempt - 1,
        duration,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      const attemptDuration = Date.now() - attemptStartTime

      logger.warn('Transaction attempt failed', {
        attempt,
        error: lastError.message,
        errorCode: (error as any)?.code,
        duration: attemptDuration,
        isRetryable: isRetryableError(error),
      })

      // Check if we should retry
      if (attempt <= retryConfig.maxRetries && isRetryableError(error)) {
        const retryDelay = calculateRetryDelay(attempt, retryConfig)

        logger.info('Retrying transaction after delay', {
          attempt,
          nextAttempt: attempt + 1,
          retryDelayMs: retryDelay,
          errorCode: (error as any)?.code,
        })

        await sleep(retryDelay)
        continue
      }

      // No more retries - transaction has failed
      break
    }
  }

  // All attempts exhausted
  const totalDuration = Date.now() - startTime

  logger.error('Transaction failed after all retry attempts', {
    attempts: attempt,
    totalDuration,
    lastError: lastError?.message,
    transactionType,
  })

  // Publish error event
  databaseEvents.publish(DatabaseEventType.ERROR, {
    timestamp: new Date().toISOString(),
    operation: `transaction_${transactionType}`,
    error: lastError?.message || 'Unknown error',
    attempts: attempt,
    duration: totalDuration,
  })

  // Throw the last error
  throw lastError || new Error('Transaction failed')
}

/**
 * Execute a write transaction with automatic retry and rollback
 */
export async function executeWriteWithRetry<T>(
  session: Session,
  transactionFn: (tx: ManagedTransaction) => Promise<T>,
  config?: TransactionRetryConfig
): Promise<TransactionResult<T>> {
  return executeWithRetry(session, transactionFn, config, 'write')
}

/**
 * Execute a read transaction with automatic retry
 */
export async function executeReadWithRetry<T>(
  session: Session,
  transactionFn: (tx: ManagedTransaction) => Promise<T>,
  config?: TransactionRetryConfig
): Promise<TransactionResult<T>> {
  return executeWithRetry(session, transactionFn, config, 'read')
}

/**
 * Execute multiple operations in a single transaction with rollback on any failure
 */
export async function executeBatchWithRetry<T>(
  session: Session,
  operations: Array<(tx: ManagedTransaction) => Promise<any>>,
  config?: TransactionRetryConfig
): Promise<TransactionResult<T[]>> {
  const batchFn = async (tx: ManagedTransaction): Promise<T[]> => {
    const results: T[] = []

    logger.debug('Executing batch transaction', {
      operationCount: operations.length,
    })

    for (let i = 0; i < operations.length; i++) {
      try {
        const result = await operations[i](tx)
        results.push(result)

        logger.debug('Batch operation completed', {
          operationIndex: i,
          totalOperations: operations.length,
        })
      } catch (error) {
        logger.error('Batch operation failed', {
          operationIndex: i,
          totalOperations: operations.length,
          error: error instanceof Error ? error.message : String(error),
        })

        // Re-throw to trigger transaction rollback
        throw error
      }
    }

    return results
  }

  return executeWriteWithRetry(session, batchFn, config)
}
