/**
 * Unit Tests for Unified Deep Research Tool
 */

// Mock dependencies
jest.mock('../../../providers/openai.js');
jest.mock('../../../providers/perplexity.js');
jest.mock('../../../providers/grok.js');
jest.mock('../../../config/index.js');
jest.mock('../../../utils/logger.js');
jest.mock('../../../utils/errors.js');
jest.mock('../../../middleware/validation.js');

import { UnifiedDeepResearchTool } from '../deep-research-unified.js';
import { OpenAIProvider } from '../../../providers/openai.js';
import { PerplexityProvider } from '../../../providers/perplexity.js';
import { GrokProvider } from '../../../providers/grok.js';
import { config } from '../../../config/index.js';
import { logger } from '../../../utils/logger.js';
import { McpError, BaseErrorCode } from '../../../utils/errors.js';
import { ZodValidator } from '../../../middleware/validation.js';

// Mock implementations
const mockOpenAIProvider = {
  search: jest.fn(),
  browsePage: jest.fn(),
};

const mockPerplexityProvider = {
  search: jest.fn(),
  browsePage: jest.fn(),
};

const mockGrokProvider = {
  search: jest.fn(),
  browsePage: jest.fn(),
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
};

const mockConfig = {
  apis: {
    openai: {
      apiKey: 'test-openai-key',
    },
  },
  apiKeys: {
    perplexity: 'test-perplexity-key',
    xaiGrok: 'test-grok-key',
  },
};

// Mock constructors
(OpenAIProvider as jest.MockedClass<typeof OpenAIProvider>).mockImplementation(() => mockOpenAIProvider as any);
(PerplexityProvider as jest.MockedClass<typeof PerplexityProvider>).mockImplementation(() => mockPerplexityProvider as any);
(GrokProvider as jest.MockedClass<typeof GrokProvider>).mockImplementation(() => mockGrokProvider as any);

// Mock ZodValidator
const mockZodValidator = {
  validateDeepResearchQuery: jest.fn(),
  validateDeepResearchResponse: jest.fn(),
};

(ZodValidator as any) = mockZodValidator;

describe('UnifiedDeepResearchTool', () => {
  let tool: UnifiedDeepResearchTool;

  beforeEach(() => {
    jest.clearAllMocks();
    (config as any) = mockConfig;
    (logger as any) = mockLogger;
    
    // Reset ZodValidator mock
    mockZodValidator.validateDeepResearchQuery.mockImplementation((args) => args);
    mockZodValidator.validateDeepResearchResponse.mockImplementation((response) => response);
  });

  describe('constructor', () => {
    it('should initialize with all available providers', () => {
      tool = new UnifiedDeepResearchTool();
      
      expect(OpenAIProvider).toHaveBeenCalledWith('test-openai-key');
      expect(PerplexityProvider).toHaveBeenCalledWith('test-perplexity-key');
      expect(GrokProvider).toHaveBeenCalledWith('test-grok-key');
      expect(tool.getAvailableProviders()).toHaveLength(3);
      expect(tool.getAvailableProviders()).toEqual(['openai', 'perplexity', 'grok']);
    });

    it('should initialize with only OpenAI when other providers are not configured', () => {
      (config as any) = {
        apis: {
          openai: {
            apiKey: 'test-openai-key',
          },
        },
        apiKeys: {},
      };
      
      tool = new UnifiedDeepResearchTool();
      
      expect(tool.getAvailableProviders()).toEqual(['openai']);
    });

    it('should throw error when no providers are configured', () => {
      (config as any) = {
        apis: {},
        apiKeys: {},
      };
      
      expect(() => new UnifiedDeepResearchTool()).toThrow(McpError);
      expect(() => new UnifiedDeepResearchTool()).toThrow('No research providers configured');
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      tool = new UnifiedDeepResearchTool();
    });

    it('should execute successfully with OpenAI provider', async () => {
      const mockQuery = {
        query: 'test query',
        provider: 'openai',
        maxResults: 10,
      };

      const mockSearchResults = {
        query: 'test query',
        results: [
          {
            title: 'Test Result',
            url: 'https://example.com',
            snippet: 'Test snippet',
            relevanceScore: 0.9,
            source: 'OpenAI',
          },
        ],
        metadata: {
          totalResults: 1,
          provider: 'OpenAI',
        },
      };

      mockZodValidator.validateDeepResearchQuery.mockReturnValue(mockQuery);
      mockOpenAIProvider.search.mockResolvedValue(mockSearchResults);

      const result = await tool.execute(mockQuery);

      expect(mockZodValidator.validateDeepResearchQuery).toHaveBeenCalledWith(mockQuery);
      expect(mockOpenAIProvider.search).toHaveBeenCalledWith('test query', {
        maxResults: 10,
        includePageContent: undefined,
        browsePage: undefined,
        model: undefined,
        temperature: undefined,
        max_tokens: undefined,
        context: undefined,
      });
      expect(result.query).toBe('test query');
      expect(result.provider).toBe('openai');
      expect(result.searchResults).toBe(mockSearchResults);
      expect(result.metadata.totalResults).toBe(1);
    });

    it('should execute successfully with Perplexity provider and specific options', async () => {
      const mockQuery = {
        query: 'test query',
        provider: 'perplexity',
        maxResults: 5,
        recency: 'week',
        searchDomainFilter: ['example.com'],
      };

      const mockSearchResults = {
        query: 'test query',
        results: [],
        metadata: { totalResults: 0 },
      };

      mockZodValidator.validateDeepResearchQuery.mockReturnValue(mockQuery);
      mockPerplexityProvider.search.mockResolvedValue(mockSearchResults);

      const result = await tool.execute(mockQuery);

      expect(mockPerplexityProvider.search).toHaveBeenCalledWith('test query', {
        maxResults: 5,
        includePageContent: undefined,
        browsePage: undefined,
        model: undefined,
        temperature: undefined,
        max_tokens: undefined,
        context: undefined,
        recency: 'week',
        searchDomainFilter: ['example.com'],
      });
      expect(result.provider).toBe('perplexity');
    });

    it('should execute successfully with Grok provider and specific options', async () => {
      const mockQuery = {
        query: 'test query',
        provider: 'grok',
        searchDepth: 'deep',
        realTimeData: true,
      };

      const mockSearchResults = {
        query: 'test query',
        results: [],
        metadata: { totalResults: 0 },
      };

      mockZodValidator.validateDeepResearchQuery.mockReturnValue(mockQuery);
      mockGrokProvider.search.mockResolvedValue(mockSearchResults);

      const result = await tool.execute(mockQuery);

      expect(mockGrokProvider.search).toHaveBeenCalledWith('test query', {
        maxResults: undefined,
        includePageContent: undefined,
        browsePage: undefined,
        model: undefined,
        temperature: undefined,
        max_tokens: undefined,
        context: undefined,
        searchDepth: 'deep',
        realTimeData: true,
      });
      expect(result.provider).toBe('grok');
    });

    it('should auto-select first available provider when provider is "auto"', async () => {
      const mockQuery = {
        query: 'test query',
        provider: 'auto',
      };

      const mockSearchResults = {
        query: 'test query',
        results: [],
        metadata: { totalResults: 0 },
      };

      mockZodValidator.validateDeepResearchQuery.mockReturnValue(mockQuery);
      mockOpenAIProvider.search.mockResolvedValue(mockSearchResults);

      const result = await tool.execute(mockQuery);

      expect(mockOpenAIProvider.search).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Auto-selected provider: openai');
    });

    it('should handle page browsing when supported by provider', async () => {
      const mockQuery = {
        query: 'test query',
        provider: 'openai',
        browsePage: 'https://example.com',
      };

      const mockSearchResults = {
        query: 'test query',
        results: [],
        metadata: { totalResults: 0 },
      };

      const mockPageContent = {
        url: 'https://example.com',
        title: 'Example Page',
        content: 'Page content',
        metadata: {},
      };

      mockZodValidator.validateDeepResearchQuery.mockReturnValue(mockQuery);
      mockOpenAIProvider.search.mockResolvedValue(mockSearchResults);
      mockOpenAIProvider.browsePage.mockResolvedValue(mockPageContent);

      const result = await tool.execute(mockQuery);

      expect(mockOpenAIProvider.browsePage).toHaveBeenCalledWith(
        'https://example.com',
        expect.any(Object)
      );
      expect(result.pageContent).toBe(mockPageContent);
    });

    it('should throw error for unavailable provider', async () => {
      const mockQuery = {
        query: 'test query',
        provider: 'invalid-provider',
      };

      mockZodValidator.validateDeepResearchQuery.mockReturnValue(mockQuery);

      await expect(tool.execute(mockQuery)).rejects.toThrow(McpError);
      await expect(tool.execute(mockQuery)).rejects.toThrow("Provider 'invalid-provider' is not available");
    });

    it('should handle validation errors', async () => {
      const mockError = new Error('Validation failed');
      mockZodValidator.validateDeepResearchQuery.mockImplementation(() => {
        throw mockError;
      });

      await expect(tool.execute({ invalid: 'data' })).rejects.toThrow(McpError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unified deep research failed',
        expect.objectContaining({ error: mockError })
      );
    });

    it('should handle provider search errors', async () => {
      const mockQuery = {
        query: 'test query',
        provider: 'openai',
      };

      const searchError = new Error('Search failed');
      mockZodValidator.validateDeepResearchQuery.mockReturnValue(mockQuery);
      mockOpenAIProvider.search.mockRejectedValue(searchError);

      await expect(tool.execute(mockQuery)).rejects.toThrow(McpError);
      await expect(tool.execute(mockQuery)).rejects.toThrow('Deep research failed: Search failed');
    });

    it('should re-throw McpError instances without wrapping', async () => {
      const mockQuery = {
        query: 'test query',
        provider: 'openai',
      };

      const mcpError = new McpError(BaseErrorCode.INVALID_REQUEST, 'Original MCP error');
      mockZodValidator.validateDeepResearchQuery.mockReturnValue(mockQuery);
      mockOpenAIProvider.search.mockRejectedValue(mcpError);

      await expect(tool.execute(mockQuery)).rejects.toBe(mcpError);
    });

    it('should include processing time in metadata', async () => {
      const mockQuery = {
        query: 'test query',
        provider: 'openai',
      };

      const mockSearchResults = {
        query: 'test query',
        results: [],
        metadata: { totalResults: 0 },
      };

      mockZodValidator.validateDeepResearchQuery.mockReturnValue(mockQuery);
      mockOpenAIProvider.search.mockResolvedValue(mockSearchResults);

      const result = await tool.execute(mockQuery);

      expect(result.metadata.processingTime).toBeDefined();
      expect(typeof result.metadata.processingTime).toBe('number');
      expect(result.metadata.timestamp).toBeDefined();
      expect(result.metadata.availableProviders).toEqual(['openai', 'perplexity', 'grok']);
    });
  });

  describe('selectProvider', () => {
    beforeEach(() => {
      tool = new UnifiedDeepResearchTool();
    });

    it('should return specified provider when available', () => {
      const provider = (tool as any).selectProvider('openai');
      expect(provider).toBe(mockOpenAIProvider);
    });

    it('should return null for unavailable provider', () => {
      const provider = (tool as any).selectProvider('invalid');
      expect(provider).toBeNull();
    });

    it('should auto-select first available provider for "auto"', () => {
      const provider = (tool as any).selectProvider('auto');
      expect(provider).toBe(mockOpenAIProvider);
    });
  });

  describe('prepareSearchOptions', () => {
    beforeEach(() => {
      tool = new UnifiedDeepResearchTool();
    });

    it('should prepare base options for any provider', () => {
      const query = {
        query: 'test',
        provider: 'openai',
        maxResults: 10,
        includePageContent: true,
        model: 'gpt-4',
        temperature: 0.5,
        max_tokens: 1000,
        context: 'test context',
      };

      const options = (tool as any).prepareSearchOptions(query);

      expect(options).toEqual({
        maxResults: 10,
        includePageContent: true,
        browsePage: undefined,
        model: 'gpt-4',
        temperature: 0.5,
        max_tokens: 1000,
        context: 'test context',
      });
    });

    it('should include Perplexity-specific options', () => {
      const query = {
        query: 'test',
        provider: 'perplexity',
        recency: 'week',
        searchDomainFilter: ['example.com'],
      };

      const options = (tool as any).prepareSearchOptions(query);

      expect(options).toEqual(expect.objectContaining({
        recency: 'week',
        searchDomainFilter: ['example.com'],
      }));
    });

    it('should include Grok-specific options', () => {
      const query = {
        query: 'test',
        provider: 'grok',
        searchDepth: 'deep',
        realTimeData: true,
      };

      const options = (tool as any).prepareSearchOptions(query);

      expect(options).toEqual(expect.objectContaining({
        searchDepth: 'deep',
        realTimeData: true,
      }));
    });
  });

  describe('getAvailableProviders', () => {
    beforeEach(() => {
      tool = new UnifiedDeepResearchTool();
    });

    it('should return array of available provider names', () => {
      const providers = tool.getAvailableProviders();
      expect(providers).toEqual(['openai', 'perplexity', 'grok']);
    });
  });

  describe('isProviderAvailable', () => {
    beforeEach(() => {
      tool = new UnifiedDeepResearchTool();
    });

    it('should return true for available providers', () => {
      expect(tool.isProviderAvailable('openai')).toBe(true);
      expect(tool.isProviderAvailable('perplexity')).toBe(true);
      expect(tool.isProviderAvailable('grok')).toBe(true);
    });

    it('should return false for unavailable providers', () => {
      expect(tool.isProviderAvailable('invalid')).toBe(false);
    });
  });

  describe('getToolDefinition', () => {
    it('should return valid tool definition', () => {
      const definition = UnifiedDeepResearchTool.getToolDefinition();

      expect(definition.name).toBe('deep-research-unified');
      expect(definition.description).toContain('comprehensive deep research');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.properties.query).toBeDefined();
      expect(definition.inputSchema.properties.provider).toBeDefined();
      expect(definition.inputSchema.required).toEqual(['query']);
    });

    it('should include all provider-specific properties', () => {
      const definition = UnifiedDeepResearchTool.getToolDefinition();
      const properties = definition.inputSchema.properties;

      // Perplexity-specific
      expect(properties.recency).toBeDefined();
      expect(properties.searchDomainFilter).toBeDefined();

      // Grok-specific
      expect(properties.searchDepth).toBeDefined();
      expect(properties.realTimeData).toBeDefined();

      // Common properties
      expect(properties.maxResults).toBeDefined();
      expect(properties.includePageContent).toBeDefined();
      expect(properties.browsePage).toBeDefined();
      expect(properties.model).toBeDefined();
      expect(properties.temperature).toBeDefined();
      expect(properties.max_tokens).toBeDefined();
    });
  });

  describe('edge cases and error handling', () => {
    beforeEach(() => {
      tool = new UnifiedDeepResearchTool();
    });

    it('should handle empty search results gracefully', async () => {
      const mockQuery = {
        query: 'test query',
        provider: 'openai',
      };

      const mockSearchResults = {
        query: 'test query',
        results: [],
        metadata: { totalResults: 0 },
      };

      mockZodValidator.validateDeepResearchQuery.mockReturnValue(mockQuery);
      mockOpenAIProvider.search.mockResolvedValue(mockSearchResults);

      const result = await tool.execute(mockQuery);

      expect(result.searchResults.results).toHaveLength(0);
      expect(result.metadata.totalResults).toBe(0);
    });

    it('should handle browsePage when provider does not support it', async () => {
      const mockQuery = {
        query: 'test query',
        provider: 'openai',
        browsePage: 'https://example.com',
      };

      const mockSearchResults = {
        query: 'test query',
        results: [],
        metadata: { totalResults: 0 },
      };

      // Remove browsePage method from provider
      delete (mockOpenAIProvider as any).browsePage;

      mockZodValidator.validateDeepResearchQuery.mockReturnValue(mockQuery);
      mockOpenAIProvider.search.mockResolvedValue(mockSearchResults);

      const result = await tool.execute(mockQuery);

      expect(result.pageContent).toBeUndefined();
    });

    it('should handle response validation errors', async () => {
      const mockQuery = {
        query: 'test query',
        provider: 'openai',
      };

      const mockSearchResults = {
        query: 'test query',
        results: [],
        metadata: { totalResults: 0 },
      };

      mockZodValidator.validateDeepResearchQuery.mockReturnValue(mockQuery);
      mockOpenAIProvider.search.mockResolvedValue(mockSearchResults);
      mockZodValidator.validateDeepResearchResponse.mockImplementation(() => {
        throw new Error('Response validation failed');
      });

      await expect(tool.execute(mockQuery)).rejects.toThrow(McpError);
      await expect(tool.execute(mockQuery)).rejects.toThrow('Deep research failed: Response validation failed');
    });
  });
});