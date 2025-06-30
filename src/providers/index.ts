import { ProviderOptions, ProviderMetadata } from '../types/providers.js'

export interface DeepResearchProvider {
  /**
   * Perform a search query using the provider's search capabilities
   * @param query The search query string
   * @param options Optional search parameters specific to the provider
   * @returns Promise resolving to search results
   */
  search(query: string, options?: ProviderOptions): Promise<SearchResult>

  /**
   * Browse a specific page/URL if supported by the provider
   * @param url The URL to browse
   * @param options Optional browsing parameters
   * @returns Promise resolving to page content
   */
  browsePage?(url: string, options?: ProviderOptions): Promise<PageContent>
}

export interface SearchResult {
  query: string
  results: SearchItem[]
  metadata?: ProviderMetadata
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
    provider?: string
    status?: string
    message?: string
    [key: string]: unknown
  }
}

// Export the factory and related types
export { ProviderFactory, type ProviderType } from './factory.js'
