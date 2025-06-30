/**
 * Type definitions for tool handler arguments
 */

export interface OpenAIResearchArgs {
  query: string
  options?: {
    maxResults?: number
    includePageContent?: boolean
    browsePage?: string
    model?: 'o3-deep-research' | 'o4-mini-deep-research'
    temperature?: number
    max_tokens?: number
  }
}

export interface PerplexitySearchArgs {
  query: string
  options?: {
    maxResults?: number
    recency?: 'day' | 'week' | 'month' | 'year'
  }
}

export interface GrokResearchArgs {
  query: string
  options?: {
    maxResults?: number
    includePageContent?: boolean
    browsePage?: string
  }
}

export interface FirecrawlSearchArgs {
  query: string
  options?: {
    maxResults?: number
    scrapeOptions?: {
      formats?: string[]
      onlyMainContent?: boolean
      includeTags?: string[]
      excludeTags?: string[]
      waitFor?: number
    }
  }
}

export interface AgentspaceSearchArgs {
  query: string
  options?: {
    maxResults?: number
    searchDepth?: 'basic' | 'deep'
    includePageContent?: boolean
  }
}

export type ToolHandlerArgs =
  | OpenAIResearchArgs
  | PerplexitySearchArgs
  | GrokResearchArgs
  | FirecrawlSearchArgs
  | AgentspaceSearchArgs
