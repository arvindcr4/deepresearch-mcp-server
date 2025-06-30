import { Session, ManagedTransaction } from 'neo4j-driver'
import {
  executeWithRetry,
  executeWriteWithRetry,
  executeReadWithRetry,
  executeBatchWithRetry,
} from '../transactionWrapper'
import { logger } from '../../../utils/logger'
import { databaseEvents, DatabaseEventType } from '../events'

// Mock dependencies
jest.mock('../../../utils/logger')
jest.mock('../events')

describe('TransactionWrapper', () => {
  let mockSession: jest.Mocked<Session>
  let mockTransaction: jest.Mocked<ManagedTransaction>

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock transaction
    mockTransaction = {
      run: jest.fn(),
    } as any

    // Mock session
    mockSession = {
      executeWrite: jest.fn(),
      executeRead: jest.fn(),
      close: jest.fn(),
    } as any
  })

  describe('executeWithRetry', () => {
    it('should execute transaction successfully on first attempt', async () => {
      const expectedResult = { data: 'test' }
      const transactionFn = jest.fn().mockResolvedValue(expectedResult)

      mockSession.executeWrite.mockImplementation(async (fn) =>
        fn(mockTransaction)
      )

      const result = await executeWithRetry(
        mockSession,
        transactionFn,
        {},
        'write'
      )

      expect(result.data).toEqual(expectedResult)
      expect(result.retries).toBe(0)
      expect(transactionFn).toHaveBeenCalledTimes(1)
      expect(mockSession.executeWrite).toHaveBeenCalledTimes(1)
    })

    it('should retry on transient error and succeed', async () => {
      const expectedResult = { data: 'test' }
      const transientError = new Error(
        'Neo.TransientError.Transaction.DeadlockDetected'
      )
      ;(transientError as any).code =
        'Neo.TransientError.Transaction.DeadlockDetected'

      const transactionFn = jest
        .fn()
        .mockRejectedValueOnce(transientError)
        .mockResolvedValueOnce(expectedResult)

      mockSession.executeWrite.mockImplementation(async (fn) =>
        fn(mockTransaction)
      )

      const result = await executeWithRetry(
        mockSession,
        transactionFn,
        {
          maxRetries: 3,
          initialRetryDelayMs: 10,
        },
        'write'
      )

      expect(result.data).toEqual(expectedResult)
      expect(result.retries).toBe(1)
      expect(transactionFn).toHaveBeenCalledTimes(2)
    })

    it('should fail after max retries', async () => {
      const error = new Error('Neo.TransientError.Transaction.DeadlockDetected')
      ;(error as any).code = 'Neo.TransientError.Transaction.DeadlockDetected'

      const transactionFn = jest.fn().mockRejectedValue(error)

      mockSession.executeWrite.mockImplementation(async (fn) =>
        fn(mockTransaction)
      )

      await expect(
        executeWithRetry(
          mockSession,
          transactionFn,
          {
            maxRetries: 2,
            initialRetryDelayMs: 10,
          },
          'write'
        )
      ).rejects.toThrow(error)

      expect(transactionFn).toHaveBeenCalledTimes(3) // initial + 2 retries
    })

    it('should not retry on non-retryable error', async () => {
      const error = new Error('Some other error')
      const transactionFn = jest.fn().mockRejectedValue(error)

      mockSession.executeWrite.mockImplementation(async (fn) =>
        fn(mockTransaction)
      )

      await expect(
        executeWithRetry(mockSession, transactionFn, {}, 'write')
      ).rejects.toThrow(error)

      expect(transactionFn).toHaveBeenCalledTimes(1)
    })

    it('should handle timeout correctly', async () => {
      const transactionFn = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 1000))
        )

      mockSession.executeWrite.mockImplementation(async (fn) =>
        fn(mockTransaction)
      )

      await expect(
        executeWithRetry(
          mockSession,
          transactionFn,
          {
            timeout: 50,
          },
          'write'
        )
      ).rejects.toThrow('Transaction timeout after 50ms')

      expect(transactionFn).toHaveBeenCalled()
    })
  })

  describe('executeWriteWithRetry', () => {
    it('should execute write transaction with retry', async () => {
      const expectedResult = { data: 'test' }
      const transactionFn = jest.fn().mockResolvedValue(expectedResult)

      mockSession.executeWrite.mockImplementation(async (fn) =>
        fn(mockTransaction)
      )

      const result = await executeWriteWithRetry(mockSession, transactionFn)

      expect(result.data).toEqual(expectedResult)
      expect(mockSession.executeWrite).toHaveBeenCalled()
    })
  })

  describe('executeReadWithRetry', () => {
    it('should execute read transaction with retry', async () => {
      const expectedResult = { data: 'test' }
      const transactionFn = jest.fn().mockResolvedValue(expectedResult)

      mockSession.executeRead.mockImplementation(async (fn) =>
        fn(mockTransaction)
      )

      const result = await executeReadWithRetry(mockSession, transactionFn)

      expect(result.data).toEqual(expectedResult)
      expect(mockSession.executeRead).toHaveBeenCalled()
    })
  })

  describe('executeBatchWithRetry', () => {
    it('should execute multiple operations in a single transaction', async () => {
      const operation1 = jest.fn().mockResolvedValue('result1')
      const operation2 = jest.fn().mockResolvedValue('result2')
      const operation3 = jest.fn().mockResolvedValue('result3')

      mockSession.executeWrite.mockImplementation(async (fn) =>
        fn(mockTransaction)
      )

      const result = await executeBatchWithRetry(mockSession, [
        operation1,
        operation2,
        operation3,
      ])

      expect(result.data).toEqual(['result1', 'result2', 'result3'])
      expect(operation1).toHaveBeenCalledWith(mockTransaction)
      expect(operation2).toHaveBeenCalledWith(mockTransaction)
      expect(operation3).toHaveBeenCalledWith(mockTransaction)
    })

    it('should rollback all operations if one fails', async () => {
      const operation1 = jest.fn().mockResolvedValue('result1')
      const operation2 = jest
        .fn()
        .mockRejectedValue(new Error('Operation 2 failed'))
      const operation3 = jest.fn().mockResolvedValue('result3')

      mockSession.executeWrite.mockImplementation(async (fn) =>
        fn(mockTransaction)
      )

      await expect(
        executeBatchWithRetry(mockSession, [operation1, operation2, operation3])
      ).rejects.toThrow('Operation 2 failed')

      expect(operation1).toHaveBeenCalled()
      expect(operation2).toHaveBeenCalled()
      expect(operation3).not.toHaveBeenCalled() // Should not be called after failure
    })
  })

  describe('Retry delay calculation', () => {
    it('should use exponential backoff with jitter', async () => {
      const error = new Error('Neo.TransientError.Transaction.DeadlockDetected')
      ;(error as any).code = 'Neo.TransientError.Transaction.DeadlockDetected'

      const transactionFn = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ data: 'success' })

      mockSession.executeWrite.mockImplementation(async (fn) =>
        fn(mockTransaction)
      )

      const startTime = Date.now()

      await executeWithRetry(
        mockSession,
        transactionFn,
        {
          maxRetries: 3,
          initialRetryDelayMs: 100,
          backoffMultiplier: 2,
        },
        'write'
      )

      const totalTime = Date.now() - startTime

      // With exponential backoff:
      // First retry: ~100ms (+ jitter)
      // Second retry: ~200ms (+ jitter)
      // Total should be at least 300ms
      expect(totalTime).toBeGreaterThanOrEqual(250) // Allow for some variance
      expect(transactionFn).toHaveBeenCalledTimes(3)
    })
  })
})
