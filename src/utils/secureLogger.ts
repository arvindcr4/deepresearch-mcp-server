import { logger as baseLogger } from './logger.js'

// Patterns to identify sensitive data
const SENSITIVE_PATTERNS = [
  // API Keys and tokens
  /Bearer\s+[\w-.]+/gi,
  /api[_-]?key[\s:=]+["']?[\w-.]+["']?/gi,
  /token[\s:=]+["']?[\w-.]+["']?/gi,
  /secret[\s:=]+["']?[\w-.]+["']?/gi,
  /password[\s:=]+["']?[^"'\s,}]+["']?/gi,
  /pwd[\s:=]+["']?[^"'\s,}]+["']?/gi,
  /auth[\s:=]+["']?[\w-.]+["']?/gi,
  /credentials[\s:=]+["']?[^"'\s,}]+["']?/gi,
  // Connection strings
  /bolt:\/\/[^@]+@[^/]+/gi,
  /https?:\/\/[^:]+:[^@]+@[^/]+/gi,
  // Environment variable patterns
  /OPENAI_API_KEY[\s:=]+["']?[\w-.]+["']?/gi,
  /PERPLEXITY_API_KEY[\s:=]+["']?[\w-.]+["']?/gi,
  /XAI_GROK_API_KEY[\s:=]+["']?[\w-.]+["']?/gi,
  /NEO4J_PASSWORD[\s:=]+["']?[^"'\s,}]+["']?/gi,
  /FIRECRAWL_API_KEY[\s:=]+["']?[\w-.]+["']?/gi,
  /AGENTSPACE_API_KEY[\s:=]+["']?[\w-.]+["']?/gi,
]

// Fields to redact in objects
const SENSITIVE_FIELDS = [
  'apiKey',
  'api_key',
  'apikey',
  'key',
  'token',
  'secret',
  'password',
  'pwd',
  'pass',
  'auth',
  'authorization',
  'credentials',
  'neo4jPassword',
  'neo4jUri',
  'neo4jUser',
  'OPENAI_API_KEY',
  'PERPLEXITY_API_KEY',
  'XAI_GROK_API_KEY',
  'NEO4J_PASSWORD',
  'FIRECRAWL_API_KEY',
  'AGENTSPACE_API_KEY',
]

type LogContext = Record<string, any>

/**
 * Redacts sensitive information from a string
 */
function redactString(str: string): string {
  if (typeof str !== 'string') return str

  let redacted = str

  // Apply all sensitive patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    redacted = redacted.replace(pattern, (match) => {
      // Keep the first part of the match to understand what was redacted
      const prefix = match.substring(
        0,
        Math.min(match.indexOf('=') + 1 || 10, 10)
      )
      return `${prefix}[REDACTED]`
    })
  }

  return redacted
}

/**
 * Deep clones an object while redacting sensitive fields
 */
function redactObject(obj: any, depth = 0): any {
  // Prevent infinite recursion
  if (depth > 10) return '[DEEP_OBJECT]'

  if (obj === null || obj === undefined) return obj

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item, depth + 1))
  }

  // Handle primitive types
  if (typeof obj !== 'object') {
    return typeof obj === 'string' ? redactString(obj) : obj
  }

  // Handle Error objects specially
  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: redactString(obj.message),
      stack: obj.stack ? redactString(obj.stack) : undefined,
      // Redact any additional error properties
      ...Object.keys(obj).reduce(
        (acc, key) => {
          if (key !== 'name' && key !== 'message' && key !== 'stack') {
            acc[key] = redactObject((obj as any)[key], depth + 1)
          }
          return acc
        },
        {} as Record<string, any>
      ),
    }
  }

  // Handle regular objects
  const redacted: Record<string, any> = {}

  for (const [key, value] of Object.entries(obj)) {
    // Check if the field name is sensitive
    const isSensitiveField = SENSITIVE_FIELDS.some((field) =>
      key.toLowerCase().includes(field.toLowerCase())
    )

    if (isSensitiveField) {
      // Completely redact sensitive fields
      redacted[key] = '[REDACTED]'
    } else if (typeof value === 'string') {
      // Redact strings that might contain sensitive data
      redacted[key] = redactString(value)
    } else if (typeof value === 'object') {
      // Recursively redact nested objects
      redacted[key] = redactObject(value, depth + 1)
    } else {
      // Keep non-sensitive primitive values
      redacted[key] = value
    }
  }

  return redacted
}

/**
 * Secure logger that automatically redacts sensitive information
 */
export class SecureLogger {
  private static instance: SecureLogger

  private constructor() {}

  public static getInstance(): SecureLogger {
    if (!SecureLogger.instance) {
      SecureLogger.instance = new SecureLogger()
    }
    return SecureLogger.instance
  }

  private sanitizeMessage(message: string): string {
    return redactString(message)
  }

  private sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context) return undefined
    return redactObject(context)
  }

  public debug(message: string, context?: LogContext) {
    baseLogger.debug(
      this.sanitizeMessage(message),
      this.sanitizeContext(context)
    )
  }

  public info(message: string, context?: LogContext) {
    baseLogger.info(
      this.sanitizeMessage(message),
      this.sanitizeContext(context)
    )
  }

  public warn(message: string, context?: LogContext) {
    baseLogger.warn(
      this.sanitizeMessage(message),
      this.sanitizeContext(context)
    )
  }

  public error(
    message: string,
    error?: Error | LogContext,
    context?: LogContext
  ) {
    const sanitizedMessage = this.sanitizeMessage(message)

    if (error instanceof Error) {
      const sanitizedError = redactObject(error)
      const sanitizedContext = this.sanitizeContext(context)
      baseLogger.error(sanitizedMessage, sanitizedError, sanitizedContext)
    } else {
      // If error is not an Error object, treat it as part of the context
      const combinedContext = { ...error, ...context }
      baseLogger.error(
        sanitizedMessage,
        undefined,
        this.sanitizeContext(combinedContext)
      )
    }
  }
}

// Export a singleton instance
export const secureLogger = SecureLogger.getInstance()

// Export for testing purposes
export { redactString, redactObject }
