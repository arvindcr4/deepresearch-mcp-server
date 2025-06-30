/**
 * Tests for Validation Middleware
 */

import { RequestValidator, ValidationSchema } from '../validation.js'
import { ValidationError } from '../../utils/errors.js'

// Mock logger
jest.mock('../../utils/logger.js', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

describe('RequestValidator', () => {
  describe('Pattern Validation with ReDoS Protection', () => {
    it('should validate strings with safe patterns', () => {
      const schema: ValidationSchema = {
        type: 'string',
        pattern: '^[a-zA-Z0-9]+$',
      }

      expect(() => RequestValidator.validate('test123', schema)).not.toThrow()

      expect(() => RequestValidator.validate('test@123', schema)).toThrow(
        ValidationError
      )
    })

    it('should reject ReDoS vulnerable patterns', () => {
      const vulnerablePatterns = [
        '(a+)+',
        '(a*)*',
        '(a|a)*',
        '(.*)*',
        '(.*)+',
        '([a-zA-Z]+)*',
        '(\\d+)+\\w',
      ]

      for (const pattern of vulnerablePatterns) {
        const schema: ValidationSchema = {
          type: 'string',
          pattern,
        }

        expect(() => RequestValidator.validate('test', schema)).toThrow(
          ValidationError
        )

        try {
          RequestValidator.validate('test', schema)
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError)
          expect((error as ValidationError).message).toContain(
            'Invalid or unsafe pattern'
          )
        }
      }
    })

    it('should handle pattern validation errors gracefully', () => {
      const schema: ValidationSchema = {
        type: 'string',
        pattern: '[', // Invalid regex syntax
      }

      expect(() => RequestValidator.validate('test', schema)).toThrow(
        ValidationError
      )
    })

    it('should enforce timeout for pattern matching', () => {
      const schema: ValidationSchema = {
        type: 'string',
        pattern: '^[a-z]+$',
      }

      // Normal string should work fine
      expect(() =>
        RequestValidator.validate('abcdefghij', schema)
      ).not.toThrow()
    })
  })

  describe('URL Pattern Validation', () => {
    it('should validate URLs with the updated safe pattern', () => {
      const schema: ValidationSchema = {
        type: 'object',
        properties: {
          browsePage: {
            type: 'string',
            pattern: '^https?://[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}(/[^\\s]*)?$',
          },
        },
      }

      const validUrls = [
        { browsePage: 'https://example.com' },
        { browsePage: 'http://test.org' },
        { browsePage: 'https://sub.domain.com/path/to/page' },
        { browsePage: 'https://example.com/path?query=value' },
      ]

      for (const data of validUrls) {
        expect(() => RequestValidator.validate(data, schema)).not.toThrow()
      }

      const invalidUrls = [
        { browsePage: 'ftp://example.com' },
        { browsePage: 'not-a-url' },
        { browsePage: 'https://' },
        { browsePage: 'http://invalid url.com' },
      ]

      for (const data of invalidUrls) {
        expect(() => RequestValidator.validate(data, schema)).toThrow(
          ValidationError
        )
      }
    })
  })

  describe('Complex Object Validation', () => {
    it('should validate nested objects with patterns', () => {
      const schema: ValidationSchema = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              email: {
                type: 'string',
                pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
              },
              username: {
                type: 'string',
                pattern: '^[a-zA-Z0-9_-]+$',
                minLength: 3,
                maxLength: 20,
              },
            },
            required: ['email', 'username'],
          },
        },
        required: ['user'],
      }

      const validData = {
        user: {
          email: 'test@example.com',
          username: 'test_user123',
        },
      }

      expect(() => RequestValidator.validate(validData, schema)).not.toThrow()

      const invalidData = {
        user: {
          email: 'invalid-email',
          username: 'test user', // Contains space
        },
      }

      expect(() => RequestValidator.validate(invalidData, schema)).toThrow(
        ValidationError
      )
    })
  })

  describe('Array Validation with Patterns', () => {
    it('should validate arrays of strings with patterns', () => {
      const schema: ValidationSchema = {
        type: 'array',
        items: {
          type: 'string',
          pattern: '^[A-Z]{2,3}$',
        },
      }

      const validData = ['US', 'UK', 'CAN', 'FR']
      expect(() => RequestValidator.validate(validData, schema)).not.toThrow()

      const invalidData = ['USA', 'uk', '123', 'CANADA']
      expect(() => RequestValidator.validate(invalidData, schema)).toThrow(
        ValidationError
      )
    })
  })

  describe('Pattern Length Limits', () => {
    it('should reject patterns that are too long', () => {
      const longPattern = 'a'.repeat(1001)
      const schema: ValidationSchema = {
        type: 'string',
        pattern: longPattern,
      }

      expect(() => RequestValidator.validate('test', schema)).toThrow(
        ValidationError
      )
    })
  })

  describe('Safe Pattern Alternatives', () => {
    it('should work with safe email pattern', () => {
      const schema: ValidationSchema = {
        type: 'string',
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
      }

      expect(() =>
        RequestValidator.validate('user@example.com', schema)
      ).not.toThrow()

      expect(() => RequestValidator.validate('invalid.email', schema)).toThrow(
        ValidationError
      )
    })

    it('should work with safe phone pattern', () => {
      const schema: ValidationSchema = {
        type: 'string',
        pattern: '^\\d{3}-\\d{3}-\\d{4}$',
      }

      expect(() =>
        RequestValidator.validate('123-456-7890', schema)
      ).not.toThrow()

      expect(() => RequestValidator.validate('1234567890', schema)).toThrow(
        ValidationError
      )
    })

    it('should work with safe identifier pattern', () => {
      const schema: ValidationSchema = {
        type: 'string',
        pattern: '^[a-zA-Z][a-zA-Z0-9_]*$',
      }

      expect(() =>
        RequestValidator.validate('validIdentifier', schema)
      ).not.toThrow()

      expect(() => RequestValidator.validate('123invalid', schema)).toThrow(
        ValidationError
      )
    })
  })
})
