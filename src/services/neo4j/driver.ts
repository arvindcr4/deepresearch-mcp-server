import neo4j, { Driver, ManagedTransaction, Session } from 'neo4j-driver'
import { config } from '../../config/index.js'
import { logger } from '../../utils/logger.js'
import { databaseEvents, DatabaseEventType } from './events.js'
import {
  executeWithRetry,
  executeWriteWithRetry,
  executeReadWithRetry,
  TransactionRetryConfig,
} from './transactionWrapper.js'

/**
 * Neo4j connection management singleton
 * Responsible for creating and managing the Neo4j driver connection
 */
class Neo4jDriver {
  private static instance: Neo4jDriver
  private driver: Driver | null = null
  private connectionPromise: Promise<Driver> | null = null
  private transactionCounter: number = 0
  private activeSessionCount: number = 0
  private totalSessionsCreated: number = 0
  private poolMonitoringInterval: NodeJS.Timeout | null = null

  private constructor() {}

  /**
   * Get the Neo4jDriver singleton instance
   */
  public static getInstance(): Neo4jDriver {
    if (!Neo4jDriver.instance) {
      Neo4jDriver.instance = new Neo4jDriver()
    }
    return Neo4jDriver.instance
  }

  /**
   * Initialize the Neo4j driver connection
   * @returns Promise that resolves to the Neo4j driver
   */
  private async initDriver(): Promise<Driver> {
    if (this.driver) {
      return this.driver
    }

    try {
      const { neo4jUri, neo4jUser, neo4jPassword } = config

      if (!neo4jUri || !neo4jUser || !neo4jPassword) {
        throw new Error('Neo4j connection details are not properly configured')
      }

      logger.info('Initializing Neo4j driver connection')

      this.driver = neo4j.driver(
        neo4jUri,
        neo4j.auth.basic(neo4jUser, neo4jPassword),
        {
          maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
          maxConnectionPoolSize: 50,
          connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
          disableLosslessIntegers: true, // Recommended for JS compatibility
        }
      )

      // Verify connection
      await this.driver.verifyConnectivity()

      // Start connection pool monitoring
      this.startPoolMonitoring()

      logger.info('Neo4j driver connection established successfully')
      return this.driver
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      logger.error('Failed to initialize Neo4j driver', { error: errorMessage })
      throw new Error(`Failed to initialize Neo4j connection: ${errorMessage}`)
    }
  }

  /**
   * Get the Neo4j driver instance, initializing it if necessary
   * @returns Promise that resolves to the Neo4j driver
   */
  public async getDriver(): Promise<Driver> {
    if (!this.connectionPromise) {
      this.connectionPromise = this.initDriver()
    }
    return this.connectionPromise
  }

  /**
   * Create a new Neo4j session
   * @param database Optional database name
   * @returns Promise that resolves to a new Neo4j session
   */
  public async getSession(database?: string): Promise<Session> {
    const driver = await this.getDriver()

    // Check if we're approaching connection pool limits
    if (this.activeSessionCount >= 40) {
      // 80% of max pool size
      logger.warn('Neo4j connection pool nearing capacity', {
        activeSessions: this.activeSessionCount,
        maxPoolSize: 50,
        totalSessionsCreated: this.totalSessionsCreated,
      })
    }

    // Track session creation
    this.activeSessionCount++
    this.totalSessionsCreated++

    // Use the default database configured for the driver instance
    // Neo4j Community Edition typically uses 'neo4j' or potentially 'system'
    // Passing undefined lets the driver use its default.
    const session = driver.session({
      database: database || undefined,
      defaultAccessMode: neo4j.session.WRITE,
    })

    // Wrap the session to track when it's closed
    const originalClose = session.close.bind(session)
    session.close = async () => {
      try {
        this.activeSessionCount--
        return await originalClose()
      } catch (error) {
        logger.error('Error closing Neo4j session', {
          error: error instanceof Error ? error.message : String(error),
          activeSessionCount: this.activeSessionCount,
        })
        // Re-throw to maintain original behavior
        throw error
      }
    }

    return session
  }

  /**
   * Execute a query with a transaction
   * @param cypher Cypher query to execute
   * @param params Parameters for the query
   * @param database Optional database name
   * @param timeoutMs Optional timeout in milliseconds (default: 30000ms)
   * @returns Promise that resolves to the query result records
   */
  public async executeQuery<T = any>(
    cypher: string,
    params: Record<string, any> = {},
    database?: string,
    timeoutMs: number = 30000
  ): Promise<T[]> {
    const session = await this.getSession(database)

    try {
      // Use transaction wrapper with retry logic
      const retryConfig: TransactionRetryConfig = {
        timeout: timeoutMs,
        maxRetries: config.transaction.maxRetries,
        initialRetryDelayMs: config.transaction.initialRetryDelayMs,
        maxRetryDelayMs: config.transaction.maxRetryDelayMs,
        backoffMultiplier: config.transaction.backoffMultiplier,
      }

      const result = await executeWriteWithRetry(
        session,
        async (tx: ManagedTransaction) => {
          const queryResult = await tx.run(cypher, params)
          return queryResult.records
        },
        retryConfig
      )

      // Publish write operation event
      this.publishWriteOperation({ query: cypher, params })

      return result.data as unknown as T[]
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      logger.error('Error executing Neo4j query', {
        error: errorMessage,
        query: cypher,
        // Avoid logging potentially sensitive params directly in production
        // params: JSON.stringify(params)
      })

      // Error event is already published by transactionWrapper
      throw error // Re-throw the original error
    } finally {
      await session.close()
    }
  }

  /**
   * Execute a read-only query
   * @param cypher Cypher query to execute
   * @param params Parameters for the query
   * @param database Optional database name
   * @param timeoutMs Optional timeout in milliseconds (default: 30000ms)
   * @returns Promise that resolves to the query result records
   */
  public async executeReadQuery<T = any>(
    cypher: string,
    params: Record<string, any> = {},
    database?: string,
    timeoutMs: number = 30000
  ): Promise<T[]> {
    const session = await this.getSession(database)

    try {
      // Use transaction wrapper with retry logic
      const retryConfig: TransactionRetryConfig = {
        timeout: timeoutMs,
        maxRetries: config.transaction.maxRetries,
        initialRetryDelayMs: config.transaction.initialRetryDelayMs,
        maxRetryDelayMs: config.transaction.maxRetryDelayMs,
        backoffMultiplier: config.transaction.backoffMultiplier,
      }

      const result = await executeReadWithRetry(
        session,
        async (tx: ManagedTransaction) => {
          const queryResult = await tx.run(cypher, params)
          return queryResult.records
        },
        retryConfig
      )

      // Read operation event is already published by transactionWrapper
      return result.data as unknown as T[]
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      logger.error('Error executing Neo4j read query', {
        error: errorMessage,
        query: cypher,
        // params: JSON.stringify(params)
      })

      // Error event is already published by transactionWrapper
      throw error // Re-throw the original error
    } finally {
      await session.close()
    }
  }

  /**
   * Publish a database write operation event
   * @param operation Details about the operation
   * @private
   */
  private publishWriteOperation(operation: {
    query: string
    params?: Record<string, any>
  }): void {
    this.transactionCounter++
    databaseEvents.publish(DatabaseEventType.WRITE_OPERATION, {
      timestamp: new Date().toISOString(),
      transactionId: this.transactionCounter,
      operation,
    })
  }

  /**
   * Start monitoring the connection pool
   * @private
   */
  private startPoolMonitoring(): void {
    // Monitor every 30 seconds
    this.poolMonitoringInterval = setInterval(() => {
      if (this.activeSessionCount > 0) {
        logger.debug('Neo4j connection pool status', {
          activeSessions: this.activeSessionCount,
          totalSessionsCreated: this.totalSessionsCreated,
          maxPoolSize: 50,
        })
      }

      // Log warning if sessions are potentially leaked
      if (this.activeSessionCount > 30) {
        logger.warn('High number of active Neo4j sessions detected', {
          activeSessions: this.activeSessionCount,
          recommendation: 'Check for unclosed sessions',
        })
      }
    }, 30000)
  }

  /**
   * Execute a transaction with custom retry configuration
   * @param transactionFn Function to execute within transaction
   * @param transactionType Type of transaction (read/write)
   * @param database Optional database name
   * @param retryConfig Optional custom retry configuration
   * @returns Promise that resolves to the transaction result
   */
  public async executeWithCustomRetry<T>(
    transactionFn: (tx: ManagedTransaction) => Promise<T>,
    transactionType: 'read' | 'write' = 'write',
    database?: string,
    retryConfig?: TransactionRetryConfig
  ): Promise<T> {
    const session = await this.getSession(database)

    try {
      const finalRetryConfig: TransactionRetryConfig = {
        timeout: config.transaction.timeout,
        maxRetries: config.transaction.maxRetries,
        initialRetryDelayMs: config.transaction.initialRetryDelayMs,
        maxRetryDelayMs: config.transaction.maxRetryDelayMs,
        backoffMultiplier: config.transaction.backoffMultiplier,
        ...retryConfig, // Allow override with custom config
      }

      const result = await executeWithRetry(
        session,
        transactionFn,
        finalRetryConfig,
        transactionType
      )

      return result.data
    } finally {
      await session.close()
    }
  }

  /**
   * Get connection pool statistics
   * @returns Object containing pool statistics
   */
  public getPoolStats(): {
    activeSessions: number
    totalSessionsCreated: number
    maxPoolSize: number
  } {
    return {
      activeSessions: this.activeSessionCount,
      totalSessionsCreated: this.totalSessionsCreated,
      maxPoolSize: 50,
    }
  }

  /**
   * Close the Neo4j driver connection
   */
  public async close(): Promise<void> {
    // Stop pool monitoring
    if (this.poolMonitoringInterval) {
      clearInterval(this.poolMonitoringInterval)
      this.poolMonitoringInterval = null
    }

    if (this.driver) {
      try {
        await this.driver.close()
        this.driver = null
        this.connectionPromise = null
        logger.info('Neo4j driver connection closed', {
          finalStats: {
            activeSessions: this.activeSessionCount,
            totalSessionsCreated: this.totalSessionsCreated,
          },
        })
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        logger.error('Error closing Neo4j driver connection', {
          error: errorMessage,
        })
        throw error // Re-throw the error to propagate it
      }
    }
  }
}

// Export the singleton instance
export const neo4jDriver = Neo4jDriver.getInstance()
