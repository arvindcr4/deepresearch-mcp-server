import { config } from '../config/index.js'
import { secureLogger } from './secureLogger.js'

export interface ValidationResult {
  valid: boolean
  warnings: string[]
  errors: string[]
}

/**
 * Validates configuration at startup without exposing sensitive values
 */
export function validateConfiguration(): ValidationResult {
  const warnings: string[] = []
  const errors: string[] = []

  // Check API keys are configured
  if (
    !config.apiKeys.openai &&
    !config.apiKeys.perplexity &&
    !config.apiKeys.xaiGrok
  ) {
    warnings.push(
      'No API keys configured. At least one provider API key should be set.'
    )
  }

  // Validate Neo4j configuration
  if (!config.neo4jPassword || config.neo4jPassword === 'password') {
    errors.push(
      'Neo4j password is not set or using default value. Please set NEO4J_PASSWORD environment variable.'
    )
  }

  // Check if running in production with debug logging
  if (config.environment === 'production' && config.logLevel === 'debug') {
    warnings.push(
      'Debug logging is enabled in production. Consider setting LOG_LEVEL to "info" or higher.'
    )
  }

  // Validate rate limits
  const rateLimitKeys = Object.keys(config.rateLimits) as Array<
    keyof typeof config.rateLimits
  >
  for (const key of rateLimitKeys) {
    if (config.rateLimits[key] <= 0) {
      errors.push(`Invalid rate limit for ${key}: must be greater than 0`)
    }
  }

  // Check backup configuration
  if (config.backup.maxBackups <= 0) {
    errors.push(
      'Invalid backup configuration: maxBackups must be greater than 0'
    )
  }

  // Security warnings
  if (!config.security.authRequired) {
    warnings.push(
      'Authentication is disabled. This is not recommended for production use.'
    )
  }

  // Log validation results securely
  if (errors.length > 0) {
    secureLogger.error('Configuration validation failed', { errors })
  }

  if (warnings.length > 0) {
    secureLogger.warn('Configuration validation warnings', { warnings })
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  }
}

/**
 * Prints a summary of the configuration without exposing sensitive values
 */
export function printConfigSummary(): void {
  const summary = {
    environment: config.environment,
    logLevel: config.logLevel,
    server: {
      name: config.mcpServerName,
      version: config.mcpServerVersion,
    },
    providers: {
      openai: config.apiKeys.openai ? 'configured' : 'not configured',
      perplexity: config.apiKeys.perplexity ? 'configured' : 'not configured',
      xaiGrok: config.apiKeys.xaiGrok ? 'configured' : 'not configured',
    },
    neo4j: {
      uri: config.neo4jUri.replace(/bolt:\/\/[^@]+@/, 'bolt://[REDACTED]@'),
      user: config.neo4jUser,
    },
    security: {
      authRequired: config.security.authRequired,
    },
    rateLimits: config.rateLimits,
    backup: {
      maxBackups: config.backup.maxBackups,
      path: 'configured',
    },
  }

  secureLogger.info('Configuration summary', summary)
}
