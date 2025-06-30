import { ProviderFactory, type ProviderType } from '../factory.js'
import { McpError, BaseErrorCode } from '../../utils/errors.js'

// Mock the config module
jest.mock('../../config/index.js', () => ({
  config: {
    apis: {
      openai: { apiKey: undefined },
      perplexity: { apiKey: undefined },
      grok: { apiKey: undefined }
    }
  }
}))

// Mock the provider classes
jest.mock('../openai.js', () => ({
  OpenAIProvider: jest.fn().mockImplementation((apiKey: string) => ({
    search: jest.fn(),
    browsePage: jest.fn(),
    _apiKey: apiKey
  }))
}))

jest.mock('../perplexity.js', () => ({
  PerplexityProvider: jest.fn().mockImplementation((apiKey: string) => ({
    search: jest.fn(),
    browsePage: jest.fn(),
    _apiKey: apiKey
  }))
}))

jest.mock('../grok.js', () => ({
  GrokProvider: jest.fn().mockImplementation((apiKey: string) => ({
    search: jest.fn(),
    browsePage: jest.fn(),
    _apiKey: apiKey
  }))
}))

// Import mocked classes for type checking
import { OpenAIProvider } from '../openai.js'
import { PerplexityProvider } from '../perplexity.js'
import { GrokProvider } from '../grok.js'
import { config } from '../../config/index.js'

const MockedOpenAIProvider = OpenAIProvider as jest.MockedClass<typeof OpenAIProvider>
const MockedPerplexityProvider = PerplexityProvider as jest.MockedClass<typeof PerplexityProvider>
const MockedGrokProvider = GrokProvider as jest.MockedClass<typeof GrokProvider>

// Extend global testUtils for this test file
declare global {
  var testUtils: {
    generateMockId: () => string;
    createMockProject: (overrides?: any) => any;
    createMockTask: (overrides?: any) => any;
    createMockKnowledge: (overrides?: any) => any;
  };
}

describe('ProviderFactory', () => {
  // Helper function to mock config APIs
  const mockConfig = (apiKeys: Partial<Record<'openai' | 'perplexity' | 'grok', string | undefined>>) => {
    const mockedConfig = config as jest.Mocked<typeof config>
    mockedConfig.apis.openai.apiKey = apiKeys.openai
    mockedConfig.apis.perplexity.apiKey = apiKeys.perplexity
    mockedConfig.apis.grok.apiKey = apiKeys.grok
  }

  beforeEach(() => {
    // Clear all instances before each test
    ProviderFactory.clearInstances()
    
    // Reset all mocks
    jest.clearAllMocks()
    
    // Reset config to no API keys
    mockConfig({})
  })

  describe('get()', () => {
    it('should create and return OpenAI provider when API key is configured', () => {
      mockConfig({ openai: 'sk-test-key-123' })

      const provider = ProviderFactory.get('openai')

      expect(MockedOpenAIProvider).toHaveBeenCalledWith('sk-test-key-123')
      expect(provider).toBeDefined()
      expect(provider._apiKey).toBe('sk-test-key-123')
    })

    it('should create and return Perplexity provider when API key is configured', () => {
      mockConfig({ perplexity: 'pplx-test-key-123' })

      const provider = ProviderFactory.get('perplexity')

      expect(MockedPerplexityProvider).toHaveBeenCalledWith('pplx-test-key-123')
      expect(provider).toBeDefined()
      expect(provider._apiKey).toBe('pplx-test-key-123')
    })

    it('should create and return Grok provider when API key is configured', () => {
      mockConfig({ grok: 'xai-test-key-123' })

      const provider = ProviderFactory.get('grok')

      expect(MockedGrokProvider).toHaveBeenCalledWith('xai-test-key-123')
      expect(provider).toBeDefined()
      expect(provider._apiKey).toBe('xai-test-key-123')
    })

    it('should return cached instance on subsequent calls', () => {
      mockConfig({ openai: 'sk-test-key-123' })

      const provider1 = ProviderFactory.get('openai')
      const provider2 = ProviderFactory.get('openai')

      expect(provider1).toBe(provider2)
      expect(MockedOpenAIProvider).toHaveBeenCalledTimes(1)
    })

    it('should throw error when OpenAI API key is not configured', () => {
      mockConfig({}) // No API keys

      expect(() => ProviderFactory.get('openai')).toThrow(
        new McpError(
          BaseErrorCode.INVALID_REQUEST,
          'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.'
        )
      )
    })

    it('should throw error when Perplexity API key is not configured', () => {
      mockConfig({}) // No API keys

      expect(() => ProviderFactory.get('perplexity')).toThrow(
        new McpError(
          BaseErrorCode.INVALID_REQUEST,
          'Perplexity API key not configured. Please set PERPLEXITY_API_KEY environment variable.'
        )
      )
    })

    it('should throw error when Grok API key is not configured', () => {
      mockConfig({}) // No API keys

      expect(() => ProviderFactory.get('grok')).toThrow(
        new McpError(
          BaseErrorCode.INVALID_REQUEST,
          'Grok API key not configured. Please set GROK_API_KEY environment variable.'
        )
      )
    })

    it('should throw error for unsupported provider type', () => {
      expect(() => ProviderFactory.get('invalid' as ProviderType)).toThrow(
        new McpError(
          BaseErrorCode.INVALID_REQUEST,
          'Unsupported provider: invalid. Supported providers: openai, perplexity, grok'
        )
      )
    })
  })

  describe('getAvailableProviders()', () => {
    it('should return empty array when no API keys are configured', () => {
      mockConfig({}) // No API keys

      const available = ProviderFactory.getAvailableProviders()

      expect(available).toEqual([])
    })

    it('should return only OpenAI when only OpenAI API key is configured', () => {
      mockConfig({ openai: 'sk-test-key-123' })

      const available = ProviderFactory.getAvailableProviders()

      expect(available).toEqual(['openai'])
    })

    it('should return only Perplexity when only Perplexity API key is configured', () => {
      mockConfig({ perplexity: 'pplx-test-key-123' })

      const available = ProviderFactory.getAvailableProviders()

      expect(available).toEqual(['perplexity'])
    })

    it('should return only Grok when only Grok API key is configured', () => {
      mockConfig({ grok: 'xai-test-key-123' })

      const available = ProviderFactory.getAvailableProviders()

      expect(available).toEqual(['grok'])
    })

    it('should return all providers when all API keys are configured', () => {
      mockConfig({
        openai: 'sk-test-key-123',
        perplexity: 'pplx-test-key-123',
        grok: 'xai-test-key-123'
      })

      const available = ProviderFactory.getAvailableProviders()

      expect(available).toEqual(['openai', 'perplexity', 'grok'])
    })

    it('should return subset when some API keys are configured', () => {
      mockConfig({
        openai: 'sk-test-key-123',
        grok: 'xai-test-key-123'
      })

      const available = ProviderFactory.getAvailableProviders()

      expect(available).toEqual(['openai', 'grok'])
    })
  })

  describe('isProviderAvailable()', () => {
    it('should return true when provider is available', () => {
      mockConfig({ openai: 'sk-test-key-123' })

      const isAvailable = ProviderFactory.isProviderAvailable('openai')

      expect(isAvailable).toBe(true)
    })

    it('should return false when provider is not available', () => {
      mockConfig({}) // No API keys

      const isAvailable = ProviderFactory.isProviderAvailable('openai')

      expect(isAvailable).toBe(false)
    })

    it('should work correctly for all provider types', () => {
      mockConfig({
        openai: 'sk-test-key-123',
        perplexity: 'pplx-test-key-123'
        // grok not configured
      })

      expect(ProviderFactory.isProviderAvailable('openai')).toBe(true)
      expect(ProviderFactory.isProviderAvailable('perplexity')).toBe(true)
      expect(ProviderFactory.isProviderAvailable('grok')).toBe(false)
    })
  })

  describe('clearInstances()', () => {
    it('should clear cached instances', () => {
      mockConfig({ openai: 'sk-test-key-123' })

      // Create an instance
      const provider1 = ProviderFactory.get('openai')
      expect(MockedOpenAIProvider).toHaveBeenCalledTimes(1)

      // Clear instances
      ProviderFactory.clearInstances()

      // Create another instance - should create new one
      const provider2 = ProviderFactory.get('openai')
      expect(MockedOpenAIProvider).toHaveBeenCalledTimes(2)
      expect(provider1).not.toBe(provider2)
    })

    it('should not affect provider creation after clearing', () => {
      mockConfig({ perplexity: 'pplx-test-key-123' })

      // Create and clear
      ProviderFactory.get('perplexity')
      ProviderFactory.clearInstances()

      // Should still be able to create new instances
      const provider = ProviderFactory.get('perplexity')
      expect(provider).toBeDefined()
      expect(MockedPerplexityProvider).toHaveBeenCalledTimes(2)
    })
  })

  describe('getDefaultProvider()', () => {
    it('should return openai as default when available (highest priority)', () => {
      mockConfig({
        openai: 'sk-test-key-123',
        perplexity: 'pplx-test-key-123',
        grok: 'xai-test-key-123'
      })

      const defaultProvider = ProviderFactory.getDefaultProvider()

      expect(defaultProvider).toBe('openai')
    })

    it('should return perplexity when openai is not available', () => {
      mockConfig({
        perplexity: 'pplx-test-key-123',
        grok: 'xai-test-key-123'
      })

      const defaultProvider = ProviderFactory.getDefaultProvider()

      expect(defaultProvider).toBe('perplexity')
    })

    it('should return grok when only grok is available', () => {
      mockConfig({
        grok: 'xai-test-key-123'
      })

      const defaultProvider = ProviderFactory.getDefaultProvider()

      expect(defaultProvider).toBe('grok')
    })

    it('should throw error when no providers are available', () => {
      mockConfig({}) // No API keys

      expect(() => ProviderFactory.getDefaultProvider()).toThrow(
        new McpError(
          BaseErrorCode.INVALID_REQUEST,
          'No deep research providers are configured. Please set at least one API key: OPENAI_API_KEY, PERPLEXITY_API_KEY, or GROK_API_KEY'
        )
      )
    })

    it('should respect provider priority order', () => {
      // Test perplexity over grok
      mockConfig({
        perplexity: 'pplx-test-key-123',
        grok: 'xai-test-key-123'
      })
      expect(ProviderFactory.getDefaultProvider()).toBe('perplexity')

      // Clear and test openai over others
      ProviderFactory.clearInstances()
      mockConfig({
        openai: 'sk-test-key-123',
        grok: 'xai-test-key-123'
      })
      expect(ProviderFactory.getDefaultProvider()).toBe('openai')
    })
  })

  describe('integration scenarios', () => {
    it('should handle dynamic configuration changes', () => {
      // Start with one provider
      mockConfig({ openai: 'sk-test-key-123' })
      expect(ProviderFactory.getAvailableProviders()).toEqual(['openai'])

      // Add another provider
      mockConfig({
        openai: 'sk-test-key-123',
        perplexity: 'pplx-test-key-123'
      })
      expect(ProviderFactory.getAvailableProviders()).toEqual(['openai', 'perplexity'])

      // Remove first provider
      mockConfig({ perplexity: 'pplx-test-key-123' })
      expect(ProviderFactory.getAvailableProviders()).toEqual(['perplexity'])
    })

    it('should handle provider creation and caching correctly', () => {
      mockConfig({
        openai: 'sk-test-key-123',
        perplexity: 'pplx-test-key-123'
      })

      // Create different providers
      const openaiProvider1 = ProviderFactory.get('openai')
      const perplexityProvider1 = ProviderFactory.get('perplexity')
      
      // Get same providers again - should return cached
      const openaiProvider2 = ProviderFactory.get('openai')
      const perplexityProvider2 = ProviderFactory.get('perplexity')

      expect(openaiProvider1).toBe(openaiProvider2)
      expect(perplexityProvider1).toBe(perplexityProvider2)
      expect(openaiProvider1).not.toBe(perplexityProvider1)

      expect(MockedOpenAIProvider).toHaveBeenCalledTimes(1)
      expect(MockedPerplexityProvider).toHaveBeenCalledTimes(1)
    })

    it('should maintain separate instances for different providers', () => {
      mockConfig({
        openai: 'sk-test-key-123',
        perplexity: 'pplx-test-key-123',
        grok: 'xai-test-key-123'
      })

      const openaiProvider = ProviderFactory.get('openai')
      const perplexityProvider = ProviderFactory.get('perplexity')
      const grokProvider = ProviderFactory.get('grok')

      expect(openaiProvider).not.toBe(perplexityProvider)
      expect(perplexityProvider).not.toBe(grokProvider)
      expect(openaiProvider).not.toBe(grokProvider)

      expect(MockedOpenAIProvider).toHaveBeenCalledTimes(1)
      expect(MockedPerplexityProvider).toHaveBeenCalledTimes(1)
      expect(MockedGrokProvider).toHaveBeenCalledTimes(1)
    })
  })
})