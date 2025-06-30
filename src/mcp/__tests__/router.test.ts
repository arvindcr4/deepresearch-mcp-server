/// <reference types="jest" />

// Mock dependencies
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

const mockConfig = {
  apiKeys: {
    openai: 'test-openai-key',
    perplexity: 'test-perplexity-key',
    xaiGrok: 'test-grok-key',
  },
  apis: {
    firecrawl: {
      apiKey: 'test-firecrawl-key',
    },
    agentspace: {
      apiKey: 'test-agentspace-key',
      baseUrl: 'https://api.agentspace.com',
    },
  },
}

const mockValidateArgs = jest.fn()

// Mock provider classes
class MockOpenAIProvider {
  constructor(apiKey: string) {}
  async search(query: string, options?: any) {
    return {
      query,
      results: [{ title: 'OpenAI Result', url: 'https://example.com', snippet: 'Test snippet' }],
      metadata: { provider: 'OpenAI' },
    }
  }
  async browsePage(url: string, options?: any) {
    return { url, content: 'Page content', metadata: { provider: 'OpenAI' } }
  }
}

class MockPerplexityProvider {
  constructor(apiKey: string) {}
  async search(query: string, options?: any) {
    return {
      query,
      results: [{ title: 'Perplexity Result', url: 'https://example.com', snippet: 'Test snippet' }],
      metadata: { provider: 'Perplexity' },
    }
  }
}

class MockGrokProvider {
  constructor(apiKey: string) {}
  async search(query: string, options?: any) {
    return {
      query,
      results: [{ title: 'Grok Result', url: 'https://example.com', snippet: 'Test snippet' }],
      metadata: { provider: 'Grok' },
    }
  }
  async browsePage(url: string, options?: any) {
    return { url, content: 'Page content', metadata: { provider: 'Grok' } }
  }
}

class MockFirecrawlProvider {
  constructor(apiKey: string) {}
  async search(query: string, options?: any) {
    return {
      query,
      results: [{ title: 'Firecrawl Result', url: 'https://example.com', snippet: 'Test snippet' }],
      metadata: { provider: 'Firecrawl' },
    }
  }
}

class MockAgentspaceProvider {
  constructor(apiKey: string, baseUrl?: string) {}
  async search(query: string, options?: any) {
    return {
      query,
      results: [{ title: 'Agentspace Result', url: 'https://example.com', snippet: 'Test snippet' }],
      metadata: { provider: 'Agentspace' },
    }
  }
}

class MockUnifiedDeepResearchTool {
  static getToolDefinition() {
    return {
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          providers: { type: 'array' },
        },
        required: ['query'],
      },
    }
  }
  
  async execute(args: any) {
    return {
      query: args.query,
      results: [{ title: 'Unified Result', url: 'https://example.com', snippet: 'Test snippet' }],
      metadata: { provider: 'Unified' },
    }
  }
}

const mockMcpError = jest.fn()

// Mock the imports
jest.mock('../../config/index.ts', () => ({
  config: mockConfig,
}))

jest.mock('../../utils/logger.ts', () => ({
  logger: mockLogger,
}))

jest.mock('../../utils/errors.ts', () => ({
  McpError: mockMcpError,
  BaseErrorCode: {
    INVALID_REQUEST: 'INVALID_REQUEST',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },
}))

jest.mock('../../providers/openai.ts', () => ({
  OpenAIProvider: MockOpenAIProvider,
}))

jest.mock('../../providers/perplexity.ts', () => ({
  PerplexityProvider: MockPerplexityProvider,
}))

jest.mock('../../providers/grok.ts', () => ({
  GrokProvider: MockGrokProvider,
}))

jest.mock('../../providers/firecrawl.ts', () => ({
  FirecrawlProvider: MockFirecrawlProvider,
}))

jest.mock('../../providers/agentspace.ts', () => ({
  AgentspaceProvider: MockAgentspaceProvider,
}))

jest.mock('../tools/deep-research-unified.ts', () => ({
  UnifiedDeepResearchTool: MockUnifiedDeepResearchTool,
}))

jest.mock('../../schemas/validation.ts', () => ({
  openAIResearchArgsSchema: {},
  perplexitySonarArgsSchema: {},
  grok3ArgsSchema: {},
  validateArgs: mockValidateArgs,
}))

import { DeepResearchRouter } from '../router'

describe('DeepResearchRouter', () => {
  let router: DeepResearchRouter

  beforeEach(() => {
    jest.clearAllMocks()
    mockValidateArgs.mockReturnValue({ query: 'test query', options: {} })
  })

  describe('Constructor and Provider Initialization', () => {
    it('should initialize all providers when API keys are available', () => {
      router = new DeepResearchRouter()

      expect(mockLogger.info).toHaveBeenCalledWith('OpenAI provider initialized')
      expect(mockLogger.info).toHaveBeenCalledWith('Perplexity provider initialized')
      expect(mockLogger.info).toHaveBeenCalledWith('Grok provider initialized')
      expect(mockLogger.info).toHaveBeenCalledWith('Firecrawl provider initialized')
      expect(mockLogger.info).toHaveBeenCalledWith('Agentspace Google Deep Research provider initialized')
    })

    it('should warn when no providers are initialized', () => {
      // Mock empty config
      const originalConfig = { ...mockConfig }
      Object.assign(mockConfig.apiKeys, { openai: undefined, perplexity: undefined, xaiGrok: undefined })
      Object.assign(mockConfig.apis, { firecrawl: undefined, agentspace: undefined })

      router = new DeepResearchRouter()

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No providers initialized - check API key configuration'
      )

      // Restore original config
      Object.assign(mockConfig, originalConfig)
    })

    it('should handle provider initialization errors', () => {
      // Mock an error during provider initialization
      jest.mocked(MockOpenAIProvider).mockImplementationOnce(() => {
        throw new Error('Provider initialization failed')
      })

      expect(() => new DeepResearchRouter()).toThrow()
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('listTools', () => {
    beforeEach(() => {
      router = new DeepResearchRouter()
    })

    it('should return all available tools', async () => {
      const result = await router.listTools()

      expect(result.tools).toHaveLength(4)
      expect(result.tools.map(t => t.name)).toEqual([
        'deep-research-unified',
        'openai-deep-research',
        'perplexity-sonar',
        'grok3',
      ])
    })

    it('should include proper tool schemas', async () => {
      const result = await router.listTools()

      const unifiedTool = result.tools.find(t => t.name === 'deep-research-unified')
      expect(unifiedTool?.inputSchema).toEqual({
        type: 'object',
        properties: {
          query: { type: 'string' },
          providers: { type: 'array' },
        },
        required: ['query'],
      })

      const openaiTool = result.tools.find(t => t.name === 'openai-deep-research')
      expect(openaiTool?.inputSchema.properties.query).toEqual({
        type: 'string',
        description: 'The research query to search for',
        minLength: 1,
        maxLength: 1000,
      })
    })
  })

  describe('callTool', () => {
    beforeEach(() => {
      router = new DeepResearchRouter()
    })

    it('should handle deep-research-unified tool', async () => {
      const request = {
        params: {
          name: 'deep-research-unified',
          arguments: { query: 'test query', providers: ['openai'] },
        },
      }

      const result = await router.callTool(request)

      expect(result.content).toHaveLength(1)
      expect(result.content[0].type).toBe('text')
      expect(JSON.parse(result.content[0].text)).toEqual({
        query: 'test query',
        results: [{ title: 'Unified Result', url: 'https://example.com', snippet: 'Test snippet' }],
        metadata: { provider: 'Unified' },
      })
    })

    it('should handle openai-deep-research tool', async () => {
      const request = {
        params: {
          name: 'openai-deep-research',
          arguments: { query: 'test query' },
        },
      }

      const result = await router.callTool(request)

      expect(result.content).toHaveLength(1)
      expect(result.content[0].type).toBe('text')
      expect(JSON.parse(result.content[0].text)).toEqual({
        query: 'test query',
        results: [{ title: 'OpenAI Result', url: 'https://example.com', snippet: 'Test snippet' }],
        metadata: { provider: 'OpenAI' },
      })
    })

    it('should handle openai-deep-research with page browsing', async () => {
      const request = {
        params: {
          name: 'openai-deep-research',
          arguments: { query: 'test query', options: { browsePage: 'https://example.com' } },
        },
      }

      mockValidateArgs.mockReturnValue({
        query: 'test query',
        options: { browsePage: 'https://example.com' },
      })

      const result = await router.callTool(request)

      expect(result.content).toHaveLength(1)
      const parsedResult = JSON.parse(result.content[0].text)
      expect(parsedResult.searchResults).toBeDefined()
      expect(parsedResult.pageContent).toBeDefined()
    })

    it('should handle perplexity-sonar tool', async () => {
      const request = {
        params: {
          name: 'perplexity-sonar',
          arguments: { query: 'test query' },
        },
      }

      const result = await router.callTool(request)

      expect(result.content).toHaveLength(1)
      expect(JSON.parse(result.content[0].text)).toEqual({
        query: 'test query',
        results: [{ title: 'Perplexity Result', url: 'https://example.com', snippet: 'Test snippet' }],
        metadata: { provider: 'Perplexity' },
      })
    })

    it('should handle grok3 tool', async () => {
      const request = {
        params: {
          name: 'grok3',
          arguments: { query: 'test query' },
        },
      }

      const result = await router.callTool(request)

      expect(result.content).toHaveLength(1)
      expect(JSON.parse(result.content[0].text)).toEqual({
        query: 'test query',
        results: [{ title: 'Grok Result', url: 'https://example.com', snippet: 'Test snippet' }],
        metadata: { provider: 'Grok' },
      })
    })

    it('should handle grok3 with page browsing', async () => {
      const request = {
        params: {
          name: 'grok3',
          arguments: { query: 'test query', options: { browsePage: 'https://example.com' } },
        },
      }

      mockValidateArgs.mockReturnValue({
        query: 'test query',
        options: { browsePage: 'https://example.com' },
      })

      const result = await router.callTool(request)

      expect(result.content).toHaveLength(1)
      const parsedResult = JSON.parse(result.content[0].text)
      expect(parsedResult.searchResults).toBeDefined()
      expect(parsedResult.pageContent).toBeDefined()
    })

    it('should throw error for unknown tool', async () => {
      const request = {
        params: {
          name: 'unknown-tool',
          arguments: { query: 'test query' },
        },
      }

      await expect(router.callTool(request)).rejects.toThrow()
    })

    it('should handle provider not available error', async () => {
      // Create router with no providers
      const originalConfig = { ...mockConfig }
      Object.assign(mockConfig.apiKeys, { openai: undefined, perplexity: undefined, xaiGrok: undefined })
      Object.assign(mockConfig.apis, { firecrawl: undefined, agentspace: undefined })
      
      const emptyRouter = new DeepResearchRouter()

      const request = {
        params: {
          name: 'openai-deep-research',
          arguments: { query: 'test query' },
        },
      }

      await expect(emptyRouter.callTool(request)).rejects.toThrow()

      // Restore config
      Object.assign(mockConfig, originalConfig)
    })

    it('should handle validation errors', async () => {
      const request = {
        params: {
          name: 'openai-deep-research',
          arguments: { invalid: 'args' },
        },
      }

      mockValidateArgs.mockImplementationOnce(() => {
        throw new Error('Validation failed')
      })

      await expect(router.callTool(request)).rejects.toThrow()
    })

    it('should handle tool execution errors', async () => {
      const request = {
        params: {
          name: 'openai-deep-research',
          arguments: { query: 'test query' },
        },
      }

      // Mock provider to throw error
      jest.mocked(MockOpenAIProvider.prototype.search).mockRejectedValueOnce(
        new Error('Provider error')
      )

      await expect(router.callTool(request)).rejects.toThrow()
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      router = new DeepResearchRouter()
    })

    it('should log and rethrow McpErrors', async () => {
      const mcpError = new Error('MCP Error')
      Object.defineProperty(mcpError, 'name', { value: 'McpError' })
      
      jest.mocked(MockUnifiedDeepResearchTool.prototype.execute).mockRejectedValueOnce(mcpError)

      const request = {
        params: {
          name: 'deep-research-unified',
          arguments: { query: 'test query' },
        },
      }

      await expect(router.callTool(request)).rejects.toThrow('MCP Error')
      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('should wrap non-McpErrors in McpError', async () => {
      jest.mocked(MockUnifiedDeepResearchTool.prototype.execute).mockRejectedValueOnce(
        new Error('Generic error')
      )

      const request = {
        params: {
          name: 'deep-research-unified',
          arguments: { query: 'test query' },
        },
      }

      await expect(router.callTool(request)).rejects.toThrow()
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('Argument Validation', () => {
    beforeEach(() => {
      router = new DeepResearchRouter()
    })

    it('should validate OpenAI research arguments', async () => {
      const request = {
        params: {
          name: 'openai-deep-research',
          arguments: { query: 'test query', options: { maxResults: 5 } },
        },
      }

      await router.callTool(request)

      expect(mockValidateArgs).toHaveBeenCalledWith(
        {}, // openAIResearchArgsSchema mock
        { query: 'test query', options: { maxResults: 5 } },
        'openai-deep-research'
      )
    })

    it('should validate Perplexity arguments', async () => {
      const request = {
        params: {
          name: 'perplexity-sonar',
          arguments: { query: 'test query', options: { recency: 'week' } },
        },
      }

      await router.callTool(request)

      expect(mockValidateArgs).toHaveBeenCalledWith(
        {}, // perplexitySonarArgsSchema mock
        { query: 'test query', options: { recency: 'week' } },
        'perplexity-sonar'
      )
    })

    it('should validate Grok arguments', async () => {
      const request = {
        params: {
          name: 'grok3',
          arguments: { query: 'test query', options: { maxResults: 15 } },
        },
      }

      await router.callTool(request)

      expect(mockValidateArgs).toHaveBeenCalledWith(
        {}, // grok3ArgsSchema mock
        { query: 'test query', options: { maxResults: 15 } },
        'grok3'
      )
    })
  })
})