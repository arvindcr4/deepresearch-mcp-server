/**
 * Tests for Request Logger Middleware
 */

import { Request, Response, NextFunction } from 'express'
import { requestLogger, errorLogger } from '../requestLogger.js'
import { secureLogger } from '../../utils/secureLogger.js'

// Mock secureLogger
jest.mock('../../utils/secureLogger.js', () => ({
  secureLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test1234'),
}))

describe('RequestLogger Middleware', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let mockNext: NextFunction
  let mockSecureLogger: any

  beforeEach(() => {
    jest.clearAllMocks()
    mockSecureLogger = secureLogger

    mockRequest = {
      method: 'GET',
      originalUrl: '/api/test',
      url: '/api/test',
      path: '/api/test',
      query: { param: 'value' },
      headers: {
        'content-type': 'application/json',
        'user-agent': 'Test Agent',
        authorization: 'Bearer secret-token',
        'x-api-key': 'secret-api-key',
      },
      body: {
        username: 'testuser',
        password: 'secret123',
        apiKey: 'secret-key',
        normalField: 'normal-value',
      },
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      get: jest.fn((header: string) => {
        if (header === 'User-Agent') return 'Test Agent'
        return undefined
      }),
    }

    mockResponse = {
      statusCode: 200,
      statusMessage: 'OK',
      json: jest.fn(),
      send: jest.fn(),
      on: jest.fn(),
      getHeaders: jest.fn(() => ({
        'content-type': 'application/json',
        'x-response-id': 'resp123',
      })),
      get: jest.fn((header: string) => {
        if (header === 'Content-Type') return 'application/json'
        if (header === 'Content-Length') return '100'
        return undefined
      }),
    }

    mockNext = jest.fn()
  })

  describe('requestLogger middleware', () => {
    it('should add request ID to request object and log incoming request', () => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext)

      // Check request ID was added
      expect((mockRequest as any).requestId).toBe('test1234')

      // Check request was logged
      expect(mockSecureLogger.info).toHaveBeenCalledWith('HTTP Request', {
        requestId: 'test1234',
        method: 'GET',
        url: '/api/test',
        path: '/api/test',
        query: { param: 'value' },
        headers: {
          'content-type': 'application/json',
          'user-agent': 'Test Agent',
          authorization: '[REDACTED]',
          'x-api-key': '[REDACTED]',
        },
        body: {
          username: 'testuser',
          password: '[REDACTED]',
          apiKey: '[REDACTED]',
          normalField: 'normal-value',
        },
        ip: '127.0.0.1',
        userAgent: 'Test Agent',
        timestamp: expect.any(String),
      })

      expect(mockNext).toHaveBeenCalledWith()
    })

    it('should handle request without body', () => {
      mockRequest.body = undefined

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockSecureLogger.info).toHaveBeenCalledWith('HTTP Request', 
        expect.objectContaining({
          body: undefined,
        })
      )
    })

    it('should use connection.remoteAddress when req.ip is not available', () => {
      mockRequest.ip = undefined

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockSecureLogger.info).toHaveBeenCalledWith('HTTP Request',
        expect.objectContaining({
          ip: '127.0.0.1',
        })
      )
    })

    it('should use url when originalUrl is not available', () => {
      mockRequest.originalUrl = undefined

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockSecureLogger.info).toHaveBeenCalledWith('HTTP Request',
        expect.objectContaining({
          url: '/api/test',
        })
      )
    })

    it('should intercept res.json and log response with duration', () => {
      const responseBody = { result: 'success', secret: 'hidden' }
      const originalJson = jest.fn()
      mockResponse.json = originalJson

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext)

      // Simulate calling res.json
      const interceptedJson = mockResponse.json as any
      interceptedJson(responseBody)

      // Check response was logged with scrubbed sensitive data
      expect(mockSecureLogger.info).toHaveBeenCalledWith('HTTP Response', {
        requestId: 'test1234',
        method: 'GET',
        url: '/api/test',
        statusCode: 200,
        statusMessage: 'OK',
        duration: expect.stringMatching(/^\d+ms$/),
        headers: {
          'content-type': 'application/json',
          'x-response-id': 'resp123',
        },
        body: {
          result: 'success',
          secret: '[REDACTED]',
        },
        timestamp: expect.any(String),
      })

      // Check original json method was called
      expect(originalJson).toHaveBeenCalledWith(responseBody)
    })

    it('should intercept res.send and log response for non-JSON responses', () => {
      const originalSend = jest.fn()
      const originalJson = jest.fn()
      mockResponse.send = originalSend
      mockResponse.json = originalJson

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext)

      // Simulate calling res.send
      const interceptedSend = mockResponse.send as any
      interceptedSend('Plain text response')

      // Check response was logged
      expect(mockSecureLogger.info).toHaveBeenCalledWith('HTTP Response', {
        requestId: 'test1234',
        method: 'GET',
        url: '/api/test',
        statusCode: 200,
        statusMessage: 'OK',
        duration: expect.stringMatching(/^\d+ms$/),
        headers: {
          'content-type': 'application/json',
          'x-response-id': 'resp123',
        },
        contentType: 'application/json',
        contentLength: '100',
        timestamp: expect.any(String),
      })

      // Check original send method was called
      expect(originalSend).toHaveBeenCalledWith('Plain text response')
    })

    it('should not log duplicate responses when json is called before send', () => {
      const responseBody = { result: 'success' }
      const originalJson = jest.fn()
      const originalSend = jest.fn()
      mockResponse.json = originalJson
      mockResponse.send = originalSend

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext)

      // Call res.json first
      const interceptedJson = mockResponse.json as any
      interceptedJson(responseBody)

      // Then call res.send
      const interceptedSend = mockResponse.send as any
      interceptedSend('Some data')

      // Should only have 2 log calls: 1 for request, 1 for json response
      expect(mockSecureLogger.info).toHaveBeenCalledTimes(2)
      expect(mockSecureLogger.info).toHaveBeenNthCalledWith(1, 'HTTP Request', expect.any(Object))
      expect(mockSecureLogger.info).toHaveBeenNthCalledWith(2, 'HTTP Response', expect.any(Object))
    })

    it('should handle response finish event as fallback', () => {
      const originalJson = jest.fn()
      const originalSend = jest.fn()
      mockResponse.json = originalJson
      mockResponse.send = originalSend
      
      let finishHandler: () => void = () => {}
      mockResponse.on = jest.fn((event, handler) => {
        if (event === 'finish') {
          finishHandler = handler as () => void
        }
      })

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext)

      // Trigger finish event without calling json or send
      finishHandler()

      // Should log fallback response
      expect(mockSecureLogger.info).toHaveBeenCalledWith('HTTP Response Finished', {
        requestId: 'test1234',
        method: 'GET',
        url: '/api/test',
        statusCode: 200,
        statusMessage: 'OK',
        duration: expect.stringMatching(/^\d+ms$/),
        timestamp: expect.any(String),
      })
    })
  })

  describe('errorLogger middleware', () => {
    it('should log errors with request context', () => {
      const testError = new Error('Test error')
      testError.stack = 'Error stack trace'
      
      // Set request ID
      ;(mockRequest as any).requestId = 'test1234'

      errorLogger(testError, mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockSecureLogger.error).toHaveBeenCalledWith('HTTP Request Error', {
        requestId: 'test1234',
        method: 'GET',
        url: '/api/test',
        error: {
          name: 'Error',
          message: 'Test error',
          stack: 'Error stack trace',
        },
        timestamp: expect.any(String),
      })

      expect(mockNext).toHaveBeenCalledWith(testError)
    })

    it('should handle missing request ID', () => {
      const testError = new Error('Test error')

      errorLogger(testError, mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockSecureLogger.error).toHaveBeenCalledWith('HTTP Request Error', 
        expect.objectContaining({
          requestId: 'unknown',
        })
      )
    })

    it('should use url when originalUrl is not available in error logging', () => {
      const testError = new Error('Test error')
      mockRequest.originalUrl = undefined
      ;(mockRequest as any).requestId = 'test1234'

      errorLogger(testError, mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockSecureLogger.error).toHaveBeenCalledWith('HTTP Request Error',
        expect.objectContaining({
          url: '/api/test',
        })
      )
    })
  })

  describe('Header scrubbing', () => {
    it('should scrub sensitive headers case-insensitively', () => {
      mockRequest.headers = {
        'Authorization': 'Bearer token123',
        'X-API-KEY': 'secret123',
        'X-Auth-Token': 'auth123',
        'X-Access-Token': 'access123',
        'X-CSRF-Token': 'csrf123',
        'Cookie': 'session=secret',
        'Content-Type': 'application/json',
        'User-Agent': 'Test Agent',
        'custom-auth-header': 'custom123',
        'normal-header': 'normal-value',
      }

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockSecureLogger.info).toHaveBeenCalledWith('HTTP Request',
        expect.objectContaining({
          headers: {
            'Authorization': '[REDACTED]',
            'X-API-KEY': '[REDACTED]',
            'X-Auth-Token': '[REDACTED]',
            'X-Access-Token': '[REDACTED]',
            'X-CSRF-Token': '[REDACTED]',
            'Cookie': '[REDACTED]',
            'Content-Type': 'application/json',
            'User-Agent': 'Test Agent',
            'custom-auth-header': '[REDACTED]',
            'normal-header': 'normal-value',
          },
        })
      )
    })
  })

  describe('Body scrubbing', () => {
    it('should scrub sensitive body fields in nested objects', () => {
      mockRequest.body = {
        user: {
          username: 'testuser',
          password: 'secret123',
          profile: {
            name: 'Test User',
            apiKey: 'nested-secret',
            preferences: {
              theme: 'dark',
              token: 'deep-token',
            },
          },
        },
        config: {
          endpoint: 'https://api.example.com',
          credentials: 'secret-creds',
        },
        normalField: 'normal-value',
      }

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockSecureLogger.info).toHaveBeenCalledWith('HTTP Request',
        expect.objectContaining({
          body: {
            user: {
              username: 'testuser',
              password: '[REDACTED]',
              profile: {
                name: 'Test User',
                apiKey: '[REDACTED]',
                preferences: {
                  theme: 'dark',
                  token: '[REDACTED]',
                },
              },
            },
            config: {
              endpoint: 'https://api.example.com',
              credentials: '[REDACTED]',
            },
            normalField: 'normal-value',
          },
        })
      )
    })

    it('should scrub sensitive fields in arrays', () => {
      mockRequest.body = {
        users: [
          { username: 'user1', password: 'secret1' },
          { username: 'user2', apiKey: 'secret2' },
        ],
        configs: [
          { name: 'config1', token: 'token1' },
          { name: 'config2', secret: 'secret2' },
        ],
      }

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockSecureLogger.info).toHaveBeenCalledWith('HTTP Request',
        expect.objectContaining({
          body: {
            users: [
              { username: 'user1', password: '[REDACTED]' },
              { username: 'user2', apiKey: '[REDACTED]' },
            ],
            configs: [
              { name: 'config1', token: '[REDACTED]' },
              { name: 'config2', secret: '[REDACTED]' },
            ],
          },
        })
      )
    })

    it('should handle primitive body values', () => {
      mockRequest.body = 'plain string body'

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockSecureLogger.info).toHaveBeenCalledWith('HTTP Request',
        expect.objectContaining({
          body: 'plain string body',
        })
      )
    })

    it('should handle null and undefined body values', () => {
      mockRequest.body = null

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockSecureLogger.info).toHaveBeenCalledWith('HTTP Request',
        expect.objectContaining({
          body: null,
        })
      )
    })

    it('should scrub case-insensitive sensitive field names', () => {
      mockRequest.body = {
        PASSWORD: 'secret1',
        ApiKey: 'secret2',
        TOKEN: 'secret3',
        normalField: 'normal',
      }

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockSecureLogger.info).toHaveBeenCalledWith('HTTP Request',
        expect.objectContaining({
          body: {
            PASSWORD: '[REDACTED]',
            ApiKey: '[REDACTED]',
            TOKEN: '[REDACTED]',
            normalField: 'normal',
          },
        })
      )
    })
  })

  describe('Timing measurement', () => {
    it('should measure request duration accurately', (done) => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext)

      // Wait a bit then trigger response
      setTimeout(() => {
        const interceptedJson = mockResponse.json as any
        interceptedJson({ result: 'success' })

        const logCall = mockSecureLogger.info.mock.calls.find(
          (call: any) => call[0] === 'HTTP Response'
        )
        expect(logCall).toBeDefined()
        
        const duration = logCall![1].duration
        expect(duration).toMatch(/^\d+ms$/)
        
        const durationMs = parseInt(duration.replace('ms', ''))
        expect(durationMs).toBeGreaterThanOrEqual(10) // At least 10ms passed
        expect(durationMs).toBeLessThan(1000) // Should be reasonable
        
        done()
      }, 15)
    })
  })
})