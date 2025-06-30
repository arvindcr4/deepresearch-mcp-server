import { Request, Response, NextFunction } from 'express'
import { secureLogger } from '../utils/secureLogger.js'
import { nanoid } from 'nanoid'

// Fields to scrub from request/response data
const SENSITIVE_REQUEST_FIELDS = [
  'authorization',
  'cookie',
  'x-api-key',
  'x-auth-token',
  'x-access-token',
  'x-csrf-token',
  'auth',
  'apikey',
  'api-key',
]

const SENSITIVE_BODY_FIELDS = [
  'password',
  'pwd',
  'pass',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'apikey',
  'credentials',
  'auth',
  'authorization',
]

/**
 * Scrubs sensitive data from headers
 */
function scrubHeaders(headers: Record<string, any>): Record<string, any> {
  const scrubbed: Record<string, any> = {}

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase()
    const isSensitive = SENSITIVE_REQUEST_FIELDS.some((field) =>
      lowerKey.includes(field.toLowerCase())
    )

    if (isSensitive) {
      scrubbed[key] = '[REDACTED]'
    } else {
      scrubbed[key] = value
    }
  }

  return scrubbed
}

/**
 * Scrubs sensitive data from request/response body
 */
function scrubBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body
  }

  if (Array.isArray(body)) {
    return body.map((item) => scrubBody(item))
  }

  const scrubbed: Record<string, any> = {}

  for (const [key, value] of Object.entries(body)) {
    const lowerKey = key.toLowerCase()
    const isSensitive = SENSITIVE_BODY_FIELDS.some((field) =>
      lowerKey.includes(field.toLowerCase())
    )

    if (isSensitive) {
      scrubbed[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      scrubbed[key] = scrubBody(value)
    } else {
      scrubbed[key] = value
    }
  }

  return scrubbed
}

/**
 * Express middleware for logging HTTP requests and responses with sensitive data scrubbing
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = nanoid(8)
  const startTime = Date.now()

  // Add request ID to request object for potential use by other middleware
  ;(req as any).requestId = requestId

  // Log incoming request
  secureLogger.info('HTTP Request', {
    requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    path: req.path,
    query: req.query,
    headers: scrubHeaders(req.headers),
    body: req.body ? scrubBody(req.body) : undefined,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
  })

  // Store original res.json to intercept response
  const originalJson = res.json

  res.json = function (body?: any) {
    const duration = Date.now() - startTime

    // Log response
    secureLogger.info('HTTP Response', {
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      duration: `${duration}ms`,
      headers: scrubHeaders(res.getHeaders()),
      body: body ? scrubBody(body) : undefined,
      timestamp: new Date().toISOString(),
    })

    // Call original json method
    return originalJson.call(this, body)
  }

  // Also handle res.send for non-JSON responses
  const originalSend = res.send

  res.send = function (body?: any) {
    const duration = Date.now() - startTime

    // Only log if json hasn't been called (to avoid duplicate logs)
    if (res.json === originalJson) {
      secureLogger.info('HTTP Response', {
        requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        duration: `${duration}ms`,
        headers: scrubHeaders(res.getHeaders()),
        contentType: res.get('Content-Type'),
        contentLength: res.get('Content-Length'),
        timestamp: new Date().toISOString(),
        // Don't log body for non-JSON responses to avoid large responses
      })
    }

    return originalSend.call(this, body)
  }

  // Handle response finish event as a fallback
  res.on('finish', () => {
    const duration = Date.now() - startTime

    // Only log if neither json nor send was called (edge case)
    if (res.json === originalJson && res.send === originalSend) {
      secureLogger.info('HTTP Response Finished', {
        requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      })
    }
  })

  next()
}

/**
 * Middleware to log unhandled errors
 */
export function errorLogger(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId = (req as any).requestId || 'unknown'

  secureLogger.error('HTTP Request Error', {
    requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    timestamp: new Date().toISOString(),
  })

  next(error)
}
