import { describe, it, expect } from '@jest/globals'
import { redactString, redactObject } from '../secureLogger.js'

describe('SecureLogger', () => {
  describe('redactString', () => {
    it('should redact Bearer tokens', () => {
      const input = 'Authorization: Bearer sk-proj-1234567890abcdef'
      const result = redactString(input)
      expect(result).toBe('Authorization: Bearer [REDACTED]')
    })

    it('should redact API keys', () => {
      const input = 'api_key=sk-1234567890abcdef'
      const result = redactString(input)
      expect(result).toBe('api_key=[REDACTED]')
    })

    it('should redact passwords', () => {
      const input = 'password: mysecretpassword123'
      const result = redactString(input)
      expect(result).toBe('password: [REDACTED]')
    })

    it('should redact Neo4j connection strings', () => {
      const input = 'bolt://neo4j:password@localhost:7687'
      const result = redactString(input)
      expect(result).toBe('bolt://[REDACTED]')
    })

    it('should redact environment variables', () => {
      const input = 'OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx'
      const result = redactString(input)
      expect(result).toBe('OPENAI_API_KEY=[REDACTED]')
    })

    it('should handle multiple sensitive values', () => {
      const input = 'api_key=sk-123 and token=pplx-456 with password=secret'
      const result = redactString(input)
      expect(result).toBe(
        'api_key=[REDACTED] and token=[REDACTED] with password=[REDACTED]'
      )
    })

    it('should preserve non-sensitive content', () => {
      const input = 'This is a normal log message'
      const result = redactString(input)
      expect(result).toBe('This is a normal log message')
    })
  })

  describe('redactObject', () => {
    it('should redact sensitive fields', () => {
      const input = {
        apiKey: 'sk-1234567890',
        password: 'secret123',
        normalField: 'visible',
      }
      const result = redactObject(input)
      expect(result).toEqual({
        apiKey: '[REDACTED]',
        password: '[REDACTED]',
        normalField: 'visible',
      })
    })

    it('should redact nested objects', () => {
      const input = {
        config: {
          apiKeys: {
            openai: 'sk-12345',
            perplexity: 'pplx-67890',
          },
          safe: 'value',
        },
      }
      const result = redactObject(input)
      expect(result).toEqual({
        config: {
          apiKeys: '[REDACTED]',
          safe: 'value',
        },
      })
    })

    it('should handle arrays', () => {
      const input = {
        tokens: ['sk-123', 'pplx-456'],
        numbers: [1, 2, 3],
      }
      const result = redactObject(input)
      expect(result).toEqual({
        tokens: '[REDACTED]',
        numbers: [1, 2, 3],
      })
    })

    it('should redact Error objects', () => {
      const error = new Error('Failed with api_key=sk-12345')
      error.stack = 'at function (api_key=sk-12345)'
      const result = redactObject(error)
      expect(result.message).toBe('Failed with api_key=[REDACTED]')
      expect(result.stack).toContain('api_key=[REDACTED]')
    })

    it('should handle circular references', () => {
      const obj: any = { a: 1 }
      obj.circular = obj
      // Should not throw
      expect(() => redactObject(obj)).not.toThrow()
    })

    it('should redact strings within objects', () => {
      const input = {
        message: 'Using Bearer sk-1234567890',
        details: {
          url: 'https://user:password@example.com',
        },
      }
      const result = redactObject(input)
      expect(result.message).toBe('Using Bearer [REDACTED]')
      expect(result.details.url).toBe('https://[REDACTED]')
    })
  })
})
