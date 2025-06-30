// Using simple interfaces instead of complex zod inference
import {
  OpenAIProviderOptions,
  PerplexityProviderOptions,
  GrokProviderOptions,
} from '../types/providers.js'

interface ToolCallRequest {
  params: {
    name: string
    arguments: unknown
  }
}

interface ToolListResult {
  tools: Array<{
    name: string
    description: string
    inputSchema: {
      type: string
      properties: Record<string, unknown>
      required?: string[]
    }
  }>
}

interface ToolCallResult {
  content: Array<{
    type: string
    text: string
  }>
}

import { DeepResearchProvider } from '../providers/index.js'
import { OpenAIProvider } from '../providers/openai.js'
import { PerplexityProvider } from '../providers/perplexity.js'
import { GrokProvider } from '../providers/grok.js'
import { FirecrawlProvider } from '../providers/firecrawl.js'
import { AgentspaceProvider } from '../providers/agentspace.js'
import { UnifiedDeepResearchTool } from './tools/deep-research-unified.js'
import { config } from '../config/index.js'
import { logger } from '../utils/logger.js'
import { McpError, BaseErrorCode } from '../utils/errors.js'
import {
  openAIResearchArgsSchema,
  perplexitySonarArgsSchema,
  grok3ArgsSchema,
  validateArgs,
} from '../schemas/validation.js'
import { ZodValidator } from '../middleware/validation.js'

export class DeepResearchRouter {
  private providers: Map<string, DeepResearchProvider> = new Map()

  constructor() {
    this.initializeProviders()
  }

  private initializeProviders(): void {
    try {
      // Initialize providers based on available API keys
      if (config.apiKeys.openai) {
        this.providers.set('openai', new OpenAIProvider(config.apiKeys.openai))
        logger.info('OpenAI provider initialized')
      }

      if (config.apiKeys.perplexity) {
        this.providers.set(
          'perplexity',
          new PerplexityProvider(config.apiKeys.perplexity)
        )
        logger.info('Perplexity provider initialized')
      }

      if (config.apiKeys.xaiGrok) {
        this.providers.set('grok', new GrokProvider(config.apiKeys.xaiGrok))
        logger.info('Grok provider initialized')
      }

      if (config.apis.firecrawl?.apiKey) {
        this.providers.set(
          'firecrawl',
          new FirecrawlProvider(config.apis.firecrawl.apiKey)
        )
        logger.info('Firecrawl provider initialized')
      }

      if (config.apis.agentspace?.apiKey) {
        this.providers.set(
          'agentspace',
          new AgentspaceProvider(
            config.apis.agentspace.apiKey,
            config.apis.agentspace.baseUrl
          )
        )
        logger.info('Agentspace Google Deep Research provider initialized')
      }

      if (this.providers.size === 0) {
        logger.warn('No providers initialized - check API key configuration')
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      logger.error(
        'Error initializing providers:',
        error instanceof Error ? error : new Error(errorMessage)
      )
      throw new McpError(
        BaseErrorCode.INTERNAL_ERROR,
        'Failed to initialize providers'
      )
    }
  }

  async listTools(): Promise<ToolListResult> {
    const tools = [
      {
        name: 'deep-research-unified',
        description:
          'Perform comprehensive deep research using multiple AI providers with unified interface and validation',
        inputSchema: UnifiedDeepResearchTool.getToolDefinition().inputSchema,
      },
      {
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
                },
                includePageContent: { type: 'boolean', default: false },
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
      },
      {
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
      },
      {
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
                },
                includePageContent: { type: 'boolean', default: false },
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
      },
    ]

    return { tools }
  }

  async callTool(request: ToolCallRequest): Promise<ToolCallResult> {
    const { name, arguments: args } = request.params

    try {
      switch (name) {
        case 'deep-research-unified':
          return await this.handleUnifiedResearch(args)
        case 'openai-deep-research':
          return await this.handleOpenAIResearch(args)
        case 'perplexity-sonar':
          return await this.handlePerplexitySearch(args)
        case 'grok3':
          return await this.handleGrokResearch(args)
        default:
          throw new McpError(
            BaseErrorCode.INVALID_REQUEST,
            `Unknown tool: ${name}`
          )
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      logger.error(
        `Error calling tool ${name}:`,
        error instanceof Error ? error : new Error(errorMessage)
      )
      throw error instanceof McpError
        ? error
        : new McpError(
            BaseErrorCode.INTERNAL_ERROR,
            `Tool execution failed: ${errorMessage}`
          )
    }
  }

  private async handleUnifiedResearch(args: unknown): Promise<ToolCallResult> {
    try {
      // Create unified tool instance
      const unifiedTool = new UnifiedDeepResearchTool()

      // Execute search with Zod validation
      const result = await unifiedTool.execute(args)

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      }
    } catch (error) {
      logger.error(
        'Unified research failed:',
        error instanceof Error ? error : new Error(String(error))
      )
      throw error instanceof McpError
        ? error
        : new McpError(
            BaseErrorCode.INTERNAL_ERROR,
            `Unified research failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
    }
  }

  private async handleOpenAIResearch(args: unknown): Promise<ToolCallResult> {
    const provider = this.providers.get('openai')
    if (!provider) {
      throw new McpError(
        BaseErrorCode.INTERNAL_ERROR,
        'OpenAI provider not available'
      )
    }

    // Validate arguments
    let validatedArgs
    try {
      validatedArgs = validateArgs(
        openAIResearchArgsSchema,
        args,
        'openai-deep-research'
      )
    } catch (error) {
      throw new McpError(
        BaseErrorCode.INVALID_REQUEST,
        error instanceof Error ? error.message : 'Invalid arguments'
      )
    }

    const { query, options = {} } = validatedArgs
    const result = await provider.search(
      query,
      options as OpenAIProviderOptions
    )

    // If page browsing is requested and URL is in options
    if (options?.browsePage && provider.browsePage) {
      const pageContent = await provider.browsePage(
        options.browsePage,
        options as OpenAIProviderOptions
      )
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { searchResults: result, pageContent },
              null,
              2
            ),
          },
        ],
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  }

  private async handlePerplexitySearch(args: unknown): Promise<ToolCallResult> {
    const provider = this.providers.get('perplexity')
    if (!provider) {
      throw new McpError(
        BaseErrorCode.INTERNAL_ERROR,
        'Perplexity provider not available'
      )
    }

    // Validate arguments
    let validatedArgs
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

    const { query, options = {} } = validatedArgs
    const result = await provider.search(
      query,
      options as PerplexityProviderOptions
    )

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  }

  private async handleGrokResearch(args: unknown): Promise<ToolCallResult> {
    const provider = this.providers.get('grok')
    if (!provider) {
      throw new McpError(
        BaseErrorCode.INTERNAL_ERROR,
        'Grok provider not available'
      )
    }

    // Validate arguments
    let validatedArgs
    try {
      validatedArgs = validateArgs(grok3ArgsSchema, args, 'grok3')
    } catch (error) {
      throw new McpError(
        BaseErrorCode.INVALID_REQUEST,
        error instanceof Error ? error.message : 'Invalid arguments'
      )
    }

    const { query, options = {} } = validatedArgs
    const result = await provider.search(query, options as GrokProviderOptions)

    // If page browsing is requested
    if (options?.browsePage && provider.browsePage) {
      const pageContent = await provider.browsePage(
        options.browsePage,
        options as GrokProviderOptions
      )
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { searchResults: result, pageContent },
              null,
              2
            ),
          },
        ],
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  }
}
