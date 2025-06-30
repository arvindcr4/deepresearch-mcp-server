import { DeepResearchProvider, SearchResult, PageContent } from './index.js'
import { logger } from '../utils/logger.js'
import {
  AgentspaceProviderOptions,
  AgentspaceSearchItem,
} from '../types/providers.js'

export class AgentspaceProvider implements DeepResearchProvider {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey
    this.baseUrl = baseUrl || 'https://api.agentspace.dev'
  }

  async search(
    query: string,
    options: AgentspaceProviderOptions = {}
  ): Promise<SearchResult> {
    const startTime = Date.now()

    try {
      logger.info(
        `Performing Google Deep Research via Agentspace for: ${query}`
      )

      // Agentspace Google Deep Research endpoint
      const searchPayload = {
        query,
        service: 'google-deep-research',
        parameters: {
          max_results: options.maxResults || 10,
          recency: options.recency || undefined,
          language: options.language || 'en',
          region: options.region || 'us',
          include_analysis: options.includeAnalysis !== false,
          depth: options.depth || 'comprehensive', // 'quick', 'standard', 'comprehensive'
        },
      }

      const response = await fetch(`${this.baseUrl}/v1/research`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'DeepResearch-MCP-Server/1.0',
        },
        body: JSON.stringify(searchPayload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Agentspace API error: ${response.status} ${response.statusText} - ${errorText}`
        )
      }

      const data = await response.json()

      // Transform Agentspace response to our SearchResult format

      const results = ((data.results || []) as AgentspaceSearchItem[]).map(
        (item) => ({
          title: item.title || 'Untitled',
          url: item.url || item.link || '',
          snippet:
            item.snippet ||
            item.summary ||
            item.content?.substring(0, 200) ||
            '',
          relevanceScore: item.relevance_score || item.confidence || undefined,
          publishedDate: item.published_date || item.date || undefined,
          source: item.source || 'google-deep-research',
        })
      )

      const searchTime = Date.now() - startTime

      return {
        query,
        results,
        metadata: {
          totalResults: data.total_results || results.length,
          searchTime,
          provider: 'agentspace-google',
          analysis: data.analysis || undefined,
          insights: data.insights || undefined,
          research_depth: data.research_depth || searchPayload.parameters.depth,
          query_understanding: data.query_understanding || undefined,
        },
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      logger.error('Agentspace Google Deep Research error:', errorObj)
      throw new Error(`Agentspace research failed: ${errorObj.message}`)
    }
  }

  async browsePage(
    url: string,
    options: AgentspaceProviderOptions = {}
  ): Promise<PageContent> {
    try {
      logger.info(`Browsing page with Agentspace: ${url}`)

      const browsePayload = {
        url,
        service: 'web-content-extraction',
        parameters: {
          extract_main_content: options.extractMainContent !== false,
          include_metadata: options.includeMetadata !== false,
          format: options.format || 'markdown', // 'text', 'markdown', 'html'
          remove_ads: options.removeAds !== false,
          remove_navigation: options.removeNavigation !== false,
          extract_images: options.extractImages || false,
          max_content_length: options.maxContentLength || undefined,
        },
      }

      const response = await fetch(`${this.baseUrl}/v1/extract`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'DeepResearch-MCP-Server/1.0',
        },
        body: JSON.stringify(browsePayload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Agentspace extract API error: ${response.status} ${response.statusText} - ${errorText}`
        )
      }

      const data = await response.json()

      if (!data.success || !data.content) {
        throw new Error('No page content retrieved from Agentspace')
      }

      return {
        url: data.url || url,
        title: data.title || data.metadata?.title || 'Untitled',
        content: data.content || '',
        metadata: {
          extractedAt: new Date().toISOString(),
          contentLength: (data.content || '').length,
          provider: 'agentspace',
          language: data.metadata?.language,
          author: data.metadata?.author,
          publishedDate: data.metadata?.published_date,
          description: data.metadata?.description,
          keywords: data.metadata?.keywords,
          images: data.images || undefined,
          links: data.links || undefined,
        },
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      logger.error('Agentspace page browsing error:', errorObj)
      throw new Error(`Agentspace page browsing failed: ${errorObj.message}`)
    }
  }

  // Additional method specific to Google Deep Research
  async performDeepAnalysis(
    query: string,
    sources: string[] = [],
    options: AgentspaceProviderOptions = {}
  ): Promise<{
    analysis: string
    citations: Array<{
      title: string
      url: string
      snippet: string
      relevance_score?: number
    }>
    metadata?: {
      processingTime: number
      sources: string[]
      confidence?: number
    }
  }> {
    try {
      logger.info(`Performing deep analysis via Agentspace for: ${query}`)

      const analysisPayload = {
        query,
        sources,
        service: 'google-deep-analysis',
        parameters: {
          analysis_depth: options.analysisDepth || 'comprehensive',
          include_citations: options.includeCitations !== false,
          include_counter_arguments: options.includeCounterArguments !== false,
          perspective: options.perspective || 'neutral', // 'neutral', 'academic', 'business', 'technical'
          output_format: options.outputFormat || 'structured', // 'structured', 'narrative', 'summary'
          max_length: options.maxLength || undefined,
        },
      }

      const response = await fetch(`${this.baseUrl}/v1/analyze`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'DeepResearch-MCP-Server/1.0',
        },
        body: JSON.stringify(analysisPayload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Agentspace analysis API error: ${response.status} ${response.statusText} - ${errorText}`
        )
      }

      const data = await response.json()
      return data
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      logger.error('Agentspace deep analysis error:', errorObj)
      throw new Error(`Agentspace deep analysis failed: ${errorObj.message}`)
    }
  }
}
