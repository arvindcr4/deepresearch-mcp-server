import { ProviderFactory, ProviderType } from '../../providers/factory.js'
import {
  zDeepResearchQuery,
  zDeepResearchResponse,
  DeepResearchQuery,
  DeepResearchResponseType,
} from '../../schemas/deepResearch.js'
import { McpError, BaseErrorCode } from '../../types/errors.js'
import { logger } from '../../utils/logger.js'
import { createToolResponse, McpToolResponse } from '../../types/mcp.js'

export interface McpTool {
  name: string
  description: string
  inputSchema: typeof zDeepResearchQuery
  outputSchema: typeof zDeepResearchResponse
  run: (args: DeepResearchQuery) => Promise<DeepResearchResponseType>
}

/**
 * Unified deep research tool that uses the Strategy pattern via ProviderFactory.
 * This tool allows users to perform deep research using any of the configured providers
 * (OpenAI, Perplexity, or Grok) through a single, consistent interface.
 */
export const deepResearchTool: McpTool = {
  name: 'deep_research_search',
  description:
    'Perform comprehensive deep research using AI-powered search across multiple providers (OpenAI, Perplexity, Grok). Supports real-time web search, content analysis, and page browsing capabilities.',

  inputSchema: zDeepResearchQuery,
  outputSchema: zDeepResearchResponse,

  run: async (args: DeepResearchQuery): Promise<DeepResearchResponseType> => {
    const startTime = Date.now()

    try {
      logger.info('Starting deep research', {
        query: args.query,
        provider: args.provider,
        model: args.model,
      })

      // Validate and get the provider using the Strategy pattern
      const client = ProviderFactory.get(args.provider)

      // Prepare search options based on provider capabilities
      const searchOptions = prepareSearchOptions(args)

      // Perform the search
      const searchResults = await client.search(args.query, searchOptions)

      // Prepare the base response
      const response: DeepResearchResponseType = {
        query: args.query,
        provider: args.provider,
        searchResults,
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          totalResults: searchResults.results.length,
          availableProviders: ProviderFactory.getAvailableProviders(),
        },
      }

      // Handle page browsing if requested and supported
      if (args.browsePage && client.browsePage) {
        try {
          logger.info('Browsing additional page', { url: args.browsePage })
          const pageContent = await client.browsePage(
            args.browsePage,
            searchOptions
          )
          response.pageContent = pageContent
        } catch (error) {
          logger.warn('Page browsing failed', {
            url: args.browsePage,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          // Don't fail the entire request if page browsing fails
        }
      }

      logger.info('Deep research completed successfully', {
        query: args.query,
        provider: args.provider,
        totalResults: response.metadata.totalResults,
        processingTime: response.metadata.processingTime,
      })

      return response
    } catch (error) {
      const processingTime = Date.now() - startTime

      logger.error('Deep research failed', {
        query: args.query,
        provider: args.provider,
        processingTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      // Re-throw McpErrors as-is
      if (error instanceof McpError) {
        throw error
      }

      // Wrap other errors in McpError
      throw new McpError(
        BaseErrorCode.INTERNAL_ERROR,
        `Deep research failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { provider: args.provider, query: args.query, processingTime }
      )
    }
  },
}

/**
 * Prepare search options based on the provider and user preferences.
 * This function maps the unified interface to provider-specific options.
 */
function prepareSearchOptions(args: DeepResearchQuery): Record<string, any> {
  const options: Record<string, any> = {}

  // Common options
  if (args.model !== undefined) options.model = args.model
  if (args.temperature !== undefined) options.temperature = args.temperature
  if (args.max_tokens !== undefined) options.max_tokens = args.max_tokens
  if (args.maxResults !== undefined) options.maxResults = args.maxResults
  if (args.includePageContent !== undefined)
    options.includePageContent = args.includePageContent

  // Provider-specific options
  switch (args.provider) {
    case 'perplexity':
      if (args.recency !== undefined) options.recency = args.recency
      break

    case 'grok':
      if (args.searchDepth !== undefined) options.searchDepth = args.searchDepth
      if (args.realTimeData !== undefined)
        options.realTimeData = args.realTimeData
      break

    case 'openai':
      // OpenAI-specific options can be added here as needed
      break
  }

  return options
}

/**
 * Create a tool response wrapper for the MCP server.
 * This function adapts the tool response to the MCP protocol format.
 */
export async function executeDeepResearchTool(
  args: Record<string, unknown>
): Promise<McpToolResponse> {
  try {
    // Validate input using Zod schema
    const validatedArgs = zDeepResearchQuery.parse(args)

    // Execute the tool
    const result = await deepResearchTool.run(validatedArgs)

    // Validate output using Zod schema
    const validatedResult = zDeepResearchResponse.parse(result)

    // Return formatted response
    return createToolResponse(JSON.stringify(validatedResult, null, 2))
  } catch (error) {
    if (error instanceof McpError) {
      return error.toResponse()
    }

    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as {
        issues: Array<{ message: string; path: any[] }>
      }
      const messages = zodError.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ')

      return createToolResponse(`Input validation error: ${messages}`, true)
    }

    return createToolResponse(
      `Deep research error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    )
  }
}

/**
 * Get tool definition for MCP server registration.
 * This provides the metadata needed to register the tool with the MCP server.
 */
export function getDeepResearchToolDefinition() {
  return {
    name: deepResearchTool.name,
    description: deepResearchTool.description,
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
  }
}
