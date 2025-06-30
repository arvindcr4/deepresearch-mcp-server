import { z } from 'zod'
import { ValidationError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'
import { Request, Response, NextFunction } from 'express'
import {
  zDeepResearchQuery,
  zDeepResearchResponse,
  type DeepResearchQuery,
  type DeepResearchResponseType,
} from '../schemas/deepResearch.js'
import { compileSafeRegex, createSafeRegexTester } from '../utils/safeRegex.js'

export type SchemaType = 'object' | 'string' | 'number' | 'boolean' | 'array'

export interface ValidationSchema {
  type: SchemaType
  properties?: Record<string, ValidationSchema>
  required?: string[]
  items?: ValidationSchema
  enum?: unknown[]
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  pattern?: string
}

export class RequestValidator {
  static validate(
    data: unknown,
    schema: ValidationSchema,
    path: string = ''
  ): void {
    try {
      this.validateValue(data, schema, path)
    } catch (error) {
      logger.error('Validation failed', {
        path,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  private static validateValue(
    value: unknown,
    schema: ValidationSchema,
    path: string
  ): void {
    // Check type
    if (!this.checkType(value, schema.type)) {
      throw new ValidationError(
        `Expected ${schema.type} at ${path || 'root'}, got ${typeof value}`
      )
    }

    switch (schema.type) {
      case 'object':
        this.validateObject(value, schema, path)
        break
      case 'array':
        this.validateArray(value, schema, path)
        break
      case 'string':
        this.validateString(value as string, schema, path)
        break
      case 'number':
        this.validateNumber(value as number, schema, path)
        break
    }

    // Check enum
    if (schema.enum && !schema.enum.includes(value)) {
      throw new ValidationError(
        `Value at ${path || 'root'} must be one of: ${schema.enum.join(', ')}`
      )
    }
  }

  private static checkType(value: unknown, expectedType: SchemaType): boolean {
    switch (expectedType) {
      case 'object':
        return (
          typeof value === 'object' && value !== null && !Array.isArray(value)
        )
      case 'array':
        return Array.isArray(value)
      case 'string':
        return typeof value === 'string'
      case 'number':
        return typeof value === 'number' && !isNaN(value)
      case 'boolean':
        return typeof value === 'boolean'
      default:
        return false
    }
  }

  private static validateObject(
    obj: unknown,
    schema: ValidationSchema,
    path: string
  ): void {
    if (!schema.properties) return

    // Check required properties
    const objectValue = obj as Record<string, unknown>
    if (schema.required) {
      for (const requiredProp of schema.required) {
        if (!(requiredProp in objectValue)) {
          throw new ValidationError(
            `Missing required property '${requiredProp}' at ${path || 'root'}`
          )
        }
      }
    }

    // Validate each property
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      if (propName in objectValue) {
        const propPath = path ? `${path}.${propName}` : propName
        this.validateValue(objectValue[propName], propSchema, propPath)
      }
    }
  }

  private static validateArray(
    arr: unknown,
    schema: ValidationSchema,
    path: string
  ): void {
    if (schema.items && Array.isArray(arr)) {
      arr.forEach((item, index) => {
        const itemPath = `${path}[${index}]`
        this.validateValue(item, schema.items!, itemPath)
      })
    }
  }

  private static validateString(
    str: string,
    schema: ValidationSchema,
    path: string
  ): void {
    if (schema.minLength !== undefined && str.length < schema.minLength) {
      throw new ValidationError(
        `String at ${path || 'root'} must be at least ${schema.minLength} characters long`
      )
    }

    if (schema.maxLength !== undefined && str.length > schema.maxLength) {
      throw new ValidationError(
        `String at ${path || 'root'} must be at most ${schema.maxLength} characters long`
      )
    }

    if (schema.pattern) {
      try {
        // Use safe regex compilation to prevent ReDoS attacks
        const regexTester = createSafeRegexTester(schema.pattern, {
          logRejections: true,
          timeout: 50, // 50ms timeout for pattern matching
        })

        if (!regexTester(str)) {
          throw new ValidationError(
            `String at ${path || 'root'} does not match required pattern`
          )
        }
      } catch (error) {
        // If the pattern is unsafe or invalid, reject the validation
        logger.error('Pattern validation failed', {
          path,
          pattern: schema.pattern,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        throw new ValidationError(
          `Invalid or unsafe pattern at ${path || 'root'}: ${error instanceof Error ? error.message : 'Pattern validation failed'}`
        )
      }
    }
  }

  private static validateNumber(
    num: number,
    schema: ValidationSchema,
    path: string
  ): void {
    if (schema.minimum !== undefined && num < schema.minimum) {
      throw new ValidationError(
        `Number at ${path || 'root'} must be at least ${schema.minimum}`
      )
    }

    if (schema.maximum !== undefined && num > schema.maximum) {
      throw new ValidationError(
        `Number at ${path || 'root'} must be at most ${schema.maximum}`
      )
    }
  }
}

/**
 * Zod-based validation utilities for type-safe validation
 */
export class ZodValidator {
  /**
   * Validate deep research query input
   */
  static validateDeepResearchQuery(data: unknown): DeepResearchQuery {
    try {
      return zDeepResearchQuery.parse(data)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join(', ')
        throw new ValidationError(
          `Deep Research Query validation failed: ${issues}`
        )
      }
      throw new ValidationError(
        `Deep Research Query validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Validate deep research response output
   */
  static validateDeepResearchResponse(data: unknown): DeepResearchResponseType {
    try {
      return zDeepResearchResponse.parse(data)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join(', ')
        throw new ValidationError(
          `Deep Research Response validation failed: ${issues}`
        )
      }
      throw new ValidationError(
        `Deep Research Response validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Generic Zod schema validator
   */
  static validate<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    schemaName: string = 'Schema'
  ): T {
    try {
      return schema.parse(data)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join(', ')
        logger.error(`${schemaName} validation failed`, { issues, data })
        throw new ValidationError(`${schemaName} validation failed: ${issues}`)
      }
      logger.error(`${schemaName} validation failed`, { error, data })
      throw new ValidationError(
        `${schemaName} validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Safe parse that returns result with success/error status
   */
  static safeParse<T>(
    schema: z.ZodSchema<T>,
    data: unknown
  ): { success: true; data: T } | { success: false; error: string } {
    const result = schema.safeParse(data)
    if (result.success) {
      return { success: true, data: result.data }
    } else {
      const issues = result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ')
      return { success: false, error: issues }
    }
  }
}

/**
 * Validation middleware for HTTP requests
 */
export function createValidationMiddleware<T>(
  schema: z.ZodSchema<T>,
  target: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const dataToValidate = req[target]
      const validatedData = ZodValidator.validate(
        schema,
        dataToValidate,
        `Request ${target}`
      )
      // Add validated data to request object
      const validatedKey = `validated${target.charAt(0).toUpperCase() + target.slice(1)}`
      Object.defineProperty(req, validatedKey, {
        value: validatedData,
        writable: false,
        enumerable: true,
        configurable: true,
      })
      next()
    } catch (error) {
      logger.error(`Validation middleware failed for ${target}`, {
        error,
        data: req[target],
      })
      res.status(400).json({
        error: 'Validation Error',
        message:
          error instanceof Error ? error.message : 'Unknown validation error',
        timestamp: new Date().toISOString(),
      })
    }
  }
}

/**
 * CLI validation utility
 */
export class CLIValidator {
  /**
   * Validate CLI arguments for deep research
   */
  static validateCLIArgs(args: unknown): DeepResearchQuery {
    // Transform CLI args to match schema format
    const cliArgs = args as Record<string, unknown>
    const transformed = {
      query: cliArgs.query,
      provider: cliArgs.provider || 'openai',
      model: cliArgs.model,
      maxResults: cliArgs.maxResults
        ? parseInt(String(cliArgs.maxResults))
        : undefined,
      includePageContent: cliArgs.includePageContent || false,
      browsePage: cliArgs.browsePage,
      recency: cliArgs.recency,
      searchDepth: cliArgs.searchDepth,
      realTimeData: cliArgs.realTimeData || false,
      searchDomainFilter: cliArgs.searchDomainFilter,
      includeAnalysis: cliArgs.includeAnalysis || false,
      context: cliArgs.context,
      temperature: cliArgs.temperature
        ? parseFloat(String(cliArgs.temperature))
        : undefined,
      max_tokens: cliArgs.maxTokens
        ? parseInt(String(cliArgs.maxTokens))
        : undefined,
    }

    // Remove undefined values
    Object.keys(transformed).forEach((key) => {
      if (transformed[key as keyof typeof transformed] === undefined) {
        delete transformed[key as keyof typeof transformed]
      }
    })

    return ZodValidator.validateDeepResearchQuery(transformed)
  }
}

// Common validation schemas (legacy support)
export const commonSchemas = {
  searchQuery: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string' as const,
        minLength: 1,
        maxLength: 1000,
      },
      options: {
        type: 'object' as const,
        properties: {
          maxResults: {
            type: 'number' as const,
            minimum: 1,
            maximum: 100,
          },
          includePageContent: {
            type: 'boolean' as const,
          },
          browsePage: {
            type: 'string' as const,
            pattern: '^https?://[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}(/[^\\s]*)?$',
          },
          recency: {
            type: 'string' as const,
            enum: ['day', 'week', 'month', 'year'],
          },
        },
      },
    },
    required: ['query'],
  },
}

// Export Zod schemas and types for external use
export {
  zDeepResearchQuery,
  zDeepResearchResponse,
  type DeepResearchQuery,
  type DeepResearchResponseType,
}
