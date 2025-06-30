import nock from 'nock'
import { FirecrawlProvider } from '../firecrawl.js'
import { DeepResearchProvider } from '../index.js'

describe('FirecrawlProvider', () => {
  let provider: DeepResearchProvider
  const mockApiKey = 'test-firecrawl-key'
  const baseUrl = 'https://api.firecrawl.dev'

  beforeEach(() => {
    provider = new FirecrawlProvider(mockApiKey)
    nock.cleanAll()
  })

  afterEach(() => {
    nock.cleanAll()
  })

  describe('search', () => {
    it('should successfully perform a search and return results', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            title: 'Machine Learning Best Practices',
            url: 'https://example.com/ml-practices',
            description:
              'Comprehensive guide to machine learning best practices.',
            content:
              'This article covers the essential best practices for machine learning projects.',
            score: 0.92,
            publishedDate: '2024-01-10',
          },
          {
            title: 'Deep Learning Fundamentals',
            url: 'https://example.com/deep-learning',
            description: 'Understanding the fundamentals of deep learning.',
            content:
              'Deep learning is a subset of machine learning that uses neural networks.',
            score: 0.88,
          },
        ],
        total: 2,
      }

      nock(baseUrl).post('/v1/search').reply(200, mockResponse)

      const result = await provider.search('machine learning')

      expect(result).toEqual({
        query: 'machine learning',
        results: [
          {
            title: 'Machine Learning Best Practices',
            url: 'https://example.com/ml-practices',
            snippet: 'Comprehensive guide to machine learning best practices.',
            relevanceScore: 0.92,
            publishedDate: '2024-01-10',
            source: 'firecrawl',
          },
          {
            title: 'Deep Learning Fundamentals',
            url: 'https://example.com/deep-learning',
            snippet: 'Understanding the fundamentals of deep learning.',
            relevanceScore: 0.88,
            publishedDate: undefined,
            source: 'firecrawl',
          },
        ],
        metadata: expect.objectContaining({
          totalResults: 2,
          provider: 'firecrawl',
          success: true,
        }),
      })
    })

    it('should handle API errors gracefully', async () => {
      nock(baseUrl).post('/v1/search').reply(401, { error: 'Invalid API key' })

      await expect(provider.search('test query')).rejects.toThrow(
        'Firecrawl search failed:'
      )
    })

    it('should use custom search options', async () => {
      const mockResponse = {
        success: true,
        data: [],
        total: 0,
      }

      const scope = nock(baseUrl)
        .post('/v1/search', (body) => {
          expect(body.query).toBe('custom search')
          expect(body.limit).toBe(20)
          expect(body.searchOptions.limit).toBe(20)
          return true
        })
        .reply(200, mockResponse)

      await provider.search('custom search', { maxResults: 20 })

      expect(scope.isDone()).toBe(true)
    })

    it('should handle responses with missing data fields', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            url: 'https://example.com/no-title',
            // Missing title
            content: 'Content without title or description',
          },
          {
            title: 'Title Only',
            url: 'https://example.com/title-only',
            // Missing description and content
          },
        ],
        total: 2,
      }

      nock(baseUrl).post('/v1/search').reply(200, mockResponse)

      const result = await provider.search('test query')

      expect(result.results).toHaveLength(2)
      expect(result.results[0].title).toBe('https://example.com/no-title')
      expect(result.results[0].snippet).toBe(
        'Content without title or description'
      )
      expect(result.results[1].title).toBe('Title Only')
      expect(result.results[1].snippet).toBe('')
    })

    it('should handle empty search results', async () => {
      const mockResponse = {
        success: true,
        data: [],
        total: 0,
      }

      nock(baseUrl).post('/v1/search').reply(200, mockResponse)

      const result = await provider.search('nonexistent query')
      expect(result.results).toEqual([])
      expect(result.metadata?.totalResults).toBe(0)
    })
  })

  describe('browsePage', () => {
    it('should successfully browse a page and return content', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            url: 'https://example.com/page',
            title: 'Example Page',
            content: 'This is the main content of the page.',
            markdown: '# Example Page\n\nThis is the main content of the page.',
            statusCode: 200,
          },
        ],
      }

      nock(baseUrl).post('/v1/crawl').reply(200, mockResponse)

      const result = await provider.browsePage!('https://example.com/page')

      expect(result).toEqual({
        url: 'https://example.com/page',
        title: 'Example Page',
        content: 'This is the main content of the page.',
        metadata: {
          extractedAt: expect.any(String),
          contentLength: 'This is the main content of the page.'.length,
          statusCode: 200,
          provider: 'firecrawl',
        },
      })
    })

    it('should handle browse API errors', async () => {
      nock(baseUrl).post('/v1/crawl').reply(400, { error: 'Invalid URL' })

      await expect(provider.browsePage!('invalid-url')).rejects.toThrow(
        'Firecrawl page browsing failed:'
      )
    })

    it('should use custom page options', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            url: 'https://example.com/custom',
            title: 'Custom Page',
            content: 'Custom content extraction.',
            markdown: '# Custom Page\n\nCustom content extraction.',
            statusCode: 200,
          },
        ],
      }

      const scope = nock(baseUrl)
        .post('/v1/crawl', (body) => {
          expect(body.url).toBe('https://example.com/custom')
          expect(body.pageOptions.onlyMainContent).toBe(false)
          expect(body.pageOptions.includeHtml).toBe(true)
          expect(body.pageOptions.screenshot).toBe(true)
          return true
        })
        .reply(200, mockResponse)

      await provider.browsePage!('https://example.com/custom', {
        onlyMainContent: false,
        includeHtml: true,
        screenshot: true,
      })

      expect(scope.isDone()).toBe(true)
    })

    it('should handle unsuccessful crawl responses', async () => {
      const mockResponse = {
        success: false,
        data: [],
        error: 'Failed to crawl page',
      }

      nock(baseUrl).post('/v1/crawl').reply(200, mockResponse)

      await expect(
        provider.browsePage!('https://example.com/fail')
      ).rejects.toThrow('No page content retrieved from Firecrawl')
    })

    it('should prefer content over markdown when both are available', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            url: 'https://example.com/both',
            title: 'Both Content Types',
            content: 'Text content',
            markdown: '# Markdown content',
            statusCode: 200,
          },
        ],
      }

      nock(baseUrl).post('/v1/crawl').reply(200, mockResponse)

      const result = await provider.browsePage!('https://example.com/both')
      expect(result.content).toBe('Text content')
    })

    it('should use markdown when content is not available', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            url: 'https://example.com/markdown-only',
            title: 'Markdown Only',
            // No content field
            markdown: '# Markdown content only',
            statusCode: 200,
          },
        ],
      }

      nock(baseUrl).post('/v1/crawl').reply(200, mockResponse)

      const result = await provider.browsePage!(
        'https://example.com/markdown-only'
      )
      expect(result.content).toBe('# Markdown content only')
    })

    it('should handle missing title gracefully', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            url: 'https://example.com/no-title',
            // No title field
            content: 'Content without title',
            statusCode: 200,
          },
        ],
      }

      nock(baseUrl).post('/v1/crawl').reply(200, mockResponse)

      const result = await provider.browsePage!('https://example.com/no-title')
      expect(result.title).toBe('Untitled')
    })
  })
})
