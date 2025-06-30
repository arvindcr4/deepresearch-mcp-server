import { z } from 'zod'
import { ValidationSchema } from '../middleware/validation.js'

// Provider type schema
export const zProviderType = z.enum(['openai', 'perplexity', 'grok'])

// Citation schema for sources
export const zCitation = z.object({
  title: z.string().describe('Title of the cited source'),
  url: z.string().url().describe('URL of the cited source'),
  snippet: z.string().optional().describe('Relevant snippet from the source'),
  publishedDate: z
    .string()
    .optional()
    .describe('Publication date of the source'),
  relevanceScore: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Relevance score of the citation'),
})

// Provider metadata schema
export const zProviderMeta = z.object({
  provider: z.string().describe('Name of the provider used'),
  model: z.string().optional().describe('Model used by the provider'),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
      search_queries: z
        .number()
        .optional()
        .describe('Number of search queries performed'),
      api_calls: z.number().optional().describe('Number of API calls made'),
    })
    .optional()
    .describe('Usage statistics from the provider'),
  searchTime: z
    .number()
    .optional()
    .describe('Time taken for search in milliseconds'),
  responseTime: z
    .number()
    .optional()
    .describe('Total response time in milliseconds'),
  searchDepth: z
    .enum(['shallow', 'medium', 'deep'])
    .optional()
    .describe('Depth of search performed'),
  realTimeData: z
    .boolean()
    .optional()
    .describe('Whether real-time data was used'),
  metadata: z
    .record(z.unknown())
    .optional()
    .describe('Additional provider-specific metadata'),
})

// Deep research query schema
export const zDeepResearchQuery = z.object({
  query: z
    .string()
    .min(1)
    .max(1000)
    .describe('The research query to search for'),
  provider: zProviderType
    .default('openai')
    .describe('The provider to use for the search'),
  model: z.string().optional().describe('The model to use (provider-specific)'),
  temperature: z
    .number()
    .min(0)
    .max(2)
    .optional()
    .describe('Temperature for the model'),
  max_tokens: z
    .number()
    .min(1)
    .max(4000)
    .optional()
    .describe('Maximum tokens for the response'),
  maxResults: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .default(10)
    .describe('Maximum number of search results'),
  includePageContent: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to include full page content'),
  browsePage: z
    .string()
    .url()
    .optional()
    .describe('Specific URL to browse for additional context'),
  recency: z
    .enum(['day', 'week', 'month', 'year'])
    .optional()
    .describe('Time filter for search results (Perplexity only)'),
  searchDepth: z
    .enum(['shallow', 'medium', 'deep'])
    .optional()
    .describe('Search depth (Grok only)'),
  realTimeData: z
    .boolean()
    .optional()
    .describe('Use real-time data (Grok only)'),
  searchDomainFilter: z
    .array(z.string())
    .optional()
    .describe('Domain filter for search results (Perplexity only)'),
  includeAnalysis: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to include AI analysis of results'),
  context: z
    .string()
    .optional()
    .describe('Additional context for the research query'),
})

// Search item schema
export const zSearchItem = z.object({
  title: z.string(),
  url: z.string().url(),
  snippet: z.string(),
  relevanceScore: z.number().optional(),
  publishedDate: z.string().optional(),
  source: z.string().optional(),
})

// Search result metadata schema
export const zSearchResultMetadata = z
  .object({
    totalResults: z.number().optional(),
    searchTime: z.number().optional(),
    provider: z.string(),
    model: z.string().optional(),
    answer: z.string().optional(),
    usage: z
      .object({
        prompt_tokens: z.number().optional(),
        completion_tokens: z.number().optional(),
        total_tokens: z.number().optional(),
      })
      .optional(),
  })
  .catchall(z.unknown())

// Search result schema
export const zSearchResult = z.object({
  query: z.string(),
  results: z.array(zSearchItem),
  metadata: zSearchResultMetadata.optional(),
})

// Page content metadata schema
export const zPageContentMetadata = z
  .object({
    extractedAt: z.string(),
    contentLength: z.number(),
    provider: z.string().optional(),
    status: z.string().optional(),
    message: z.string().optional(),
  })
  .catchall(z.unknown())

// Page content schema
export const zPageContent = z.object({
  url: z.string().url(),
  title: z.string(),
  content: z.string(),
  metadata: zPageContentMetadata.optional(),
})

// Deep research response schema
export const zDeepResearchResponse = z.object({
  query: z.string(),
  provider: z.string(),
  searchResults: zSearchResult,
  pageContent: zPageContent.optional(),
  metadata: z.object({
    timestamp: z.string(),
    processingTime: z.number(),
    totalResults: z.number(),
    availableProviders: z.array(z.string()).optional(),
  }),
})

// Type exports for TypeScript usage
export type DeepResearchQuery = z.infer<typeof zDeepResearchQuery>
export type DeepResearchResponseType = z.infer<typeof zDeepResearchResponse>

// Legacy request schemas for backward compatibility
export const deepResearchRequestSchema: ValidationSchema = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      minLength: 1,
      maxLength: 1000,
    },
    options: {
      type: 'object',
      properties: {
        maxResults: {
          type: 'number',
          minimum: 1,
          maximum: 100,
        },
        includePageContent: {
          type: 'boolean',
        },
        browsePage: {
          type: 'string',
          pattern: '^https?://.+',
        },
        recency: {
          type: 'string',
          enum: ['day', 'week', 'month', 'year'],
        },
        provider: {
          type: 'string',
          enum: ['openai', 'perplexity', 'grok', 'auto'],
        },
      },
    },
  },
  required: ['query'],
}

export const openaiRequestSchema: ValidationSchema = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      minLength: 1,
      maxLength: 1000,
    },
    options: {
      type: 'object',
      properties: {
        maxResults: {
          type: 'number',
          minimum: 1,
          maximum: 50,
        },
        includePageContent: {
          type: 'boolean',
        },
        browsePage: {
          type: 'string',
          pattern: '^https?://.+',
        },
        model: {
          type: 'string',
          enum: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        },
        temperature: {
          type: 'number',
          minimum: 0,
          maximum: 2,
        },
      },
    },
  },
  required: ['query'],
}

export const perplexityRequestSchema: ValidationSchema = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      minLength: 1,
      maxLength: 1000,
    },
    options: {
      type: 'object',
      properties: {
        maxResults: {
          type: 'number',
          minimum: 1,
          maximum: 30,
        },
        recency: {
          type: 'string',
          enum: ['day', 'week', 'month', 'year'],
        },
        model: {
          type: 'string',
          enum: [
            'sonar-small-online',
            'sonar-medium-online',
            'sonar-small-chat',
            'sonar-medium-chat',
          ],
        },
        searchDomainFilter: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
    },
  },
  required: ['query'],
}

export const grokRequestSchema: ValidationSchema = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      minLength: 1,
      maxLength: 1000,
    },
    options: {
      type: 'object',
      properties: {
        maxResults: {
          type: 'number',
          minimum: 1,
          maximum: 40,
        },
        includePageContent: {
          type: 'boolean',
        },
        browsePage: {
          type: 'string',
          pattern: '^https?://.+',
        },
        realTimeData: {
          type: 'boolean',
        },
        searchDepth: {
          type: 'string',
          enum: ['shallow', 'medium', 'deep'],
        },
      },
    },
  },
  required: ['query'],
}

// Response type definitions (for TypeScript)
export interface DeepResearchResponse {
  query: string
  provider: string
  searchResults: SearchResult
  pageContent?: PageContent
  metadata: {
    timestamp: string
    processingTime: number
    totalResults: number
  }
}

export interface SearchResult {
  query: string
  results: SearchItem[]
  metadata?: {
    totalResults?: number
    searchTime?: number
    provider: string
    [key: string]: unknown
  }
}

export interface SearchItem {
  title: string
  url: string
  snippet: string
  relevanceScore?: number
  publishedDate?: string
  source?: string
}

export interface PageContent {
  url: string
  title: string
  content: string
  metadata?: {
    extractedAt: string
    contentLength: number
    [key: string]: unknown
  }
}

// Tool schema registry
export const toolSchemas = {
  'openai-deep-research': openaiRequestSchema,
  'perplexity-sonar': perplexityRequestSchema,
  grok3: grokRequestSchema,
} as const

// Utility function to get schema for a tool
export function getSchemaForTool(
  toolName: string
): ValidationSchema | undefined {
  return toolSchemas[toolName as keyof typeof toolSchemas]
}
