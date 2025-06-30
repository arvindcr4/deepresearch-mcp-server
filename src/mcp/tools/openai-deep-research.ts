import { OpenAIProvider } from '../../providers/openai.js'
import { config } from '../../config/index.js'
import { logger } from '../../utils/logger.js'
import { McpError, BaseErrorCode } from '../../types/errors.js'
import {
  openAIResearchArgsSchema,
  validateArgs,
  type OpenAIResearchArgs,
} from '../../schemas/validation.js'
import { SearchResult, PageContent } from '../../providers/index.js'
import { OpenAIProviderOptions } from '../../types/providers.js'

export class OpenAIDeepResearchTool {
  private provider: OpenAIProvider

  constructor() {
    if (!config.apis.openai?.apiKey) {
      throw new McpError(
        BaseErrorCode.VALIDATION_ERROR,
        'OpenAI API key not configured'
      )
    }
    this.provider = new OpenAIProvider(config.apis.openai.apiKey)
  }

  async execute(args: unknown) {
    try {
      // Validate arguments
      let validatedArgs: OpenAIResearchArgs
      try {
        validatedArgs = validateArgs(
          openAIResearchArgsSchema,
          args,
          'openai-deep-research'
        )
      } catch (error) {
        throw new McpError(
          BaseErrorCode.VALIDATION_ERROR,
          error instanceof Error ? error.message : 'Invalid arguments'
        )
      }

      logger.info('Executing OpenAI deep research', {
        query: validatedArgs.query,
      })

      const searchResults = await this.provider.search(
        validatedArgs.query,
        validatedArgs.options as OpenAIProviderOptions
      )

      const result: { searchResults: SearchResult; pageContent?: PageContent } =
        { searchResults }

      // If page browsing is requested
      if (validatedArgs.options?.browsePage && this.provider.browsePage) {
        const pageContent = await this.provider.browsePage(
          validatedArgs.options.browsePage,
          validatedArgs.options as OpenAIProviderOptions
        )
        result.pageContent = pageContent
      }

      logger.info('OpenAI deep research completed', {
        query: validatedArgs.query,
        resultCount: searchResults.results.length,
      })

      return result
    } catch (error) {
      logger.error('OpenAI deep research failed', { error })
      throw error instanceof McpError
        ? error
        : new McpError(
            BaseErrorCode.INTERNAL_ERROR,
            `OpenAI research failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
    }
  }

  static getToolDefinition() {
    return {
      name: 'openai-deep-research',
      description:
        'Perform deep research using OpenAI with web browsing capabilities',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The research query to search for',
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
                description: 'Specific URL to browse for additional context',
              },
            },
          },
        },
        required: ['query'],
      },
    }
  }
}
