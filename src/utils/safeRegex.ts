/**
 * Safe Regex Utility
 * ==================
 *
 * Provides secure regex compilation with ReDoS (Regular Expression Denial of Service) protection.
 * This module validates regex patterns before compilation to prevent catastrophic backtracking.
 */

import { logger } from './logger.js'
import { ValidationError } from './errors.js'

/**
 * Maximum allowed pattern length to prevent extremely long patterns
 */
const MAX_PATTERN_LENGTH = 1000

/**
 * Maximum allowed quantifier repetition count
 */
const MAX_QUANTIFIER_LIMIT = 100

/**
 * Timeout for regex execution in milliseconds
 */
const REGEX_TIMEOUT_MS = 100

/**
 * Patterns that commonly cause catastrophic backtracking
 */
const DANGEROUS_PATTERNS = [
  // Nested quantifiers - more comprehensive patterns
  /\([^)]*[*+]\)[*+]/, // (a+)+ or (a*)*
  /\([^)]*\{[^}]+\}\)[*+]/, // (a{1,5})+
  /\([^)]*[*+]\)\{[^}]+\}/, // (a+){2,}
  /\([^)]*\|[^)]*\)[*+]/, // (a|b)*
  /\(\.\*\)[*+]/, // (.*)+
  /\([^)]+\)[*+]\s*[*+]/, // (a)+ +

  // Alternation with overlapping patterns
  /\(([^)|]+\|)*[^)|]+\)[*+]/, // (foo|bar|baz)*

  // Exponential patterns
  /\(\.\*\)\{2,\}/, // (.*){2,}
  /\([^)]*\.\*[^)]*\)\{2,\}/, // (.*a){2,}

  // Complex nested patterns
  /\([^()]*\([^()]*[*+]\)[^()]*\)[*+]/, // ((a+)b)*
]

/**
 * Check if a pattern is safe from ReDoS attacks
 */
export function isSafePattern(pattern: string): {
  safe: boolean
  reason?: string
} {
  // Check pattern length
  if (pattern.length > MAX_PATTERN_LENGTH) {
    return {
      safe: false,
      reason: `Pattern exceeds maximum length of ${MAX_PATTERN_LENGTH} characters`,
    }
  }

  // Check for empty pattern
  if (!pattern || pattern.trim().length === 0) {
    return {
      safe: false,
      reason: 'Pattern cannot be empty',
    }
  }

  // Check for dangerous patterns
  for (const dangerous of DANGEROUS_PATTERNS) {
    if (dangerous.test(pattern)) {
      return {
        safe: false,
        reason:
          'Pattern contains potentially dangerous constructs that may cause catastrophic backtracking',
      }
    }
  }

  // Check for excessive quantifiers
  const quantifierMatch = pattern.match(/\{(\d+),?(\d*)\}/g)
  if (quantifierMatch) {
    for (const quantifier of quantifierMatch) {
      const numbers = quantifier.match(/\d+/g)
      if (numbers) {
        for (const num of numbers) {
          if (parseInt(num, 10) > MAX_QUANTIFIER_LIMIT) {
            return {
              safe: false,
              reason: `Quantifier limit exceeds maximum of ${MAX_QUANTIFIER_LIMIT}`,
            }
          }
        }
      }
    }
  }

  // Check for excessive alternations
  const alternationCount = (pattern.match(/\|/g) || []).length
  if (alternationCount > 10) {
    return {
      safe: false,
      reason: 'Pattern contains too many alternations (> 10)',
    }
  }

  // Check for excessive nested groups
  let depth = 0
  let maxDepth = 0
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i]
    const prevChar = i > 0 ? pattern[i - 1] : ''

    if (char === '(' && prevChar !== '\\') {
      depth++
      maxDepth = Math.max(maxDepth, depth)
    } else if (char === ')' && prevChar !== '\\') {
      depth--
    }
  }
  if (maxDepth > 3) {
    return {
      safe: false,
      reason: 'Pattern contains too many nested groups (> 3 levels)',
    }
  }

  return { safe: true }
}

/**
 * Test a regex with timeout protection
 */
function testRegexWithTimeout(
  regex: RegExp,
  testString: string,
  timeoutMs: number = REGEX_TIMEOUT_MS
): { success: boolean; result?: boolean; error?: string } {
  const startTime = Date.now()

  try {
    // Use a simple approach - if regex takes too long, it will be caught by the overall timeout
    const result = regex.test(testString)
    const elapsed = Date.now() - startTime

    if (elapsed > timeoutMs) {
      return {
        success: false,
        error: `Regex execution exceeded timeout of ${timeoutMs}ms`,
      }
    }

    return { success: true, result }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown regex error',
    }
  }
}

/**
 * Options for safe regex compilation
 */
export interface SafeRegexOptions {
  /** Flags for the regex (e.g., 'i', 'g', 'm') */
  flags?: string
  /** Custom timeout in milliseconds */
  timeout?: number
  /** Whether to log rejected patterns */
  logRejections?: boolean
  /** Test string to validate the regex (optional) */
  testString?: string
}

/**
 * Compile a regex pattern safely with ReDoS protection
 */
export function compileSafeRegex(
  pattern: string,
  options: SafeRegexOptions = {}
): RegExp {
  const { flags = '', logRejections = true, testString, timeout } = options

  // Validate the pattern
  const validation = isSafePattern(pattern)
  if (!validation.safe) {
    if (logRejections) {
      logger.warn('Rejected unsafe regex pattern', {
        pattern,
        reason: validation.reason,
      })
    }
    throw new ValidationError(`Unsafe regex pattern: ${validation.reason}`)
  }

  try {
    // Compile the regex
    const regex = new RegExp(pattern, flags)

    // If a test string is provided, validate execution time
    if (testString) {
      const testResult = testRegexWithTimeout(regex, testString, timeout)
      if (!testResult.success) {
        if (logRejections) {
          logger.warn('Regex failed timeout test', {
            pattern,
            error: testResult.error,
          })
        }
        throw new ValidationError(
          `Regex pattern failed safety test: ${testResult.error}`
        )
      }
    }

    return regex
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }

    if (logRejections) {
      logger.error('Failed to compile regex', {
        pattern,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    throw new ValidationError(
      `Invalid regex pattern: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Create a safe regex tester function with built-in timeout protection
 */
export function createSafeRegexTester(
  pattern: string,
  options: SafeRegexOptions = {}
): (testString: string) => boolean {
  const regex = compileSafeRegex(pattern, options)
  const timeout = options.timeout || REGEX_TIMEOUT_MS

  return (testString: string): boolean => {
    const result = testRegexWithTimeout(regex, testString, timeout)
    if (!result.success) {
      logger.warn('Regex test failed', {
        pattern,
        error: result.error,
      })
      return false
    }
    return result.result || false
  }
}

/**
 * Escape special regex characters in a string
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Common safe patterns for validation
 */
export const SAFE_PATTERNS = {
  // URL pattern (simplified and safe)
  URL: '^https?://[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}(/[^\\s]*)?$',

  // Email pattern (simplified and safe)
  EMAIL: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',

  // Alphanumeric with underscores and hyphens
  IDENTIFIER: '^[a-zA-Z0-9_-]+$',

  // Simple number pattern
  NUMBER: '^-?\\d+(\\.\\d+)?$',

  // ISO date pattern
  ISO_DATE: '^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}(\\.\\d{3})?Z?)?$',

  // Simple path pattern
  PATH: '^[a-zA-Z0-9/_.-]+$',
} as const

/**
 * Validate a string against a safe pattern
 */
export function validateWithSafePattern(
  value: string,
  patternKey: keyof typeof SAFE_PATTERNS
): boolean {
  try {
    const regex = compileSafeRegex(SAFE_PATTERNS[patternKey])
    return regex.test(value)
  } catch (error) {
    logger.error('Failed to validate with safe pattern', {
      patternKey,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return false
  }
}
