import { GrokProvider } from '../../providers/grok.js'
import { config } from '../../config/index.js'
import { logger } from '../../utils/logger.js'
import { McpError, BaseErrorCode } from '../../types/errors.js'
import {
  grok3ArgsSchema,
  validateArgs,
  type Grok3Args,
} from '../../schemas/validation.js'
import { SearchResult, PageContent } from '../../providers/index.js'
import { GrokProviderOptions } from '../../types/providers.js'

export class Grok3Tool {
  private provider: GrokProvider

  constructor() {
    if (!config.apis.grok?.apiKey) {
      throw new McpError(
        BaseErrorCode.VALIDATION_ERROR,
        'Grok API key not configured'
      )
    }
    this.provider = new GrokProvider(config.apis.grok.apiKey)
  }

  async execute(args: unknown) {
    try {
      // Validate arguments
      let validatedArgs: Grok3Args
      try {
        validatedArgs = validateArgs(grok3ArgsSchema, args, 'grok3')
      } catch (error) {
        throw new McpError(
          BaseErrorCode.VALIDATION_ERROR,
          error instanceof Error ? error.message : 'Invalid arguments'
        )
      }

      logger.info('Executing Grok-3 research', {
        query: validatedArgs.query,
      })

      const searchResults = await this.provider.search(
        validatedArgs.query,
        validatedArgs.options as GrokProviderOptions
      )

      const result: { searchResults: SearchResult; pageContent?: PageContent } =
        { searchResults }

      // If page browsing is requested
      if (validatedArgs.options?.browsePage && this.provider.browsePage) {
        const pageContent = await this.provider.browsePage(
          validatedArgs.options.browsePage,
          validatedArgs.options as GrokProviderOptions
        )
        result.pageContent = pageContent
      }

      logger.info('Grok-3 research completed', {
        query: validatedArgs.query,
        resultCount: searchResults.results.length,
      })

      return result
    } catch (error) {
      logger.error('Grok-3 research failed', { error })
      throw error instanceof McpError
        ? error
        : new McpError(
            BaseErrorCode.INTERNAL_ERROR,
            `Grok research failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
    }
  }

  static getToolDefinition() {
    return {
      name: 'grok3',
      description: 'Perform research using Grok-3 with real-time web access',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The research query',
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
              includePageContent: {
                type: 'boolean',
                default: false,
                description:
                  'Whether to include full page content for each result',
              },
              browsePage: {
                type: 'string',
                format: 'uri',
                description: 'URL to browse for additional context',
              },
            },
          },
        },
        required: ['query'],
      },
    }
  }
}
