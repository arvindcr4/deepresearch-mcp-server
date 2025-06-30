import { DeepResearchProvider, SearchResult, PageContent } from './index.js'
import { rateLimitManager } from '../config/index.js'
import { createSanitizedApiError } from '../middleware/errorSanitizer.js'
import { secureLogger } from '../utils/secureLogger.js'
import { PerplexityProviderOptions } from '../types/providers.js'

interface PerplexitySonarRequest {
  mode: 'deep_research'
  query: string
  model?: string
  temperature?: number
  max_tokens?: number
}

interface PerplexitySonarResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  citations?: Array<{
    title: string
    url: string
    snippet: string
    relevance_score?: number
  }>
}

interface NormalizedPerplexityResponse {
  answer: string
  citations: Array<{
    title: string
    url: string
    snippet: string
    relevanceScore?: number
  }>
  raw: PerplexitySonarResponse
}

export class PerplexityProvider implements DeepResearchProvider {
  private apiKey: string
  private baseUrl: string = 'https://sonar.perplexity.ai'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async search(
    query: string,
    options?: PerplexityProviderOptions
  ): Promise<SearchResult> {
    const sonarRequest: PerplexitySonarRequest = {
      mode: 'deep_research',
      query,
      model: options?.model || 'sonar-pro',
      temperature: options?.temperature,
      max_tokens: options?.max_tokens,
    }

    const normalizedResponse = await this.performSonarDeepResearch(sonarRequest)

    // Convert the normalized response to the expected SearchResult format
    const searchItems = normalizedResponse.citations.map((citation) => ({
      title: citation.title,
      url: citation.url,
      snippet: citation.snippet,
      relevanceScore: citation.relevanceScore,
      source: 'Perplexity Sonar',
    }))

    return {
      query,
      results: searchItems,
      metadata: {
        totalResults: searchItems.length,
        provider: 'Perplexity',
        model: sonarRequest.model,
        answer: normalizedResponse.answer,
        usage: normalizedResponse.raw.usage,
        searchTime: Date.now(),
      },
    }
  }

  private async performSonarDeepResearch(
    request: PerplexitySonarRequest
  ): Promise<NormalizedPerplexityResponse> {
    const payload = {
      mode: request.mode,
      query: request.query,
      ...(request.model && { model: request.model }),
      ...(request.temperature !== undefined && {
        temperature: request.temperature,
      }),
      ...(request.max_tokens !== undefined && {
        max_tokens: request.max_tokens,
      }),
    }

    // Use rate limiter from config
    return await rateLimitManager.schedule('perplexity', async () => {
      const response = await this.makeRequestWithRetry(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'DeepResearch-MCP/1.0',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        // Log the full error details securely for debugging
        secureLogger.error('Perplexity Sonar API request failed', {
          status: response.status,
          statusText: response.statusText,
          errorData,
        })
        throw createSanitizedApiError(
          response.status,
          response.statusText,
          'Perplexity Sonar',
          errorData
        )
      }

      const data: PerplexitySonarResponse = await response.json()
      return this.normalizeResponse(data)
    })
  }

  private normalizeResponse(
    response: PerplexitySonarResponse
  ): NormalizedPerplexityResponse {
    // Extract answer from the first choice's message content
    const answer = response.choices?.[0]?.message?.content || ''

    // Extract citations if available, otherwise create empty array
    const citations = (response.citations || []).map((citation) => ({
      title: citation.title,
      url: citation.url,
      snippet: citation.snippet,
      relevanceScore: citation.relevance_score,
    }))

    return {
      answer,
      citations,
      raw: response,
    }
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
              `Perplexity Sonar API failed after ${maxRetries + 1} attempts`,
              {
                status: response.status,
                statusText: response.statusText,
                errorData,
              }
            )
            throw createSanitizedApiError(
              response.status,
              response.statusText,
              'Perplexity Sonar',
              errorData
            )
          }

          // Exponential backoff: 2^attempt seconds + jitter
          const baseDelay = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s, 8s...
          const jitter = Math.random() * 1000 // 0-1s jitter
          const delay = baseDelay + jitter

          // Log retry attempt securely
          secureLogger.debug(
            `Retrying Perplexity request, attempt ${attempt + 1}`,
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
        secureLogger.error('Perplexity Sonar API non-retryable error', {
          status: response.status,
          statusText: response.statusText,
          errorData,
        })
        throw createSanitizedApiError(
          response.status,
          response.statusText,
          'Perplexity Sonar',
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

        // Note: Using console.warn here instead of logger to avoid circular dependencies during retry logic
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

  // Note: browsePage is optional - Perplexity handles comprehensive content
  // through their search API that already provides detailed analysis
  async browsePage(
    url: string,
    options?: PerplexityProviderOptions
  ): Promise<PageContent> {
    // Perplexity Sonar's deep research mode typically includes comprehensive
    // page analysis in its search results, so direct page browsing may not be needed
    return {
      url,
      title: 'Perplexity Page Browsing Not Available',
      content:
        'Perplexity Sonar handles page content through deep research mode. Please use the search() method instead, which provides comprehensive analysis including page content.',
      metadata: {
        extractedAt: new Date().toISOString(),
        contentLength: 0,
        provider: 'perplexity',
        status: 'use_search_instead',
        message:
          'Perplexity Sonar deep research mode provides comprehensive page analysis through search queries',
      },
    }
  }
}
