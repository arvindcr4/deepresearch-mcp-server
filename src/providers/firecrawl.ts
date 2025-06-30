import { DeepResearchProvider, SearchResult, PageContent } from './index.js'
import { logger } from '../utils/logger.js'
import {
  FirecrawlProviderOptions,
  FirecrawlSearchItem,
} from '../types/providers.js'

export class FirecrawlProvider implements DeepResearchProvider {
  private apiKey: string
  private baseUrl: string = 'https://api.firecrawl.dev'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async search(
    query: string,
    options: FirecrawlProviderOptions = {}
  ): Promise<SearchResult> {
    const startTime = Date.now()

    try {
      logger.info(`Performing Firecrawl search for: ${query}`)

      // Firecrawl's search endpoint
      const searchPayload = {
        query,
        limit: options.maxResults || 10,
        searchOptions: {
          limit: options.maxResults || 10,
        },
      }

      const response = await fetch(`${this.baseUrl}/v1/search`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchPayload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Firecrawl API error: ${response.status} ${response.statusText} - ${errorText}`
        )
      }

      const data = await response.json()

      // Transform Firecrawl response to our SearchResult format

      const results = ((data.data || []) as FirecrawlSearchItem[]).map(
        (item) => ({
          title: item.title || item.url || 'Untitled',
          url: item.url || '',
          snippet: item.description || item.content?.substring(0, 200) || '',
          relevanceScore: item.score || undefined,
          publishedDate: item.publishedDate || undefined,
          source: 'firecrawl',
        })
      )

      const searchTime = Date.now() - startTime

      return {
        query,
        results,
        metadata: {
          totalResults: data.total || results.length,
          searchTime,
          provider: 'firecrawl',
          success: data.success || true,
        },
      }
    } catch (error) {
      logger.error(
        'Firecrawl search error:',
        error instanceof Error ? error : new Error(String(error))
      )
      throw new Error(
        `Firecrawl search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async browsePage(
    url: string,
    options: FirecrawlProviderOptions = {}
  ): Promise<PageContent> {
    try {
      logger.info(`Browsing page with Firecrawl: ${url}`)

      const crawlPayload = {
        url,
        crawlerOptions: {
          includes: [url],
          excludes: [],
          generateImgAltText: false,
          returnOnlyUrls: false,
          maxDepth: 0,
          limit: 1,
        },
        pageOptions: {
          onlyMainContent: options.onlyMainContent || true,
          includeHtml: options.includeHtml || false,
          screenshot: options.screenshot || false,
        },
      }

      const response = await fetch(`${this.baseUrl}/v1/crawl`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(crawlPayload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Firecrawl crawl API error: ${response.status} ${response.statusText} - ${errorText}`
        )
      }

      const data = await response.json()

      if (!data.success || !data.data || data.data.length === 0) {
        throw new Error('No page content retrieved from Firecrawl')
      }

      const pageData = data.data[0]

      return {
        url: pageData.url || url,
        title: pageData.title || 'Untitled',
        content: pageData.content || pageData.markdown || '',
        metadata: {
          extractedAt: new Date().toISOString(),
          contentLength: (pageData.content || pageData.markdown || '').length,
          statusCode: pageData.statusCode,
          provider: 'firecrawl',
        },
      }
    } catch (error) {
      logger.error(
        'Firecrawl page browsing error:',
        error instanceof Error ? error : new Error(String(error))
      )
      throw new Error(
        `Firecrawl page browsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}
