import { DeepResearchProvider, SearchResult, PageContent } from './index.js'
import { OpenAIProviderOptions } from '../types/providers.js'
import { createSanitizedApiError } from '../middleware/errorSanitizer.js'
import { secureLogger } from '../utils/secureLogger.js'

interface DeepResearchOptions {
  query: string
  model?: 'o3-deep-research' | 'o4-mini-deep-research'
  temperature?: number
  max_tokens?: number
}

interface DeepResearchResponse {
  answer: string
  citations: Array<{
    title: string
    url: string
    snippet: string
    relevance_score?: number
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  model: string
  id: string
}

interface NormalizedResponse {
  answer: string
  citations: Array<{
    title: string
    url: string
    snippet: string
    relevanceScore?: number
  }>
  raw: DeepResearchResponse
}

export class OpenAIProvider implements DeepResearchProvider {
  private apiKey: string
  private baseUrl: string = 'https://api.openai.com/v1'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async search(
    query: string,
    options?: OpenAIProviderOptions
  ): Promise<SearchResult> {
    const deepResearchOptions: DeepResearchOptions = {
      query,
      model: options?.model || 'o3-deep-research',
      temperature: options?.temperature,
      max_tokens: options?.max_tokens,
    }

    const normalizedResponse =
      await this.performDeepResearch(deepResearchOptions)

    // Convert the normalized response to the expected SearchResult format
    const searchItems = normalizedResponse.citations.map((citation) => ({
      title: citation.title,
      url: citation.url,
      snippet: citation.snippet,
      relevanceScore: citation.relevanceScore,
      source: 'OpenAI Deep Research',
    }))

    return {
      query,
      results: searchItems,
      metadata: {
        totalResults: searchItems.length,
        provider: 'OpenAI',
        model: deepResearchOptions.model,
        answer: normalizedResponse.answer,
        usage: normalizedResponse.raw.usage,
        searchTime: Date.now(),
      },
    }
  }

  private async performDeepResearch(
    options: DeepResearchOptions
  ): Promise<NormalizedResponse> {
    const payload = {
      model: options.model,
      query: options.query,
      ...(options.temperature !== undefined && {
        temperature: options.temperature,
      }),
      ...(options.max_tokens !== undefined && {
        max_tokens: options.max_tokens,
      }),
    }

    const response = await this.makeRequestWithRetry(
      `${this.baseUrl}/deep-research`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Organization': '', // Add if needed
          'OpenAI-Project': '', // Add if needed
          // Pay-as-you-go pricing headers
          'OpenAI-Beta': 'deep-research-v1',
          'X-OpenAI-Pricing-Model': 'pay-as-you-go',
        },
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      // Log the full error details securely for debugging
      secureLogger.error('OpenAI API request failed', {
        status: response.status,
        statusText: response.statusText,
        errorData,
      })
      throw createSanitizedApiError(
        response.status,
        response.statusText,
        'OpenAI',
        errorData
      )
    }

    const data: DeepResearchResponse = await response.json()
    return this.normalizeResponse(data)
  }

  private normalizeResponse(
    response: DeepResearchResponse
  ): NormalizedResponse {
    return {
      answer: response.answer,
      citations: response.citations.map((citation) => ({
        title: citation.title,
        url: citation.url,
        snippet: citation.snippet,
        relevanceScore: citation.relevance_score,
      })),
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
              `OpenAI API failed after ${maxRetries + 1} attempts`,
              {
                status: response.status,
                statusText: response.statusText,
                errorData,
              }
            )
            throw createSanitizedApiError(
              response.status,
              response.statusText,
              'OpenAI',
              errorData
            )
          }

          // Exponential backoff: 2^attempt seconds + jitter
          const baseDelay = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s, 8s...
          const jitter = Math.random() * 1000 // 0-1s jitter
          const delay = baseDelay + jitter

          // Log retry attempt securely
          secureLogger.debug(
            `Retrying OpenAI request, attempt ${attempt + 1}`,
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
        secureLogger.error('OpenAI API non-retryable error', {
          status: response.status,
          statusText: response.statusText,
          errorData,
        })
        throw createSanitizedApiError(
          response.status,
          response.statusText,
          'OpenAI',
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

  async browsePage(
    url: string,
    options?: OpenAIProviderOptions
  ): Promise<PageContent> {
    // OpenAI page browsing is not implemented yet - return a proper response
    return {
      url,
      title: 'OpenAI Page Browsing Not Implemented',
      content:
        'OpenAI page browsing functionality is currently under development. Please use other available providers like Firecrawl or Agentspace for web content extraction.',
      metadata: {
        extractedAt: new Date().toISOString(),
        contentLength: 0,
        provider: 'openai',
        status: 'not_implemented',
        message: 'OpenAI page analysis is planned but not yet available',
      },
    }
  }
}
