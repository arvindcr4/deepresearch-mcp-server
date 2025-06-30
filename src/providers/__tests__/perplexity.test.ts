import nock from 'nock'
import { PerplexityProvider } from '../perplexity.js'
import { DeepResearchProvider } from '../index.js'

describe('PerplexityProvider', () => {
  let provider: DeepResearchProvider
  const mockApiKey = 'test-perplexity-key'
  const baseUrl = 'https://sonar.perplexity.ai'

  beforeEach(() => {
    provider = new PerplexityProvider(mockApiKey)
    nock.cleanAll()
  })

  afterEach(() => {
    nock.cleanAll()
  })

  describe('search', () => {
    it('should successfully perform a search and return results', async () => {
      const mockResponse = {
        id: 'sonar-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'sonar-pro',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content:
                'Artificial Intelligence (AI) is transforming industries worldwide.',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 25,
          completion_tokens: 150,
          total_tokens: 175,
        },
        citations: [
          {
            title: 'AI Revolution in Healthcare',
            url: 'https://example.com/ai-healthcare',
            snippet:
              'AI is revolutionizing healthcare with predictive analytics.',
            relevance_score: 0.92,
          },
          {
            title: 'Machine Learning Trends',
            url: 'https://example.com/ml-trends',
            snippet: 'Latest trends in machine learning and AI development.',
            relevance_score: 0.87,
          },
        ],
      }

      nock(baseUrl).post('').reply(200, mockResponse)

      const result = await provider.search('artificial intelligence')

      expect(result).toEqual({
        query: 'artificial intelligence',
        results: [
          {
            title: 'AI Revolution in Healthcare',
            url: 'https://example.com/ai-healthcare',
            snippet:
              'AI is revolutionizing healthcare with predictive analytics.',
            relevanceScore: 0.92,
            source: 'Perplexity Sonar',
          },
          {
            title: 'Machine Learning Trends',
            url: 'https://example.com/ml-trends',
            snippet: 'Latest trends in machine learning and AI development.',
            relevanceScore: 0.87,
            source: 'Perplexity Sonar',
          },
        ],
        metadata: expect.objectContaining({
          totalResults: 2,
          provider: 'Perplexity',
          model: 'sonar-pro',
          answer:
            'Artificial Intelligence (AI) is transforming industries worldwide.',
          usage: mockResponse.usage,
        }),
      })
    })

    it('should handle API errors gracefully', async () => {
      nock(baseUrl)
        .post('')
        .reply(401, { error: { message: 'Invalid API key' } })

      await expect(provider.search('test query')).rejects.toThrow()
    })

    it('should handle rate limiting with exponential backoff', async () => {
      const mockResponse = {
        id: 'retry-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'sonar-pro',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Success after rate limit retry.',
            },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        citations: [],
      }

      // Mock rate limit followed by success
      nock(baseUrl)
        .post('')
        .reply(429, { error: { message: 'Rate limit exceeded' } })
        .post('')
        .reply(200, mockResponse)

      const result = await provider.search('test query')
      expect(result.metadata?.answer).toBe('Success after rate limit retry.')
    })

    it('should use custom model and parameters', async () => {
      const mockResponse = {
        id: 'custom-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'sonar-large',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Custom model response.',
            },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 },
        citations: [],
      }

      const scope = nock(baseUrl)
        .post('', (body) => {
          expect(body.model).toBe('sonar-large')
          expect(body.temperature).toBe(0.7)
          expect(body.max_tokens).toBe(1000)
          expect(body.mode).toBe('deep_research')
          return true
        })
        .reply(200, mockResponse)

      await provider.search('custom query', {
        model: 'sonar-large',
        temperature: 0.7,
        max_tokens: 1000,
      })

      expect(scope.isDone()).toBe(true)
    })

    it('should handle responses without citations', async () => {
      const mockResponse = {
        id: 'no-citations-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'sonar-pro',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Response without citations.',
            },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        // No citations field
      }

      nock(baseUrl).post('').reply(200, mockResponse)

      const result = await provider.search('test query')
      expect(result.results).toEqual([])
      expect(result.metadata?.answer).toBe('Response without citations.')
    })

    it('should handle server errors with retry', async () => {
      nock(baseUrl)
        .post('')
        .reply(500, { error: 'Internal server error' })
        .post('')
        .reply(200, {
          id: 'retry-500',
          object: 'chat.completion',
          created: Date.now(),
          model: 'sonar-pro',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: 'Success after 500 error',
              },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          citations: [],
        })

      const result = await provider.search('test query')
      expect(result.metadata?.answer).toBe('Success after 500 error')
    })
  })

  describe('browsePage', () => {
    it('should return guidance to use search instead', async () => {
      const result = await provider.browsePage!('https://example.com')

      expect(result).toEqual({
        url: 'https://example.com',
        title: 'Perplexity Page Browsing Not Available',
        content:
          'Perplexity Sonar handles page content through deep research mode. Please use the search() method instead, which provides comprehensive analysis including page content.',
        metadata: {
          extractedAt: expect.any(String),
          contentLength: 0,
          provider: 'perplexity',
          status: 'use_search_instead',
          message:
            'Perplexity Sonar deep research mode provides comprehensive page analysis through search queries',
        },
      })
    })
  })
})
