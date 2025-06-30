/**
 * Type definitions for provider-specific options and metadata
 */

export interface OpenAIProviderOptions {
  model?: 'o3-deep-research' | 'o4-mini-deep-research'
  temperature?: number
  max_tokens?: number
  maxResults?: number
  includePageContent?: boolean
  browsePage?: string
}

export interface PerplexityProviderOptions {
  maxResults?: number
  recency?: 'day' | 'week' | 'month' | 'year'
  // Additional options that the provider uses
  model?: string
  temperature?: number
  max_tokens?: number
}

export interface GrokProviderOptions {
  maxResults?: number
  includePageContent?: boolean
  browsePage?: string
  // Additional options that the provider uses
  model?: string
  temperature?: number
  max_tokens?: number
  extract_content?: boolean
  summarize?: boolean
}

export interface FirecrawlProviderOptions {
  maxResults?: number
  // Additional properties that the provider uses
  onlyMainContent?: boolean
  includeHtml?: boolean
  screenshot?: boolean
  scrapeOptions?: {
    formats?: string[]
    onlyMainContent?: boolean
    includeTags?: string[]
    excludeTags?: string[]
    waitFor?: number
  }
}

export interface AgentspaceProviderOptions {
  maxResults?: number
  searchDepth?: 'basic' | 'deep'
  includePageContent?: boolean
  // Search options
  recency?: 'day' | 'week' | 'month' | 'year'
  language?: string
  region?: string
  includeAnalysis?: boolean
  depth?: 'quick' | 'standard' | 'comprehensive'
  // Page browsing options
  extractMainContent?: boolean
  includeMetadata?: boolean
  format?: 'text' | 'markdown' | 'html'
  removeAds?: boolean
  removeNavigation?: boolean
  extractImages?: boolean
  maxContentLength?: number
  // Analysis options
  analysisDepth?: 'basic' | 'comprehensive'
  includeCitations?: boolean
  includeCounterArguments?: boolean
  perspective?: 'neutral' | 'academic' | 'business' | 'technical'
  outputFormat?: 'structured' | 'narrative' | 'summary'
  maxLength?: number
}

// Add missing properties to interface definitions
export interface AgentspaceSearchItem {
  title: string
  url: string
  snippet?: string
  description?: string
  relevance_score?: number
  published_date?: string
  source?: string
  // Additional properties that might be present
  link?: string
  summary?: string
  content?: string
  confidence?: number
  date?: string
}

export interface FirecrawlSearchItem {
  title: string
  url: string
  description?: string
  snippet?: string
  publishedDate?: string
  // Additional properties that might be present
  content?: string
  score?: number
}

export type ProviderOptions =
  | OpenAIProviderOptions
  | PerplexityProviderOptions
  | GrokProviderOptions
  | FirecrawlProviderOptions
  | AgentspaceProviderOptions

export interface ProviderMetadata {
  totalResults?: number
  searchTime?: number
  provider: string
  model?: string
  answer?: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  processingTime?: number
  sources?: string[]
  confidence?: number
  [key: string]: unknown // Allow provider-specific fields
}
