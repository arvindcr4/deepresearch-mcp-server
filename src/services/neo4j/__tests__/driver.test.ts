/**
 * Unit Tests for Neo4j Driver
 * Tests the Neo4j driver connection management and query execution
 */

// Mock Neo4j driver and dependencies
const mockTransaction = {
  run: jest.fn(),
}

const mockSession = {
  close: jest.fn(),
}

const mockDriver = {
  session: jest.fn(() => mockSession),
  verifyConnectivity: jest.fn(),
  close: jest.fn(),
}

const mockConfig = {
  neo4jUri: 'bolt://localhost:7687',
  neo4jUser: 'neo4j',
  neo4jPassword: 'password',
  transaction: {
    timeout: 30000,
    maxRetries: 3,
    initialRetryDelayMs: 1000,
    maxRetryDelayMs: 8000,
    backoffMultiplier: 2,
  },
}

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}

const mockDatabaseEvents = {
  publish: jest.fn(),
}

const mockExecuteWriteWithRetry = jest.fn()
const mockExecuteReadWithRetry = jest.fn()
const mockExecuteWithRetry = jest.fn()

// Mock neo4j module
jest.mock('neo4j-driver', () => ({
  __esModule: true,
  default: {
    driver: jest.fn(() => mockDriver),
    auth: {
      basic: jest.fn(() => ({})),
    },
    session: {
      WRITE: 'WRITE',
    },
  },
}))

// Mock config
jest.mock('../../../config/index.js', () => ({
  config: mockConfig,
}))

// Mock logger
jest.mock('../../../utils/logger.js', () => ({
  logger: mockLogger,
}))

// Mock events
jest.mock('../events.js', () => ({
  databaseEvents: mockDatabaseEvents,
  DatabaseEventType: {
    WRITE_OPERATION: 'WRITE_OPERATION',
  },
}))

// Mock transaction wrapper
jest.mock('../transactionWrapper.js', () => ({
  executeWriteWithRetry: mockExecuteWriteWithRetry,
  executeReadWithRetry: mockExecuteReadWithRetry,
  executeWithRetry: mockExecuteWithRetry,
}))

describe('Neo4j Driver', () => {
  let DriverClass: any
  let driverInstance: any

  beforeEach(async () => {
    jest.clearAllMocks()
    
    // Reset mock implementations
    mockExecuteWriteWithRetry.mockImplementation(async (session, fn) => ({
      data: await fn(mockTransaction),
      retries: 0,
    }))
    
    mockExecuteReadWithRetry.mockImplementation(async (session, fn) => ({
      data: await fn(mockTransaction),
      retries: 0,
    }))
    
    mockExecuteWithRetry.mockImplementation(async (session, fn) => ({
      data: await fn(mockTransaction),
      retries: 0,
    }))

    // Reset config
    mockConfig.neo4jUri = 'bolt://localhost:7687'
    mockConfig.neo4jUser = 'neo4j'
    mockConfig.neo4jPassword = 'password'

    // Reset mocks
    mockDriver.verifyConnectivity.mockResolvedValue(undefined)
    mockDriver.close.mockResolvedValue(undefined)
    mockSession.close.mockResolvedValue(undefined)

    // Dynamic import to get fresh instance
    const module = await import('../driver.js')
    
    // Reset the singleton state
    const neo4jDriver = module.neo4jDriver as any
    neo4jDriver['driver'] = null
    neo4jDriver['connectionPromise'] = null
    neo4jDriver['activeSessionCount'] = 0
    neo4jDriver['totalSessionsCreated'] = 0
    neo4jDriver['transactionCounter'] = 0
    
    driverInstance = neo4jDriver
  })

  describe('Driver Initialization', () => {
    it('should initialize driver with correct configuration', async () => {
      const neo4j = await import('neo4j-driver')
      
      await driverInstance.getDriver()

      expect(neo4j.default.driver).toHaveBeenCalledWith(
        'bolt://localhost:7687',
        {},
        expect.objectContaining({
          maxConnectionLifetime: 3 * 60 * 60 * 1000,
          maxConnectionPoolSize: 50,
          connectionAcquisitionTimeout: 2 * 60 * 1000,
          disableLosslessIntegers: true,
        })
      )
      expect(mockDriver.verifyConnectivity).toHaveBeenCalled()
      expect(mockLogger.info).toHaveBeenCalledWith('Initializing Neo4j driver connection')
    })

    it('should throw error when configuration is missing', async () => {
      mockConfig.neo4jUri = ''

      await expect(driverInstance.getDriver()).rejects.toThrow(
        'Neo4j connection details are not properly configured'
      )
    })

    it('should handle connection failure', async () => {
      const error = new Error('Connection failed')
      mockDriver.verifyConnectivity.mockRejectedValue(error)

      await expect(driverInstance.getDriver()).rejects.toThrow(
        'Failed to initialize Neo4j connection: Connection failed'
      )
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to initialize Neo4j driver',
        { error: 'Connection failed' }
      )
    })
  })

  describe('Session Management', () => {
    beforeEach(async () => {
      await driverInstance.getDriver()
    })

    it('should create session with default configuration', async () => {
      const session = await driverInstance.getSession()

      expect(mockDriver.session).toHaveBeenCalledWith({
        database: undefined,
        defaultAccessMode: 'WRITE',
      })
      expect(session).toBe(mockSession)
    })

    it('should create session with specified database', async () => {
      await driverInstance.getSession('test-db')

      expect(mockDriver.session).toHaveBeenCalledWith({
        database: 'test-db',
        defaultAccessMode: 'WRITE',
      })
    })

    it('should track active session count', async () => {
      await driverInstance.getSession()
      await driverInstance.getSession()

      const stats = driverInstance.getPoolStats()
      expect(stats.activeSessions).toBe(2)
      expect(stats.totalSessionsCreated).toBe(2)
    })

    it('should log warning when approaching pool limits', async () => {
      // Manually set session count to trigger warning
      driverInstance['activeSessionCount'] = 40

      await driverInstance.getSession()

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Neo4j connection pool nearing capacity',
        expect.objectContaining({
          activeSessions: 41,
          maxPoolSize: 50,
        })
      )
    })
  })

  describe('Query Execution', () => {
    beforeEach(async () => {
      await driverInstance.getDriver()
    })

    describe('executeQuery (Write)', () => {
      it('should execute write query successfully', async () => {
        const mockRecords = [{ id: 1, name: 'test' }]
        mockTransaction.run.mockResolvedValue({ records: mockRecords })

        const result = await driverInstance.executeQuery(
          'CREATE (n:Test) RETURN n',
          { name: 'test' }
        )

        expect(mockExecuteWriteWithRetry).toHaveBeenCalledWith(
          mockSession,
          expect.any(Function),
          expect.objectContaining({
            timeout: 30000,
            maxRetries: 3,
          })
        )
        expect(result).toEqual(mockRecords)
        expect(mockSession.close).toHaveBeenCalled()
      })

      it('should publish write operation event', async () => {
        mockTransaction.run.mockResolvedValue({ records: [] })

        await driverInstance.executeQuery('CREATE (n:Test)', { name: 'test' })

        expect(mockDatabaseEvents.publish).toHaveBeenCalledWith(
          'WRITE_OPERATION',
          expect.objectContaining({
            timestamp: expect.any(String),
            transactionId: expect.any(Number),
            operation: {
              query: 'CREATE (n:Test)',
              params: { name: 'test' },
            },
          })
        )
      })

      it('should handle query execution error', async () => {
        const error = new Error('Query failed')
        mockExecuteWriteWithRetry.mockRejectedValue(error)

        await expect(
          driverInstance.executeQuery('CREATE (n:Test)')
        ).rejects.toThrow('Query failed')

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Error executing Neo4j query',
          {
            error: 'Query failed',
            query: 'CREATE (n:Test)',
          }
        )
        expect(mockSession.close).toHaveBeenCalled()
      })
    })

    describe('executeReadQuery', () => {
      it('should execute read query successfully', async () => {
        const mockRecords = [{ id: 1, name: 'test' }]
        mockTransaction.run.mockResolvedValue({ records: mockRecords })

        const result = await driverInstance.executeReadQuery(
          'MATCH (n:Test) RETURN n',
          { limit: 10 }
        )

        expect(mockExecuteReadWithRetry).toHaveBeenCalledWith(
          mockSession,
          expect.any(Function),
          expect.objectContaining({
            timeout: 30000,
            maxRetries: 3,
          })
        )
        expect(result).toEqual(mockRecords)
        expect(mockSession.close).toHaveBeenCalled()
      })

      it('should handle read query error', async () => {
        const error = new Error('Read query failed')
        mockExecuteReadWithRetry.mockRejectedValue(error)

        await expect(
          driverInstance.executeReadQuery('MATCH (n:Test) RETURN n')
        ).rejects.toThrow('Read query failed')

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Error executing Neo4j read query',
          {
            error: 'Read query failed',
            query: 'MATCH (n:Test) RETURN n',
          }
        )
        expect(mockSession.close).toHaveBeenCalled()
      })
    })

    describe('executeWithCustomRetry', () => {
      it('should execute transaction with custom retry config', async () => {
        const transactionFn = jest.fn().mockResolvedValue('test result')
        const customRetryConfig = {
          maxRetries: 5,
          initialRetryDelayMs: 500,
        }

        const result = await driverInstance.executeWithCustomRetry(
          transactionFn,
          'write',
          'test-db',
          customRetryConfig
        )

        expect(mockExecuteWithRetry).toHaveBeenCalledWith(
          mockSession,
          transactionFn,
          expect.objectContaining({
            maxRetries: 5,
            initialRetryDelayMs: 500,
            timeout: 30000,
          }),
          'write'
        )
        expect(result).toBe('test result')
        expect(mockSession.close).toHaveBeenCalled()
      })
    })
  })

  describe('Pool Statistics', () => {
    it('should return correct pool statistics', () => {
      driverInstance['activeSessionCount'] = 5
      driverInstance['totalSessionsCreated'] = 15

      const stats = driverInstance.getPoolStats()

      expect(stats).toEqual({
        activeSessions: 5,
        totalSessionsCreated: 15,
        maxPoolSize: 50,
      })
    })
  })

  describe('Driver Cleanup', () => {
    beforeEach(async () => {
      await driverInstance.getDriver()
    })

    it('should close driver and cleanup resources', async () => {
      driverInstance['activeSessionCount'] = 3
      driverInstance['totalSessionsCreated'] = 10

      await driverInstance.close()

      expect(mockDriver.close).toHaveBeenCalled()
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Neo4j driver connection closed',
        {
          finalStats: {
            activeSessions: 3,
            totalSessionsCreated: 10,
          },
        }
      )
    })

    it('should handle driver close error', async () => {
      const closeError = new Error('Close failed')
      mockDriver.close.mockRejectedValue(closeError)

      await expect(driverInstance.close()).rejects.toThrow('Close failed')

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error closing Neo4j driver connection',
        { error: 'Close failed' }
      )
    })
  })

  describe('Error Handling', () => {
    beforeEach(async () => {
      await driverInstance.getDriver()
    })

    it('should handle string errors', async () => {
      mockExecuteWriteWithRetry.mockRejectedValue('String error')

      await expect(
        driverInstance.executeQuery('CREATE (n:Test)')
      ).rejects.toThrow('String error')

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error executing Neo4j query',
        {
          error: 'String error',
          query: 'CREATE (n:Test)',
        }
      )
    })

    it('should handle non-Error objects', async () => {
      const errorObject = { message: 'Custom error object' }
      mockExecuteWriteWithRetry.mockRejectedValue(errorObject)

      await expect(
        driverInstance.executeQuery('CREATE (n:Test)')
      ).rejects.toThrow(errorObject)

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error executing Neo4j query',
        {
          error: '[object Object]',
          query: 'CREATE (n:Test)',
        }
      )
    })
  })
})