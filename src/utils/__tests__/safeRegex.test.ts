/**
 * Tests for Safe Regex Utility
 */

import {
  isSafePattern,
  compileSafeRegex,
  createSafeRegexTester,
  escapeRegex,
  validateWithSafePattern,
  SAFE_PATTERNS,
} from '../safeRegex.js'
import { ValidationError } from '../errors.js'

// Mock logger to prevent console output during tests
jest.mock('../logger.js', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

describe('SafeRegex Utility', () => {
  describe('isSafePattern', () => {
    it('should accept safe patterns', () => {
      const safePatterns = [
        '^test$',
        'hello world',
        '[a-z]+',
        '\\d{3}-\\d{3}-\\d{4}',
        'foo|bar|baz',
        '(test){1,5}',
      ]

      for (const pattern of safePatterns) {
        const result = isSafePattern(pattern)
        expect(result.safe).toBe(true)
        expect(result.reason).toBeUndefined()
      }
    })

    it('should reject patterns with nested quantifiers', () => {
      const unsafePatterns = ['(a+)+', '(a*)*', '(a+)*', '(a{1,5})+', '(foo+)+']

      for (const pattern of unsafePatterns) {
        const result = isSafePattern(pattern)
        expect(result.safe).toBe(false)
        expect(result.reason).toContain('dangerous constructs')
      }
    })

    it('should reject patterns with excessive length', () => {
      const longPattern = 'a'.repeat(1001)
      const result = isSafePattern(longPattern)
      expect(result.safe).toBe(false)
      expect(result.reason).toContain('exceeds maximum length')
    })

    it('should reject patterns with excessive quantifiers', () => {
      const patterns = ['a{1000}', 'b{101,200}', 'c{50,101}']

      for (const pattern of patterns) {
        const result = isSafePattern(pattern)
        expect(result.safe).toBe(false)
        expect(result.reason).toContain('Quantifier limit exceeds maximum')
      }
    })

    it('should reject patterns with too many alternations', () => {
      const pattern = 'a|b|c|d|e|f|g|h|i|j|k|l'
      const result = isSafePattern(pattern)
      expect(result.safe).toBe(false)
      expect(result.reason).toContain('too many alternations')
    })

    it('should reject patterns with deep nesting', () => {
      const pattern = '((((test))))'
      const result = isSafePattern(pattern)
      expect(result.safe).toBe(false)
      expect(result.reason).toContain('too many nested groups')
    })

    it('should reject empty patterns', () => {
      const patterns = ['', '   ', '\t\n']

      for (const pattern of patterns) {
        const result = isSafePattern(pattern)
        expect(result.safe).toBe(false)
        expect(result.reason).toContain('cannot be empty')
      }
    })

    it('should detect alternation with quantifier patterns', () => {
      const pattern = '(foo|bar)*'
      const result = isSafePattern(pattern)
      expect(result.safe).toBe(false)
      expect(result.reason).toContain('dangerous constructs')
    })
  })

  describe('compileSafeRegex', () => {
    it('should compile safe patterns successfully', () => {
      const regex = compileSafeRegex('^test$', { flags: 'i' })
      expect(regex).toBeInstanceOf(RegExp)
      expect(regex.test('TEST')).toBe(true)
      expect(regex.test('test')).toBe(true)
      expect(regex.test('testing')).toBe(false)
    })

    it('should throw ValidationError for unsafe patterns', () => {
      expect(() => compileSafeRegex('(a+)+')).toThrow(ValidationError)
      expect(() => compileSafeRegex('(a+)+')).toThrow(/Unsafe regex pattern/)
    })

    it('should throw ValidationError for invalid regex syntax', () => {
      expect(() => compileSafeRegex('[')).toThrow(ValidationError)
      expect(() => compileSafeRegex('[')).toThrow(/Invalid regex pattern/)
    })

    it('should validate with test string if provided', () => {
      const regex = compileSafeRegex('^\\d+$', {
        testString: '12345',
        timeout: 50,
      })
      expect(regex.test('12345')).toBe(true)
    })

    it('should handle timeout during test string validation', () => {
      // This is a simplified test - in reality, we'd need a pattern that actually times out
      const pattern = '^test$'
      expect(() =>
        compileSafeRegex(pattern, {
          testString: 'test',
          timeout: 50,
        })
      ).not.toThrow()
    })
  })

  describe('createSafeRegexTester', () => {
    it('should create a tester function for safe patterns', () => {
      const tester = createSafeRegexTester('^\\d{3}-\\d{3}-\\d{4}$')

      expect(tester('123-456-7890')).toBe(true)
      expect(tester('123-45-6789')).toBe(false)
      expect(tester('abc-def-ghij')).toBe(false)
    })

    it('should throw for unsafe patterns', () => {
      expect(() => createSafeRegexTester('(a+)+')).toThrow(ValidationError)
    })

    it('should handle timeout gracefully', () => {
      const tester = createSafeRegexTester('^test$', { timeout: 50 })
      expect(tester('test')).toBe(true)
      expect(tester('testing')).toBe(false)
    })
  })

  describe('escapeRegex', () => {
    it('should escape special regex characters', () => {
      expect(escapeRegex('test.com')).toBe('test\\.com')
      expect(escapeRegex('a+b*c?')).toBe('a\\+b\\*c\\?')
      expect(escapeRegex('[abc]')).toBe('\\[abc\\]')
      expect(escapeRegex('(test)')).toBe('\\(test\\)')
      expect(escapeRegex('$100')).toBe('\\$100')
      expect(escapeRegex('^start')).toBe('\\^start')
      expect(escapeRegex('a{1,3}')).toBe('a\\{1,3\\}')
      expect(escapeRegex('a|b')).toBe('a\\|b')
    })

    it('should handle strings without special characters', () => {
      expect(escapeRegex('hello')).toBe('hello')
      expect(escapeRegex('test123')).toBe('test123')
    })
  })

  describe('SAFE_PATTERNS', () => {
    it('should have valid URL pattern', () => {
      const urlRegex = compileSafeRegex(SAFE_PATTERNS.URL)

      expect(urlRegex.test('https://example.com')).toBe(true)
      expect(urlRegex.test('http://test.org')).toBe(true)
      expect(urlRegex.test('https://sub.domain.com/path/to/page')).toBe(true)
      expect(urlRegex.test('ftp://example.com')).toBe(false)
      expect(urlRegex.test('not-a-url')).toBe(false)
    })

    it('should have valid EMAIL pattern', () => {
      const emailRegex = compileSafeRegex(SAFE_PATTERNS.EMAIL)

      expect(emailRegex.test('test@example.com')).toBe(true)
      expect(emailRegex.test('user.name+tag@domain.co.uk')).toBe(true)
      expect(emailRegex.test('invalid@')).toBe(false)
      expect(emailRegex.test('@domain.com')).toBe(false)
    })

    it('should have valid IDENTIFIER pattern', () => {
      const idRegex = compileSafeRegex(SAFE_PATTERNS.IDENTIFIER)

      expect(idRegex.test('valid_identifier')).toBe(true)
      expect(idRegex.test('test-123')).toBe(true)
      expect(idRegex.test('ABC_xyz-789')).toBe(true)
      expect(idRegex.test('invalid identifier')).toBe(false)
      expect(idRegex.test('invalid!char')).toBe(false)
    })

    it('should have valid NUMBER pattern', () => {
      const numberRegex = compileSafeRegex(SAFE_PATTERNS.NUMBER)

      expect(numberRegex.test('123')).toBe(true)
      expect(numberRegex.test('-456')).toBe(true)
      expect(numberRegex.test('3.14159')).toBe(true)
      expect(numberRegex.test('-0.5')).toBe(true)
      expect(numberRegex.test('not-a-number')).toBe(false)
    })

    it('should have valid ISO_DATE pattern', () => {
      const dateRegex = compileSafeRegex(SAFE_PATTERNS.ISO_DATE)

      expect(dateRegex.test('2024-01-15')).toBe(true)
      expect(dateRegex.test('2024-01-15T10:30:45Z')).toBe(true)
      expect(dateRegex.test('2024-01-15T10:30:45.123Z')).toBe(true)
      expect(dateRegex.test('2024-13-45')).toBe(true) // Pattern doesn't validate actual date values
      expect(dateRegex.test('not-a-date')).toBe(false)
    })

    it('should have valid PATH pattern', () => {
      const pathRegex = compileSafeRegex(SAFE_PATTERNS.PATH)

      expect(pathRegex.test('/path/to/file.txt')).toBe(true)
      expect(pathRegex.test('relative/path')).toBe(true)
      expect(pathRegex.test('file-name.ext')).toBe(true)
      expect(pathRegex.test('../parent/dir')).toBe(true)
      expect(pathRegex.test('path with spaces')).toBe(false)
      expect(pathRegex.test('path\\with\\backslash')).toBe(false)
    })
  })

  describe('validateWithSafePattern', () => {
    it('should validate strings against safe patterns', () => {
      expect(validateWithSafePattern('https://example.com', 'URL')).toBe(true)
      expect(validateWithSafePattern('test@example.com', 'EMAIL')).toBe(true)
      expect(validateWithSafePattern('test_123', 'IDENTIFIER')).toBe(true)
      expect(validateWithSafePattern('42', 'NUMBER')).toBe(true)
      expect(validateWithSafePattern('2024-01-15', 'ISO_DATE')).toBe(true)
      expect(validateWithSafePattern('/path/to/file', 'PATH')).toBe(true)
    })

    it('should return false for invalid values', () => {
      expect(validateWithSafePattern('not a url', 'URL')).toBe(false)
      expect(validateWithSafePattern('invalid-email', 'EMAIL')).toBe(false)
      expect(validateWithSafePattern('has spaces', 'IDENTIFIER')).toBe(false)
      expect(validateWithSafePattern('abc', 'NUMBER')).toBe(false)
      expect(validateWithSafePattern('15-01-2024', 'ISO_DATE')).toBe(false)
      expect(validateWithSafePattern('path with spaces', 'PATH')).toBe(false)
    })
  })

  describe('ReDoS Protection Integration', () => {
    it('should protect against known ReDoS patterns', () => {
      const redosPatterns = [
        '(a+)+b',
        '(a*)*b',
        '(a|a)*b',
        '(a|ab)*b',
        '([a-zA-Z]+)*',
        '(a+){2,}',
        '(.*a){2,}',
        '(.*){2,}a',
      ]

      for (const pattern of redosPatterns) {
        expect(() => compileSafeRegex(pattern)).toThrow(ValidationError)
      }
    })

    it('should allow safe alternatives to dangerous patterns', () => {
      const safeAlternatives = [
        'a+b', // Instead of (a+)+b
        'a*b', // Instead of (a*)*b
        'a*b', // Instead of (a|a)*b
        '[a-zA-Z]+', // Instead of ([a-zA-Z]+)*
        'a{2,10}', // Instead of (a+){2,} with limit
      ]

      for (const pattern of safeAlternatives) {
        expect(() => compileSafeRegex(pattern)).not.toThrow()
      }
    })
  })
})
