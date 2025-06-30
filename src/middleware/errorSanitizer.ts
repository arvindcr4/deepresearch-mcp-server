import { redactString } from '../utils/secureLogger.js'

/**
 * Sanitizes error messages and stack traces to prevent API key exposure
 */
export function sanitizeError(error: unknown): Error {
  if (!(error instanceof Error)) {
    return new Error('Unknown error')
  }

  // Create a new error with sanitized message
  const sanitizedError = new Error(redactString(error.message))
  sanitizedError.name = error.name

  // Sanitize stack trace if present
  if (error.stack) {
    sanitizedError.stack = redactString(error.stack)
  }

  // Copy over any additional properties but sanitize them
  const errorObj = error as any
  const sanitizedObj = sanitizedError as any

  for (const key of Object.keys(errorObj)) {
    if (key !== 'message' && key !== 'stack' && key !== 'name') {
      const value = errorObj[key]
      if (typeof value === 'string') {
        sanitizedObj[key] = redactString(value)
      } else if (typeof value === 'object' && value !== null) {
        // For objects, create a simple representation without sensitive data
        sanitizedObj[key] = '[Object]'
      } else {
        sanitizedObj[key] = value
      }
    }
  }

  return sanitizedError
}

/**
 * Creates a sanitized error response for API errors
 */
export function createSanitizedApiError(
  status: number,
  statusText: string,
  provider: string,
  errorData?: any
): Error {
  // Never include raw error data in the message
  let message = `${provider} API error: ${status} ${statusText}`

  // Add helpful context based on status code
  if (status === 401) {
    message += ' - Authentication failed. Check API key configuration.'
  } else if (status === 403) {
    message += ' - Access forbidden. Check API permissions.'
  } else if (status === 429) {
    message += ' - Rate limit exceeded. Please try again later.'
  } else if (status >= 500) {
    message += ' - Server error. The service may be temporarily unavailable.'
  }

  const error = new Error(message)
  ;(error as any).status = status
  ;(error as any).provider = provider

  // Store sanitized error data if needed for debugging
  if (errorData && process.env.NODE_ENV !== 'production') {
    ;(error as any).debugInfo = '[Error details hidden for security]'
  }

  return error
}

/**
 * Wraps an async function to automatically sanitize any thrown errors
 */
export function withErrorSanitization<
  T extends (...args: any[]) => Promise<any>,
>(fn: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (error) {
      throw sanitizeError(error)
    }
  }) as T
}
