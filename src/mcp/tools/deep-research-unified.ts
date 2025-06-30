import { OpenAIProvider } from '../../providers/openai.js'
import { PerplexityProvider } from '../../providers/perplexity.js'
import { GrokProvider } from '../../providers/grok.js'
import { config } from '../../config/index.js'
import { logger } from '../../utils/logger.js'
import { McpError, BaseErrorCode } from '../../utils/errors.js'
import {
  ZodValidator,
  type DeepResearchQuery,
  type DeepResearchResponseType,
  zDeepResearchQuery,
  zDeepResearchResponse,
} from '../../middleware/validation.js'

export class UnifiedDeepResearchTool {
  private providers: Map<string, any> = new Map()

  constructor() {
    this.initializeProviders()
  }

  private initializeProviders() {
    // Initialize available providers
    if (config.apis.openai?.apiKey) {
      this.providers.set(
        'openai',
        new OpenAIProvider(config.apis.openai.apiKey)
      )
    }

    if (config.apiKeys.perplexity) {
      this.providers.set(
        'perplexity',
        new PerplexityProvider(config.apiKeys.perplexity)
      )
    }

    if (config.apiKeys.xaiGrok) {
      this.providers.set('grok', new GrokProvider(config.apiKeys.xaiGrok))
    }

    if (this.providers.size === 0) {
      throw new McpError(
        BaseErrorCode.INVALID_REQUEST,
        'No research providers configured. Please set up at least one API key.'
      )
    }
  }

  async execute(args: unknown): Promise<DeepResearchResponseType> {
    const startTime = Date.now()

    try {
      // Validate input arguments using Zod
      const validatedQuery = ZodValidator.validateDeepResearchQuery(args)

      logger.info('Executing unified deep research', {
        query: validatedQuery.query,
        provider: validatedQuery.provider,
        model: validatedQuery.model,
      })

      // Select provider
      const provider = this.selectProvider(validatedQuery.provider)
      if (!provider) {
        throw new McpError(
          BaseErrorCode.INVALID_REQUEST,
          `Provider '${validatedQuery.provider}' is not available. Available providers: ${Array.from(this.providers.keys()).join(', ')}`
        )
      }

      // Prepare search options based on provider
      const searchOptions = this.prepareSearchOptions(validatedQuery)

      // Perform search
      const searchResults = await provider.search(
        validatedQuery.query,
        searchOptions
      )

      // Handle page browsing if requested
      let pageContent = undefined
      if (
        validatedQuery.browsePage &&
        'browsePage' in provider &&
        provider.browsePage
      ) {
        logger.info('Browsing page for additional context', {
          url: validatedQuery.browsePage,
        })
        pageContent = await provider.browsePage(
          validatedQuery.browsePage,
          searchOptions
        )
      }

      const processingTime = Date.now() - startTime

      // Construct response
      const response: DeepResearchResponseType = {
        query: validatedQuery.query,
        provider: validatedQuery.provider,
        searchResults,
        pageContent,
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime,
          totalResults: searchResults.results.length,
          availableProviders: Array.from(this.providers.keys()),
        },
      }

      // Validate response using Zod
      const validatedResponse =
        ZodValidator.validateDeepResearchResponse(response)

      logger.info('Unified deep research completed', {
        query: validatedQuery.query,
        provider: validatedQuery.provider,
        resultCount: searchResults.results.length,
        processingTime,
      })

      return validatedResponse
    } catch (error) {
      logger.error('Unified deep research failed', { error, args })

      if (error instanceof McpError) {
        throw error
      }

      throw new McpError(
        BaseErrorCode.INTERNAL_ERROR,
        `Deep research failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private selectProvider(providerName: string) {
    // If provider is specified and available, use it
    if (this.providers.has(providerName)) {
      return this.providers.get(providerName)
    }

    // Auto-select first available provider
    if (providerName === 'auto' || !this.providers.has(providerName)) {
      const availableProviders = Array.from(this.providers.keys())
      if (availableProviders.length > 0) {
        const selectedProvider = availableProviders[0]
        logger.info(`Auto-selected provider: ${selectedProvider}`)
        return this.providers.get(selectedProvider)
      }
    }

    return null
  }

  private prepareSearchOptions(query: DeepResearchQuery) {
    const baseOptions = {
      maxResults: query.maxResults,
      includePageContent: query.includePageContent,
      browsePage: query.browsePage,
      model: query.model,
      temperature: query.temperature,
      max_tokens: query.max_tokens,
      context: query.context,
    }

    // Add provider-specific options
    switch (query.provider) {
      case 'perplexity':
        return {
          ...baseOptions,
          recency: query.recency,
          searchDomainFilter: query.searchDomainFilter,
        }

      case 'grok':
        return {
          ...baseOptions,
          searchDepth: query.searchDepth,
          realTimeData: query.realTimeData,
        }

      default:
        return baseOptions
    }
  }

  static getToolDefinition() {
    return {
      name: 'deep-research-unified',
      description:
        'Perform comprehensive deep research using multiple AI providers with unified interface and validation',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The research query to search for',
            minLength: 1,
            maxLength: 1000,
          },
          provider: {
            type: 'string',
            enum: ['openai', 'perplexity', 'grok'],
            default: 'openai',
            description: 'The AI provider to use for research',
          },
          model: {
            type: 'string',
            description: 'The specific model to use (provider-dependent)',
          },
          temperature: {
            type: 'number',
            minimum: 0,
            maximum: 2,
            description: 'Temperature for the model (0.0 to 2.0)',
          },
          max_tokens: {
            type: 'number',
            minimum: 1,
            maximum: 4000,
            description: 'Maximum tokens for the response',
          },
          maxResults: {
            type: 'number',
            default: 10,
            minimum: 1,
            maximum: 100,
            description: 'Maximum number of search results to return',
          },
          includePageContent: {
            type: 'boolean',
            default: false,
            description: 'Whether to include full page content for each result',
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
          searchDomainFilter: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Domain filter for search results (Perplexity only)',
          },
          includeAnalysis: {
            type: 'boolean',
            default: false,
            description: 'Whether to include AI analysis of results',
          },
          context: {
            type: 'string',
            description: 'Additional context for the research query',
          },
        },
        required: ['query'],
      },
    }
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  /**
   * Check if a specific provider is available
   */
  isProviderAvailable(provider: string): boolean {
    return this.providers.has(provider)
  }
}
