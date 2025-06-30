import nock from 'nock'
import { GrokProvider } from '../grok.js'
import { DeepResearchProvider } from '../index.js'

describe('GrokProvider', () => {
  let provider: DeepResearchProvider
  const mockApiKey = 'test-grok-key'
  const baseUrl = 'https://api.x.ai'

  beforeEach(() => {
    provider = new GrokProvider(mockApiKey)
    nock.cleanAll()
  })

  afterEach(() => {
    nock.cleanAll()
  })

  describe('search', () => {
    it('should successfully perform a search and return results', async () => {
      const mockResponse = {
        results: [
          {
            title: 'Quantum Computing Breakthrough',
            url: 'https://example.com/quantum',
            snippet:
              'Recent advances in quantum computing show promising results.',
            relevance_score: 0.95,
          },
          {
            title: 'Quantum Algorithms Research',
            url: 'https://example.com/algorithms',
            snippet:
              'New quantum algorithms are being developed for complex problems.',
            relevance_score: 0.89,
          },
        ],
        metadata: {
          search_time: 1500,
          total_results: 2,
        },
      }

      nock(baseUrl).post('/grok3/deepsearch').reply(200, mockResponse)

      const result = await provider.search('quantum computing')

      expect(result).toEqual({
        query: 'quantum computing',
        results: [
          {
            title: 'Quantum Computing Breakthrough',
            url: 'https://example.com/quantum',
            snippet:
              'Recent advances in quantum computing show promising results.',
            relevanceScore: 0.95,
            source: 'xAI Grok DeepSearch',
          },
          {
            title: 'Quantum Algorithms Research',
            url: 'https://example.com/algorithms',
            snippet:
              'New quantum algorithms are being developed for complex problems.',
            relevanceScore: 0.89,
            source: 'xAI Grok DeepSearch',
          },
        ],
        metadata: expect.objectContaining({
          totalResults: 2,
          searchTime: 1500,
          provider: 'xAI Grok',
          model: 'grok-3',
        }),
      })
    })

    it('should handle API errors gracefully', async () => {
      nock(baseUrl)
        .post('/grok3/deepsearch')
        .reply(403, { error: 'Forbidden access' })

      await expect(provider.search('test query')).rejects.toThrow()
    })

    it('should handle rate limiting with retry', async () => {
      const mockResponse = {
        results: [
          {
            title: 'Success after retry',
            url: 'https://example.com/retry',
            snippet: 'This is a successful response after rate limiting.',
            relevance_score: 0.9,
          },
        ],
        metadata: {
          search_time: 2000,
          total_results: 1,
        },
      }

      // Mock rate limit followed by success
      nock(baseUrl)
        .post('/grok3/deepsearch')
        .reply(429, { error: 'Rate limit exceeded' })
        .post('/grok3/deepsearch')
        .reply(200, mockResponse)

      const result = await provider.search('test query')
      expect(result.results[0].title).toBe('Success after retry')
    })

    it('should use custom options and parameters', async () => {
      const mockResponse = {
        results: [],
        metadata: { search_time: 500, total_results: 0 },
      }

      const scope = nock(baseUrl)
        .post('/grok3/deepsearch', (body) => {
          expect(body.model).toBe('grok-3')
          expect(body.temperature).toBe(0.8)
          expect(body.max_tokens).toBe(2000)
          expect(body.query).toBe('custom search')
          return true
        })
        .reply(200, mockResponse)

      await provider.search('custom search', {
        model: 'grok-3',
        temperature: 0.8,
        max_tokens: 2000,
      })

      expect(scope.isDone()).toBe(true)
    })

    it('should handle responses without metadata', async () => {
      const mockResponse = {
        results: [
          {
            title: 'Simple Result',
            url: 'https://example.com/simple',
            snippet: 'A simple search result.',
            relevance_score: 0.8,
          },
        ],
        // No metadata field
      }

      nock(baseUrl).post('/grok3/deepsearch').reply(200, mockResponse)

      const result = await provider.search('test query')
      expect(result.metadata?.totalResults).toBe(1)
      expect(result.metadata?.searchTime).toBeDefined()
    })

    it('should handle server errors with retry', async () => {
      nock(baseUrl)
        .post('/grok3/deepsearch')
        .reply(502, { error: 'Bad gateway' })
        .post('/grok3/deepsearch')
        .reply(200, {
          results: [
            {
              title: 'Recovery success',
              url: 'https://example.com/recovery',
              snippet: 'Successful recovery from server error.',
              relevance_score: 0.85,
            },
          ],
          metadata: { search_time: 1000, total_results: 1 },
        })

      const result = await provider.search('test query')
      expect(result.results[0].title).toBe('Recovery success')
    })
  })

  describe('browsePage', () => {
    it('should successfully browse a page and return content', async () => {
      const mockResponse = {
        title: 'Example Page Title',
        content:
          'This is the main content of the webpage. It contains useful information about the topic.',
        metadata: {
          content_length: 85,
          extracted_at: '2024-01-15T10:30:00Z',
        },
      }

      nock(baseUrl).post('/grok3/browse').reply(200, mockResponse)

      const result = await provider.browsePage!('https://example.com/page')

      expect(result).toEqual({
        url: 'https://example.com/page',
        title: 'Example Page Title',
        content:
          'This is the main content of the webpage. It contains useful information about the topic.',
        metadata: {
          extractedAt: '2024-01-15T10:30:00Z',
          contentLength: 85,
          provider: 'xAI Grok',
          extractContent: true,
          summarize: false,
        },
      })
    })

    it('should handle browse API errors', async () => {
      nock(baseUrl)
        .post('/grok3/browse')
        .reply(404, { error: 'Page not found' })

      await expect(
        provider.browsePage!('https://example.com/404')
      ).rejects.toThrow()
    })

    it('should use custom browse options', async () => {
      const mockResponse = {
        title: 'Summarized Page',
        content: 'Summary: This page discusses advanced topics.',
        metadata: {
          content_length: 45,
          extracted_at: '2024-01-15T11:00:00Z',
        },
      }

      const scope = nock(baseUrl)
        .post('/grok3/browse', (body) => {
          expect(body.url).toBe('https://example.com/custom')
          expect(body.extract_content).toBe(false)
          expect(body.summarize).toBe(true)
          return true
        })
        .reply(200, mockResponse)

      await provider.browsePage!('https://example.com/custom', {
        extract_content: false,
        summarize: true,
      })

      expect(scope.isDone()).toBe(true)
    })

    it('should handle browse responses without metadata', async () => {
      const mockResponse = {
        title: 'No Metadata Page',
        content: 'Content without metadata.',
        // No metadata field
      }

      nock(baseUrl).post('/grok3/browse').reply(200, mockResponse)

      const result = await provider.browsePage!('https://example.com/no-meta')
      expect(result.metadata?.extractedAt).toBeDefined()
      expect(result.metadata?.contentLength).toBe(mockResponse.content.length)
    })

    it('should handle network errors with retry in browse', async () => {
      nock(baseUrl)
        .post('/grok3/browse')
        .replyWithError('ECONNRESET')
        .post('/grok3/browse')
        .reply(200, {
          title: 'Network Recovery',
          content: 'Successfully recovered from network error.',
          metadata: {
            content_length: 45,
            extracted_at: '2024-01-15T12:00:00Z',
          },
        })

      const result = await provider.browsePage!(
        'https://example.com/network-test'
      )
      expect(result.title).toBe('Network Recovery')
    })
  })
})
