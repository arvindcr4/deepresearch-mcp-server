import { redactObject, redactString } from './secureLogger.js'

// Define error detail types
export type ErrorDetails = Record<string, unknown>
export type ValidationErrorDetails = {
  field?: string
  value?: unknown
  constraints?: Record<string, string>
} & ErrorDetails

export enum BaseErrorCode {
  INVALID_REQUEST = 'INVALID_REQUEST',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

export class McpError extends Error {
  public readonly code: BaseErrorCode
  public readonly details?: ErrorDetails
  private readonly unsafeDetails?: ErrorDetails

  constructor(code: BaseErrorCode, message: string, details?: ErrorDetails) {
    // Sanitize the message to prevent API key exposure
    const sanitizedMessage = redactString(message)
    super(sanitizedMessage)
    this.name = 'McpError'
    this.code = code
    this.unsafeDetails = details
    // Store sanitized details
    this.details = details ? redactObject(details) : undefined
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details, // Already sanitized
    }
  }

  // Method to get unsafe details for internal debugging only
  getUnsafeDetails() {
    return this.unsafeDetails
  }
}

export class ProviderError extends McpError {
  constructor(message: string, details?: ErrorDetails) {
    super(BaseErrorCode.PROVIDER_ERROR, message, details)
    this.name = 'ProviderError'
  }
}

export class ValidationError extends McpError {
  constructor(message: string, details?: ValidationErrorDetails) {
    super(BaseErrorCode.VALIDATION_ERROR, message, details)
    this.name = 'ValidationError'
  }
}

export class NetworkError extends McpError {
  constructor(message: string, details?: ErrorDetails) {
    super(BaseErrorCode.NETWORK_ERROR, message, details)
    this.name = 'NetworkError'
  }
}

export class RateLimitError extends McpError {
  constructor(message: string, details?: ErrorDetails) {
    super(BaseErrorCode.RATE_LIMIT_EXCEEDED, message, details)
    this.name = 'RateLimitError'
  }
}
