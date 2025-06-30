import { DeepResearchProvider, SearchResult, PageContent } from './index.js'
import { rateLimitManager } from '../config/index.js'
import { createSanitizedApiError } from '../middleware/errorSanitizer.js'
import { secureLogger } from '../utils/secureLogger.js'
import { GrokProviderOptions } from '../types/providers.js'

interface GrokSearchRequest {
  query: string
  model?: string
  temperature?: number
  max_tokens?: number
}

interface GrokSearchResponse {
  results: Array<{
    title: string
    url: string
    snippet: string
    relevance_score?: number
  }>
  metadata?: {
    search_time?: number
    total_results?: number
  }
}

interface GrokBrowseRequest {
  url: string
  extract_content?: boolean
  summarize?: boolean
}

interface GrokBrowseResponse {
  title: string
  content: string
  metadata?: {
    content_length?: number
    extracted_at?: string
  }
}

export class GrokProvider implements DeepResearchProvider {
  private apiKey: string
  private baseUrl: string = 'https://api.x.ai'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async search(
    query: string,
    options?: GrokProviderOptions
  ): Promise<SearchResult> {
    const grokSearchRequest: GrokSearchRequest = {
      query,
      model: options?.model || 'grok-3',
      temperature: options?.temperature,
      max_tokens: options?.max_tokens,
    }

    const response = await this.performGrokSearch(grokSearchRequest)

    // Convert the response to the expected SearchResult format
    const searchItems = response.results.map((item) => ({
      title: item.title,
      url: item.url,
      snippet: item.snippet,
      relevanceScore: item.relevance_score,
      source: 'xAI Grok DeepSearch',
    }))

    return {
      query,
      results: searchItems,
      metadata: {
        totalResults: response.metadata?.total_results || searchItems.length,
        searchTime: response.metadata?.search_time || Date.now(),
        provider: 'xAI Grok',
        model: grokSearchRequest.model,
      },
    }
  }

  async browsePage(
    url: string,
    options?: GrokProviderOptions
  ): Promise<PageContent> {
    const browseRequest: GrokBrowseRequest = {
      url,
      extract_content: options?.extract_content !== false,
      summarize: options?.summarize || false,
    }

    const response = await this.performGrokBrowse(browseRequest)

    return {
      url,
      title: response.title,
      content: response.content,
      metadata: {
        extractedAt:
          response.metadata?.extracted_at || new Date().toISOString(),
        contentLength:
          response.metadata?.content_length || response.content.length,
        provider: 'xAI Grok',
        extractContent: browseRequest.extract_content,
        summarize: browseRequest.summarize,
      },
    }
  }

  private async performGrokSearch(
    request: GrokSearchRequest
  ): Promise<GrokSearchResponse> {
    const payload = {
      query: request.query,
      model: request.model,
      ...(request.temperature !== undefined && {
        temperature: request.temperature,
      }),
      ...(request.max_tokens !== undefined && {
        max_tokens: request.max_tokens,
      }),
    }

    // Use rate limiter from config
    return await rateLimitManager.schedule('xaiGrok', async () => {
      const response = await this.makeRequestWithRetry(
        `${this.baseUrl}/grok3/deepsearch`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'DeepResearch-MCP/1.0',
            'X-API-Version': 'grok-3',
          },
          body: JSON.stringify(payload),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        // Log the full error details securely for debugging
        secureLogger.error('xAI Grok DeepSearch API request failed', {
          status: response.status,
          statusText: response.statusText,
          errorData,
        })
        throw createSanitizedApiError(
          response.status,
          response.statusText,
          'xAI Grok DeepSearch',
          errorData
        )
      }

      return await response.json()
    })
  }

  private async performGrokBrowse(
    request: GrokBrowseRequest
  ): Promise<GrokBrowseResponse> {
    const payload = {
      url: request.url,
      extract_content: request.extract_content,
      summarize: request.summarize,
    }

    // Use rate limiter from config
    return await rateLimitManager.schedule('xaiGrok', async () => {
      const response = await this.makeRequestWithRetry(
        `${this.baseUrl}/grok3/browse`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'DeepResearch-MCP/1.0',
            'X-API-Version': 'grok-3',
          },
          body: JSON.stringify(payload),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        // Log the full error details securely for debugging
        secureLogger.error('xAI Grok Browse API request failed', {
          status: response.status,
          statusText: response.statusText,
          errorData,
        })
        throw createSanitizedApiError(
          response.status,
          response.statusText,
          'xAI Grok Browse',
          errorData
        )
      }

      return await response.json()
    })
  }

  private async makeRequestWithRetry(
    url: string,
    options: RequestInit,
    maxRetries: number = 3
  ): Promise<Response> {
    let lastError: Error

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Add timeout using AbortController
        const controller = new AbortController()
        const timeoutMs = 30000 // 30 second timeout per request
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        // If successful, return the response
        if (response.ok) {
          return response
        }

        // Check if it's a retryable error (429 or 5xx)
        if (response.status === 429 || response.status >= 500) {
          if (attempt === maxRetries) {
            const errorData = await response.json().catch(() => ({}))
            secureLogger.error(
              `xAI Grok API failed after ${maxRetries + 1} attempts`,
              {
                status: response.status,
                statusText: response.statusText,
                errorData,
              }
            )
            throw createSanitizedApiError(
              response.status,
              response.statusText,
              'xAI Grok',
              errorData
            )
          }

          // Exponential backoff: 2^attempt seconds + jitter
          const baseDelay = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s, 8s...
          const jitter = Math.random() * 1000 // 0-1s jitter
          const delay = baseDelay + jitter

          // Log retry attempt securely
          secureLogger.debug(
            `Retrying xAI Grok request, attempt ${attempt + 1}`,
            {
              delay,
              status: response.status,
            }
          )
          await this.sleep(delay)
          continue
        }

        // For non-retryable errors, throw immediately
        const errorData = await response.json().catch(() => ({}))
        secureLogger.error('xAI Grok API non-retryable error', {
          status: response.status,
          statusText: response.statusText,
          errorData,
        })
        throw createSanitizedApiError(
          response.status,
          response.statusText,
          'xAI Grok',
          errorData
        )
      } catch (error) {
        lastError = error as Error

        // If it's not a fetch error or we've exhausted retries, throw
        if (attempt === maxRetries || !this.isRetryableError(error)) {
          throw lastError
        }

        // Exponential backoff for network errors
        const baseDelay = Math.pow(2, attempt) * 1000
        const jitter = Math.random() * 1000
        const delay = baseDelay + jitter

        // Log network error retry
        secureLogger.debug(
          `Retrying xAI Grok request after network error, attempt ${attempt + 1}`,
          {
            delay,
            errorType: lastError.name,
          }
        )
        await this.sleep(delay)
      }
    }

    throw lastError!
  }

  private isRetryableError(error: unknown): boolean {
    // Retry on network errors, timeouts, etc.
    if (error instanceof Error) {
      const errorWithCode = error as Error & { code?: string }
      return (
        errorWithCode.name === 'TypeError' || // Network errors
        errorWithCode.name === 'AbortError' || // Timeout errors
        errorWithCode.code === 'ECONNRESET' ||
        errorWithCode.code === 'ENOTFOUND' ||
        errorWithCode.code === 'ECONNREFUSED'
      )
    }
    return false
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
