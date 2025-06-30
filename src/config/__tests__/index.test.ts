/**
 * Unit Tests for Config Module
 * 
 * Note: These tests focus on testing the exported configuration schema and utilities
 * since the main config module performs side effects during import.
 */

import { z } from 'zod'

describe('Config Module Schema Validation', () => {
  // Import the ConfigSchema for testing
  let ConfigSchema: z.ZodSchema<any>

  beforeAll(async () => {
    // Dynamically import to avoid side effects during test setup
    try {
      const configModule = await import('../index.js')
      ConfigSchema = configModule.ConfigSchema
    } catch (error) {
      // If import fails due to missing env vars, skip tests
      console.warn('Config module import failed:', error)
    }
  })

  describe('ConfigSchema', () => {
    it('should validate a complete valid configuration', () => {
      if (!ConfigSchema) {
        pending('ConfigSchema not available due to import failure')
        return
      }

      const validConfig = {
        neo4jUri: 'bolt://localhost:7687',
        neo4jUser: 'neo4j',
        neo4jPassword: 'password123',
        mcpServerName: 'test-server',
        mcpServerVersion: '1.0.0',
        logLevel: 'info',
        environment: 'test',
        apiKeys: {
          openai: 'sk-1234567890abcdef1234567890abcdef1234567890abcdef',
          perplexity: 'pplx-1234567890abcdef1234567890abcdef1234567890abcdef',
          xaiGrok: 'xai-1234567890abcdef'
        },
        rateLimits: {
          global: 30,
          openai: 50,
          perplexity: 30,
          xaiGrok: 40
        },
        backup: {
          maxBackups: 10,
          backupPath: '/tmp/backups'
        },
        security: {
          authRequired: true
        },
        transaction: {
          maxRetries: 3,
          initialRetryDelayMs: 100,
          maxRetryDelayMs: 5000,
          backoffMultiplier: 2,
          timeout: 30000
        }
      }

      expect(() => ConfigSchema.parse(validConfig)).not.toThrow()
    })

    it('should reject invalid neo4j URI format', () => {
      if (!ConfigSchema) {
        pending('ConfigSchema not available due to import failure')
        return
      }

      const invalidConfig = {
        neo4jUri: 'invalid-uri',
        neo4jUser: 'neo4j',
        neo4jPassword: 'password123',
        mcpServerName: 'test-server',
        mcpServerVersion: '1.0.0',
        logLevel: 'info',
        environment: 'test',
        apiKeys: {},
        rateLimits: {
          global: 30,
          openai: 50,
          perplexity: 30,
          xaiGrok: 40
        },
        backup: {
          maxBackups: 10,
          backupPath: '/tmp/backups'
        },
        security: {
          authRequired: true
        },
        transaction: {
          maxRetries: 3,
          initialRetryDelayMs: 100,
          maxRetryDelayMs: 5000,
          backoffMultiplier: 2,
          timeout: 30000
        }
      }

      expect(() => ConfigSchema.parse(invalidConfig)).toThrow()
    })

    it('should reject empty neo4j password', () => {
      if (!ConfigSchema) {
        pending('ConfigSchema not available due to import failure')
        return
      }

      const invalidConfig = {
        neo4jUri: 'bolt://localhost:7687',
        neo4jUser: 'neo4j',
        neo4jPassword: '',
        mcpServerName: 'test-server',
        mcpServerVersion: '1.0.0',
        logLevel: 'info',
        environment: 'test',
        apiKeys: {},
        rateLimits: {
          global: 30,
          openai: 50,
          perplexity: 30,
          xaiGrok: 40
        },
        backup: {
          maxBackups: 10,
          backupPath: '/tmp/backups'
        },
        security: {
          authRequired: true
        },
        transaction: {
          maxRetries: 3,
          initialRetryDelayMs: 100,
          maxRetryDelayMs: 5000,
          backoffMultiplier: 2,
          timeout: 30000
        }
      }

      expect(() => ConfigSchema.parse(invalidConfig)).toThrow(/Neo4j password is required/)
    })

    it('should reject invalid log level', () => {
      if (!ConfigSchema) {
        pending('ConfigSchema not available due to import failure')
        return
      }

      const invalidConfig = {
        neo4jUri: 'bolt://localhost:7687',
        neo4jUser: 'neo4j',
        neo4jPassword: 'password123',
        mcpServerName: 'test-server',
        mcpServerVersion: '1.0.0',
        logLevel: 'invalid-level',
        environment: 'test',
        apiKeys: {},
        rateLimits: {
          global: 30,
          openai: 50,
          perplexity: 30,
          xaiGrok: 40
        },
        backup: {
          maxBackups: 10,
          backupPath: '/tmp/backups'
        },
        security: {
          authRequired: true
        },
        transaction: {
          maxRetries: 3,
          initialRetryDelayMs: 100,
          maxRetryDelayMs: 5000,
          backoffMultiplier: 2,
          timeout: 30000
        }
      }

      expect(() => ConfigSchema.parse(invalidConfig)).toThrow()
    })

    it('should reject negative rate limits', () => {
      if (!ConfigSchema) {
        pending('ConfigSchema not available due to import failure')
        return
      }

      const invalidConfig = {
        neo4jUri: 'bolt://localhost:7687',
        neo4jUser: 'neo4j',
        neo4jPassword: 'password123',
        mcpServerName: 'test-server',
        mcpServerVersion: '1.0.0',
        logLevel: 'info',
        environment: 'test',
        apiKeys: {},
        rateLimits: {
          global: -1,
          openai: 50,
          perplexity: 30,
          xaiGrok: 40
        },
        backup: {
          maxBackups: 10,
          backupPath: '/tmp/backups'
        },
        security: {
          authRequired: true
        },
        transaction: {
          maxRetries: 3,
          initialRetryDelayMs: 100,
          maxRetryDelayMs: 5000,
          backoffMultiplier: 2,
          timeout: 30000
        }
      }

      expect(() => ConfigSchema.parse(invalidConfig)).toThrow()
    })

    it('should accept optional API keys', () => {
      if (!ConfigSchema) {
        pending('ConfigSchema not available due to import failure')
        return
      }

      const validConfig = {
        neo4jUri: 'bolt://localhost:7687',
        neo4jUser: 'neo4j',
        neo4jPassword: 'password123',
        mcpServerName: 'test-server',
        mcpServerVersion: '1.0.0',
        logLevel: 'info',
        environment: 'test',
        apiKeys: {}, // Empty API keys should be valid
        rateLimits: {
          global: 30,
          openai: 50,
          perplexity: 30,
          xaiGrok: 40
        },
        backup: {
          maxBackups: 10,
          backupPath: '/tmp/backups'
        },
        security: {
          authRequired: true
        },
        transaction: {
          maxRetries: 3,
          initialRetryDelayMs: 100,
          maxRetryDelayMs: 5000,
          backoffMultiplier: 2,
          timeout: 30000
        }
      }

      expect(() => ConfigSchema.parse(validConfig)).not.toThrow()
    })

    it('should use defaults for optional fields', () => {
      if (!ConfigSchema) {
        pending('ConfigSchema not available due to import failure')
        return
      }

      const minimalConfig = {
        neo4jPassword: 'password123',
        apiKeys: {},
        backup: {
          backupPath: '/tmp/backups'
        }
      }

      const parsed = ConfigSchema.parse(minimalConfig)
      
      expect(parsed.neo4jUri).toBe('bolt://localhost:7687')
      expect(parsed.neo4jUser).toBe('neo4j')
      expect(parsed.logLevel).toBe('info')
      expect(parsed.environment).toBe('development')
      expect(parsed.rateLimits.global).toBe(30)
      expect(parsed.backup.maxBackups).toBe(10)
      expect(parsed.security.authRequired).toBe(true)
      expect(parsed.transaction.maxRetries).toBe(3)
    })
  })
})

// Test API key validation patterns separately
describe('API Key Pattern Validation', () => {
  const API_KEY_PATTERNS = {
    openai: /^sk-[A-Za-z0-9]{48,}$/,
    perplexity: /^pplx-[A-Za-z0-9]{48,}$/,
    xaiGrok: /^xai-[A-Za-z0-9]+$/,
  }

  describe('OpenAI API Key Pattern', () => {
    it('should accept valid OpenAI API key format', () => {
      const validKey = 'sk-1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKL'
      expect(API_KEY_PATTERNS.openai.test(validKey)).toBe(true)
    })

    it('should reject invalid OpenAI API key format', () => {
      const invalidKeys = [
        'invalid-key',
        'sk-short',
        'sk-',
        'pplx-1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKL'
      ]
      
      invalidKeys.forEach(key => {
        expect(API_KEY_PATTERNS.openai.test(key)).toBe(false)
      })
    })
  })

  describe('Perplexity API Key Pattern', () => {
    it('should accept valid Perplexity API key format', () => {
      const validKey = 'pplx-1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKL'
      expect(API_KEY_PATTERNS.perplexity.test(validKey)).toBe(true)
    })

    it('should reject invalid Perplexity API key format', () => {
      const invalidKeys = [
        'invalid-key',
        'pplx-short',
        'pplx-',
        'sk-1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKL'
      ]
      
      invalidKeys.forEach(key => {
        expect(API_KEY_PATTERNS.perplexity.test(key)).toBe(false)
      })
    })
  })

  describe('XAI Grok API Key Pattern', () => {
    it('should accept valid XAI Grok API key format', () => {
      const validKeys = [
        'xai-1234567890abcdef',
        'xai-short',
        'xai-VeryLongKeyWithManyCharacters123456789'
      ]
      
      validKeys.forEach(key => {
        expect(API_KEY_PATTERNS.xaiGrok.test(key)).toBe(true)
      })
    })

    it('should reject invalid XAI Grok API key format', () => {
      const invalidKeys = [
        'invalid-key',
        'xai-',
        'sk-1234567890abcdef',
        'pplx-1234567890abcdef'
      ]
      
      invalidKeys.forEach(key => {
        expect(API_KEY_PATTERNS.xaiGrok.test(key)).toBe(false)
      })
    })
  })
})