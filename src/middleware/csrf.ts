import { Request, Response, NextFunction } from 'express'
import Tokens from 'csrf'
import { McpError, BaseErrorCode } from '../types/errors.js'
import { secureLogger } from '../utils/secureLogger.js'

// Initialize CSRF token generator
const tokens = new Tokens()

// Store for CSRF secrets (in production, use Redis or similar)
// For simplicity, using in-memory store with session IDs
const csrfSecrets = new Map<string, string>()

// Cleanup old secrets periodically (every 30 minutes)
const cleanupInterval = setInterval(
  () => {
    try {
      const oneHourAgo = Date.now() - 60 * 60 * 1000
      for (const [sessionId, data] of csrfSecrets.entries()) {
        try {
          const secret = JSON.parse(data)
          if (secret.timestamp < oneHourAgo) {
            csrfSecrets.delete(sessionId)
          }
        } catch (parseError) {
          // Log error and remove corrupted entry
          secureLogger.error('Failed to parse CSRF secret data', {
            sessionId,
            error: parseError,
          })
          csrfSecrets.delete(sessionId)
        }
      }
    } catch (error) {
      secureLogger.error('Error during CSRF cleanup', { error })
    }
  },
  30 * 60 * 1000
)

// Export cleanup function for graceful shutdown
export const cleanupCsrfInterval = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
  }
}

/**
 * Generate a new CSRF token for a session
 */
export const generateCsrfToken = (sessionId: string): string => {
  try {
    // Generate a new secret for this session
    const secret = tokens.secretSync()

    // Store the secret with timestamp
    csrfSecrets.set(
      sessionId,
      JSON.stringify({
        secret,
        timestamp: Date.now(),
      })
    )

    // Generate and return the token
    const token = tokens.create(secret)

    secureLogger.debug('Generated CSRF token', { sessionId })

    return token
  } catch (error) {
    secureLogger.error('Failed to generate CSRF token', { error })
    throw new McpError(
      BaseErrorCode.INTERNAL_ERROR,
      'Failed to generate CSRF token'
    )
  }
}

/**
 * Validate a CSRF token
 */
export const validateCsrfToken = (
  sessionId: string,
  token: string
): boolean => {
  try {
    const secretData = csrfSecrets.get(sessionId)

    if (!secretData) {
      secureLogger.warn('No CSRF secret found for session', { sessionId })
      return false
    }

    const { secret } = JSON.parse(secretData)

    // Verify the token
    const isValid = tokens.verify(secret, token)

    if (!isValid) {
      secureLogger.warn('Invalid CSRF token', { sessionId })
    }

    return isValid
  } catch (error) {
    secureLogger.error('Failed to validate CSRF token', { error, sessionId })
    return false
  }
}

/**
 * Middleware to generate session ID if not present
 */
export const sessionMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Use existing session ID from cookie or generate new one
  let sessionId = req.cookies?.sessionId

  if (!sessionId) {
    // Generate a simple session ID (in production, use proper session management)
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000, // 1 hour
    })
  }

  // Attach session ID to request
  ;(req as any).sessionId = sessionId

  next()
}

/**
 * Middleware to validate CSRF tokens on state-changing requests
 */
export const csrfProtection = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Skip CSRF check for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next()
  }

  // Skip CSRF check for specific endpoints if needed
  const exemptPaths = ['/healthz', '/csrf-token']
  if (exemptPaths.includes(req.path)) {
    return next()
  }

  const sessionId = (req as any).sessionId
  if (!sessionId) {
    return res.status(403).json({
      success: false,
      error: 'CSRF_ERROR',
      message: 'Session required for CSRF protection',
      timestamp: new Date().toISOString(),
    })
  }

  // Get CSRF token from headers or body
  const token =
    (req.headers['x-csrf-token'] as string) ||
    req.body?._csrf ||
    (req.query?._csrf as string)

  if (!token) {
    secureLogger.warn('Missing CSRF token', {
      path: req.path,
      method: req.method,
      sessionId,
    })

    return res.status(403).json({
      success: false,
      error: 'CSRF_ERROR',
      message: 'CSRF token required',
      timestamp: new Date().toISOString(),
    })
  }

  // Validate the token
  if (!validateCsrfToken(sessionId, token)) {
    secureLogger.warn('Invalid CSRF token attempt', {
      path: req.path,
      method: req.method,
      sessionId,
    })

    return res.status(403).json({
      success: false,
      error: 'CSRF_ERROR',
      message: 'Invalid CSRF token',
      timestamp: new Date().toISOString(),
    })
  }

  secureLogger.debug('CSRF token validated successfully', {
    path: req.path,
    sessionId,
  })

  next()
}

/**
 * Error handler for CSRF-related errors
 */
export const csrfErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err && err.code === 'EBADCSRFTOKEN') {
    secureLogger.error('CSRF token validation failed', {
      error: err,
      path: req.path,
      method: req.method,
    })

    res.status(403).json({
      success: false,
      error: 'CSRF_ERROR',
      message: 'Invalid CSRF token',
      timestamp: new Date().toISOString(),
    })
  } else {
    next(err)
  }
}
