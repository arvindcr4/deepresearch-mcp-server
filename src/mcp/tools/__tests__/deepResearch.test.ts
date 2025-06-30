/**
 * Unit Tests for Deep Research Tool
 */

// Mock dependencies
jest.mock('../../../providers/factory.js');
jest.mock('../../../utils/logger.js');
jest.mock('../../../schemas/deepResearch.js');
jest.mock('../../../types/mcp.js');

import { ProviderFactory } from '../../../providers/factory.js';
import { logger } from '../../../utils/logger.js';
import { McpError, BaseErrorCode } from '../../../types/errors.js';
import { createToolResponse } from '../../../types/mcp.js';
import {
  zDeepResearchQuery,
  zDeepResearchResponse,
  DeepResearchQuery,
  DeepResearchResponseType,
} from '../../../schemas/deepResearch.js';

// Mock provider implementation
const mockProvider = {
  search: jest.fn(),
  browsePage: jest.fn(),
};

// Mock factory methods
const mockProviderFactory = ProviderFactory as jest.Mocked<typeof ProviderFactory>;
mockProviderFactory.get = jest.fn();
mockProviderFactory.getAvailableProviders = jest.fn();

// Mock logger
const mockLogger = logger as jest.Mocked<typeof logger>;

// Mock schemas
const mockZDeepResearchQuery = zDeepResearchQuery as jest.Mocked<typeof zDeepResearchQuery>;
const mockZDeepResearchResponse = zDeepResearchResponse as jest.Mocked<typeof zDeepResearchResponse>;

// Mock createToolResponse
const mockCreateToolResponse = createToolResponse as jest.MockedFunction<typeof createToolResponse>;

describe('Deep Research Tool', () => {
  let deepResearchModule: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Reset provider mock
    mockProvider.search.mockReset();
    mockProvider.browsePage?.mockReset();
    
    // Mock default factory behavior
    mockProviderFactory.get.mockReturnValue(mockProvider as any);
    mockProviderFactory.getAvailableProviders.mockReturnValue(['openai', 'perplexity', 'grok']);
    
    // Mock schema parsing
    mockZDeepResearchQuery.parse = jest.fn();
    mockZDeepResearchResponse.parse = jest.fn();
    
    // Mock createToolResponse
    mockCreateToolResponse.mockImplementation((text, isError) => ({
      content: [{ type: 'text', text }],
      isError,
    }));
    
    // Dynamic import to ensure mocks are applied
    deepResearchModule = await import('../deepResearch.js');
  });

  describe('deepResearchTool.run', () => {
    const mockSearchResults = {
      query: 'test query',
      results: [
        {
          title: 'Test Result',
          url: 'https://example.com',
          snippet: 'Test snippet',
          relevanceScore: 0.9,
        },
      ],
      metadata: {
        totalResults: 1,
        searchTime: 100,
        provider: 'openai',
      },
    };

    it('should perform successful search with OpenAI provider', async () => {
      const query: DeepResearchQuery = {
        query: 'test query',
        provider: 'openai',
        model: 'gpt-4',
        maxResults: 5,
      };

      mockProvider.search.mockResolvedValue(mockSearchResults);

      const result = await deepResearchModule.deepResearchTool.run(query);

      expect(mockProviderFactory.get).toHaveBeenCalledWith('openai');
      expect(mockProvider.search).toHaveBeenCalledWith(
        'test query',
        expect.objectContaining({
          model: 'gpt-4',
          maxResults: 5,
        })
      );

      expect(result).toEqual(
        expect.objectContaining({
          query: 'test query',
          provider: 'openai',
          searchResults: mockSearchResults,
          metadata: expect.objectContaining({
            timestamp: expect.any(String),
            processingTime: expect.any(Number),
            totalResults: 1,
            availableProviders: ['openai', 'perplexity', 'grok'],
          }),
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting deep research',
        expect.objectContaining({
          query: 'test query',
          provider: 'openai',
          model: 'gpt-4',
        })
      );
    });

    it('should perform successful search with Perplexity provider and recency filter', async () => {
      const query: DeepResearchQuery = {
        query: 'recent news',
        provider: 'perplexity',
        recency: 'week',
        maxResults: 10,
      };

      mockProvider.search.mockResolvedValue(mockSearchResults);

      const result = await deepResearchModule.deepResearchTool.run(query);

      expect(mockProviderFactory.get).toHaveBeenCalledWith('perplexity');
      expect(mockProvider.search).toHaveBeenCalledWith(
        'recent news',
        expect.objectContaining({
          recency: 'week',
          maxResults: 10,
        })
      );

      expect(result.provider).toBe('perplexity');
    });

    it('should perform successful search with Grok provider and search depth', async () => {
      const query: DeepResearchQuery = {
        query: 'deep analysis',
        provider: 'grok',
        searchDepth: 'deep',
        realTimeData: true,
      };

      mockProvider.search.mockResolvedValue(mockSearchResults);

      const result = await deepResearchModule.deepResearchTool.run(query);

      expect(mockProviderFactory.get).toHaveBeenCalledWith('grok');
      expect(mockProvider.search).toHaveBeenCalledWith(
        'deep analysis',
        expect.objectContaining({
          searchDepth: 'deep',
          realTimeData: true,
        })
      );

      expect(result.provider).toBe('grok');
    });

    it('should handle page browsing when browsePage is provided', async () => {
      const query: DeepResearchQuery = {
        query: 'test query',
        provider: 'openai',
        browsePage: 'https://example.com/page',
      };

      const mockPageContent = {
        url: 'https://example.com/page',
        title: 'Example Page',
        content: 'Page content here',
        metadata: {
          extractedAt: new Date().toISOString(),
          contentLength: 100,
        },
      };

      mockProvider.search.mockResolvedValue(mockSearchResults);
      mockProvider.browsePage = jest.fn().mockResolvedValue(mockPageContent);

      const result = await deepResearchModule.deepResearchTool.run(query);

      expect(mockProvider.browsePage).toHaveBeenCalledWith(
        'https://example.com/page',
        expect.any(Object)
      );
      expect(result.pageContent).toEqual(mockPageContent);
    });

    it('should handle page browsing failure gracefully', async () => {
      const query: DeepResearchQuery = {
        query: 'test query',
        provider: 'openai',
        browsePage: 'https://example.com/page',
      };

      mockProvider.search.mockResolvedValue(mockSearchResults);
      mockProvider.browsePage = jest.fn().mockRejectedValue(new Error('Page not found'));

      const result = await deepResearchModule.deepResearchTool.run(query);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Page browsing failed',
        expect.objectContaining({
          url: 'https://example.com/page',
          error: 'Page not found',
        })
      );
      expect(result.pageContent).toBeUndefined();
    });

    it('should handle provider errors and throw McpError', async () => {
      const query: DeepResearchQuery = {
        query: 'test query',
        provider: 'openai',
      };

      const providerError = new Error('Provider API error');
      mockProvider.search.mockRejectedValue(providerError);

      await expect(deepResearchModule.deepResearchTool.run(query)).rejects.toThrow(McpError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Deep research failed',
        expect.objectContaining({
          query: 'test query',
          provider: 'openai',
          error: 'Provider API error',
        })
      );
    });

    it('should re-throw McpError instances without wrapping', async () => {
      const query: DeepResearchQuery = {
        query: 'test query',
        provider: 'openai',
      };

      const mcpError = new McpError(BaseErrorCode.INVALID_REQUEST, 'Invalid provider config');
      mockProvider.search.mockRejectedValue(mcpError);

      await expect(deepResearchModule.deepResearchTool.run(query)).rejects.toThrow(mcpError);
    });

    it('should handle provider factory errors', async () => {
      const query: DeepResearchQuery = {
        query: 'test query',
        provider: 'openai',
      };

      const factoryError = new McpError(BaseErrorCode.INVALID_REQUEST, 'Provider not configured');
      mockProviderFactory.get.mockImplementation(() => {
        throw factoryError;
      });

      await expect(deepResearchModule.deepResearchTool.run(query)).rejects.toThrow(factoryError);
    });
  });

  describe('prepareSearchOptions', () => {
    it('should prepare common options', () => {
      const query: DeepResearchQuery = {
        query: 'test query',
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 1000,
        maxResults: 15,
        includePageContent: true,
      };

      // Access the private function through the module for testing
      const options = deepResearchModule.prepareSearchOptions?.(query) || {};

      expect(options).toEqual({
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 1000,
        maxResults: 15,
        includePageContent: true,
      });
    });

    it('should prepare Perplexity-specific options', () => {
      const query: DeepResearchQuery = {
        query: 'test query',
        provider: 'perplexity',
        recency: 'month',
        maxResults: 10,
      };

      const options = deepResearchModule.prepareSearchOptions?.(query) || {};

      expect(options).toEqual({
        recency: 'month',
        maxResults: 10,
      });
    });

    it('should prepare Grok-specific options', () => {
      const query: DeepResearchQuery = {
        query: 'test query',
        provider: 'grok',
        searchDepth: 'deep',
        realTimeData: true,
        maxResults: 20,
      };

      const options = deepResearchModule.prepareSearchOptions?.(query) || {};

      expect(options).toEqual({
        searchDepth: 'deep',
        realTimeData: true,
        maxResults: 20,
      });
    });

    it('should handle OpenAI provider with no specific options', () => {
      const query: DeepResearchQuery = {
        query: 'test query',
        provider: 'openai',
        model: 'gpt-3.5-turbo',
      };

      const options = deepResearchModule.prepareSearchOptions?.(query) || {};

      expect(options).toEqual({
        model: 'gpt-3.5-turbo',
      });
    });
  });

  describe('executeDeepResearchTool', () => {
    const mockValidatedArgs: DeepResearchQuery = {
      query: 'test query',
      provider: 'openai',
    };

    const mockValidatedResult: DeepResearchResponseType = {
      query: 'test query',
      provider: 'openai',
      searchResults: {
        query: 'test query',
        results: [],
        metadata: { provider: 'openai' },
      },
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: 100,
        totalResults: 0,
      },
    };

    beforeEach(() => {
      mockZDeepResearchQuery.parse.mockReturnValue(mockValidatedArgs);
      mockZDeepResearchResponse.parse.mockReturnValue(mockValidatedResult);
      mockProvider.search.mockResolvedValue(mockValidatedResult.searchResults);
    });

    it('should execute successfully with valid input', async () => {
      const args = { query: 'test query', provider: 'openai' };

      const result = await deepResearchModule.executeDeepResearchTool(args);

      expect(mockZDeepResearchQuery.parse).toHaveBeenCalledWith(args);
      expect(mockZDeepResearchResponse.parse).toHaveBeenCalledWith(mockValidatedResult);
      expect(mockCreateToolResponse).toHaveBeenCalledWith(
        JSON.stringify(mockValidatedResult, null, 2)
      );
      expect(result.isError).toBeFalsy();
    });

    it('should handle input validation errors', async () => {
      const args = { query: '', provider: 'invalid' };
      const zodError = {
        issues: [
          { message: 'String must contain at least 1 character(s)', path: ['query'] },
          { message: 'Invalid enum value', path: ['provider'] },
        ],
      };

      mockZDeepResearchQuery.parse.mockImplementation(() => {
        throw zodError;
      });

      const result = await deepResearchModule.executeDeepResearchTool(args);

      expect(mockCreateToolResponse).toHaveBeenCalledWith(
        'Input validation error: query: String must contain at least 1 character(s), provider: Invalid enum value',
        true
      );
      expect(result.isError).toBe(true);
    });

    it('should handle McpError instances', async () => {
      const args = { query: 'test query', provider: 'openai' };
      const mcpError = new McpError(BaseErrorCode.INVALID_REQUEST, 'Provider not configured');

      mockZDeepResearchQuery.parse.mockReturnValue(mockValidatedArgs);
      mockProvider.search.mockRejectedValue(mcpError);

      const result = await deepResearchModule.executeDeepResearchTool(args);

      expect(result).toEqual(mcpError.toResponse());
    });

    it('should handle output validation errors', async () => {
      const args = { query: 'test query', provider: 'openai' };
      const invalidResult = { ...mockValidatedResult, query: undefined };

      mockZDeepResearchQuery.parse.mockReturnValue(mockValidatedArgs);
      mockProvider.search.mockResolvedValue(mockValidatedResult.searchResults);
      
      // Simulate the tool returning invalid data
      jest.spyOn(deepResearchModule.deepResearchTool, 'run').mockResolvedValue(invalidResult);

      const zodError = {
        issues: [
          { message: 'Required', path: ['query'] },
        ],
      };

      mockZDeepResearchResponse.parse.mockImplementation(() => {
        throw zodError;
      });

      const result = await deepResearchModule.executeDeepResearchTool(args);

      expect(mockCreateToolResponse).toHaveBeenCalledWith(
        'Input validation error: query: Required',
        true
      );
      expect(result.isError).toBe(true);
    });

    it('should handle generic errors', async () => {
      const args = { query: 'test query', provider: 'openai' };
      const genericError = new Error('Network timeout');

      mockZDeepResearchQuery.parse.mockReturnValue(mockValidatedArgs);
      mockProvider.search.mockRejectedValue(genericError);

      const result = await deepResearchModule.executeDeepResearchTool(args);

      expect(mockCreateToolResponse).toHaveBeenCalledWith(
        'Deep research error: Network timeout',
        true
      );
      expect(result.isError).toBe(true);
    });
  });

  describe('getDeepResearchToolDefinition', () => {
    it('should return correct tool definition', () => {
      const definition = deepResearchModule.getDeepResearchToolDefinition();

      expect(definition).toEqual({
        name: 'deep_research_search',
        description: expect.stringContaining('Perform comprehensive deep research'),
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              minLength: 1,
              maxLength: 1000,
              description: 'The research query to search for',
            },
            provider: {
              type: 'string',
              enum: ['openai', 'perplexity', 'grok'],
              default: 'openai',
              description: 'The provider to use for the search',
            },
            model: {
              type: 'string',
              description: 'The model to use (provider-specific)',
            },
            temperature: {
              type: 'number',
              minimum: 0,
              maximum: 2,
              description: 'Temperature for the model',
            },
            max_tokens: {
              type: 'number',
              minimum: 1,
              maximum: 4000,
              description: 'Maximum tokens for the response',
            },
            maxResults: {
              type: 'number',
              minimum: 1,
              maximum: 100,
              default: 10,
              description: 'Maximum number of search results',
            },
            includePageContent: {
              type: 'boolean',
              default: false,
              description: 'Whether to include full page content',
            },
            browsePage: {
              type: 'string',
              format: 'uri',
              description: 'Specific URL to browse for additional context',
            },
            recency: {
              type: 'string',
              enum: ['day', 'week', 'month', 'year'],
              description: 'Time filter for search results (Perplexity only)',
            },
            searchDepth: {
              type: 'string',
              enum: ['shallow', 'medium', 'deep'],
              description: 'Search depth (Grok only)',
            },
            realTimeData: {
              type: 'boolean',
              description: 'Use real-time data (Grok only)',
            },
          },
          required: ['query'],
        },
      });
    });

    it('should have consistent name with deepResearchTool', () => {
      const definition = deepResearchModule.getDeepResearchToolDefinition();
      expect(definition.name).toBe(deepResearchModule.deepResearchTool.name);
    });

    it('should have consistent description with deepResearchTool', () => {
      const definition = deepResearchModule.getDeepResearchToolDefinition();
      expect(definition.description).toBe(deepResearchModule.deepResearchTool.description);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle undefined browsePage option', async () => {
      const query: DeepResearchQuery = {
        query: 'test query',
        provider: 'openai',
        browsePage: undefined,
      };

      const mockSearchResults = {
        query: 'test query',
        results: [],
        metadata: { provider: 'openai' },
      };

      mockProvider.search.mockResolvedValue(mockSearchResults);

      const result = await deepResearchModule.deepResearchTool.run(query);

      expect(mockProvider.browsePage).not.toHaveBeenCalled();
      expect(result.pageContent).toBeUndefined();
    });

    it('should handle provider without browsePage capability', async () => {
      const query: DeepResearchQuery = {
        query: 'test query',
        provider: 'openai',
        browsePage: 'https://example.com',
      };

      const mockSearchResults = {
        query: 'test query',
        results: [],
        metadata: { provider: 'openai' },
      };

      // Provider without browsePage method
      const providerWithoutBrowse = {
        search: jest.fn().mockResolvedValue(mockSearchResults),
      };

      mockProviderFactory.get.mockReturnValue(providerWithoutBrowse as any);

      const result = await deepResearchModule.deepResearchTool.run(query);

      expect(result.pageContent).toBeUndefined();
    });

    it('should handle empty search results', async () => {
      const query: DeepResearchQuery = {
        query: 'empty query',
        provider: 'openai',
      };

      const emptySearchResults = {
        query: 'empty query',
        results: [],
        metadata: {
          totalResults: 0,
          provider: 'openai',
        },
      };

      mockProvider.search.mockResolvedValue(emptySearchResults);

      const result = await deepResearchModule.deepResearchTool.run(query);

      expect(result.searchResults.results).toHaveLength(0);
      expect(result.metadata.totalResults).toBe(0);
    });
  });
});