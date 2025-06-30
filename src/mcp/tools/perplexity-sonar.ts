import { PerplexityProvider } from '../../providers/perplexity.js'
import { config } from '../../config/index.js'
import { logger } from '../../utils/logger.js'
import { McpError, BaseErrorCode } from '../../utils/errors.js'
import {
  perplexitySonarArgsSchema,
  validateArgs,
  type PerplexitySonarArgs,
} from '../../schemas/validation.js'
import { PerplexityProviderOptions } from '../../types/providers.js'

export class PerplexitySonarTool {
  private provider: PerplexityProvider

  constructor() {
    if (!config.apis.perplexity?.apiKey) {
      throw new McpError(
        BaseErrorCode.INVALID_REQUEST,
        'Perplexity API key not configured'
      )
    }
    this.provider = new PerplexityProvider(config.apis.perplexity.apiKey)
  }

  async execute(args: unknown) {
    try {
      // Validate arguments
      let validatedArgs: PerplexitySonarArgs
      try {
        validatedArgs = validateArgs(
          perplexitySonarArgsSchema,
          args,
          'perplexity-sonar'
        )
      } catch (error) {
        throw new McpError(
          BaseErrorCode.INVALID_REQUEST,
          error instanceof Error ? error.message : 'Invalid arguments'
        )
      }

      logger.info('Executing Perplexity Sonar search', {
        query: validatedArgs.query,
      })

      const searchResults = await this.provider.search(
        validatedArgs.query,
        validatedArgs.options as PerplexityProviderOptions
      )

      logger.info('Perplexity Sonar search completed', {
        query: validatedArgs.query,
        resultCount: searchResults.results.length,
      })

      return { searchResults }
    } catch (error) {
      logger.error('Perplexity Sonar search failed', {
        error,
      })
      throw error instanceof McpError
        ? error
        : new McpError(
            BaseErrorCode.INTERNAL_ERROR,
            `Perplexity search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
    }
  }

  static getToolDefinition() {
    return {
      name: 'perplexity-sonar',
      description: 'Perform real-time web search using Perplexity Sonar',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query',
            minLength: 1,
            maxLength: 1000,
          },
          options: {
            type: 'object',
            description: 'Additional search options',
            properties: {
              maxResults: {
                type: 'number',
                default: 10,
                minimum: 1,
                maximum: 100,
                description: 'Maximum number of search results to return',
              },
              recency: {
                type: 'string',
                enum: ['day', 'week', 'month', 'year'],
                description: 'Time filter for search results',
              },
            },
          },
        },
        required: ['query'],
      },
    }
  }
}
