import nock from 'nock'
import { AgentspaceProvider } from '../agentspace.js'
import { DeepResearchProvider } from '../index.js'

describe('AgentspaceProvider', () => {
  let provider: DeepResearchProvider
  const mockApiKey = 'test-agentspace-key'
  const baseUrl = 'https://api.agentspace.dev'

  beforeEach(() => {
    provider = new AgentspaceProvider(mockApiKey)
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
            title: 'Renewable Energy Technologies',
            url: 'https://example.com/renewable-energy',
            snippet: 'Overview of modern renewable energy technologies.',
            summary:
              'Comprehensive analysis of solar, wind, and hydroelectric power.',
            relevance_score: 0.94,
            published_date: '2024-01-15',
            source: 'research-journal',
          },
          {
            title: 'Climate Change Solutions',
            url: 'https://example.com/climate-solutions',
            snippet: 'Innovative approaches to address climate change.',
            confidence: 0.89,
            date: '2024-01-12',
            source: 'environmental-org',
          },
        ],
        total_results: 2,
        analysis:
          'The search results show strong consensus on renewable energy as a key climate solution.',
        insights: [
          'Renewable energy adoption is accelerating',
          'Multiple technologies are becoming cost-competitive',
        ],
        research_depth: 'comprehensive',
        query_understanding:
          'User is seeking information about sustainable energy solutions.',
      }

      nock(baseUrl).post('/v1/research').reply(200, mockResponse)

      const result = await provider.search('renewable energy')

      expect(result).toEqual({
        query: 'renewable energy',
        results: [
          {
            title: 'Renewable Energy Technologies',
            url: 'https://example.com/renewable-energy',
            snippet: 'Overview of modern renewable energy technologies.',
            relevanceScore: 0.94,
            publishedDate: '2024-01-15',
            source: 'research-journal',
          },
          {
            title: 'Climate Change Solutions',
            url: 'https://example.com/climate-solutions',
            snippet: 'Innovative approaches to address climate change.',
            relevanceScore: 0.89,
            publishedDate: '2024-01-12',
            source: 'environmental-org',
          },
        ],
        metadata: expect.objectContaining({
          totalResults: 2,
          provider: 'agentspace-google',
          analysis:
            'The search results show strong consensus on renewable energy as a key climate solution.',
          insights: [
            'Renewable energy adoption is accelerating',
            'Multiple technologies are becoming cost-competitive',
          ],
          research_depth: 'comprehensive',
          query_understanding:
            'User is seeking information about sustainable energy solutions.',
        }),
      })
    })

    it('should handle API errors gracefully', async () => {
      nock(baseUrl).post('/v1/research').reply(403, { error: 'Forbidden' })

      await expect(provider.search('test query')).rejects.toThrow(
        'Agentspace research failed:'
      )
    })

    it('should use custom search options', async () => {
      const mockResponse = {
        results: [],
        total_results: 0,
        analysis: 'No relevant results found.',
        research_depth: 'quick',
      }

      const scope = nock(baseUrl)
        .post('/v1/research', (body) => {
          expect(body.query).toBe('custom query')
          expect(body.service).toBe('google-deep-research')
          expect(body.parameters.max_results).toBe(15)
          expect(body.parameters.recency).toBe('week')
          expect(body.parameters.language).toBe('es')
          expect(body.parameters.region).toBe('es')
          expect(body.parameters.depth).toBe('quick')
          return true
        })
        .reply(200, mockResponse)

      await provider.search('custom query', {
        maxResults: 15,
        recency: 'week',
        language: 'es',
        region: 'es',
        depth: 'quick',
      })

      expect(scope.isDone()).toBe(true)
    })

    it('should handle responses with missing optional fields', async () => {
      const mockResponse = {
        results: [
          {
            title: 'Simple Result',
            url: 'https://example.com/simple',
            // Missing snippet, relevance_score, published_date, source
          },
          {
            // Missing title
            url: 'https://example.com/no-title',
            snippet: 'Result without title',
          },
        ],
        total_results: 2,
        // Missing analysis, insights, etc.
      }

      nock(baseUrl).post('/v1/research').reply(200, mockResponse)

      const result = await provider.search('test query')

      expect(result.results).toHaveLength(2)
      expect(result.results[0].title).toBe('Simple Result')
      expect(result.results[0].snippet).toBe('')
      expect(result.results[0].relevanceScore).toBeUndefined()
      expect(result.results[1].title).toBe('Untitled')
      expect(result.results[1].snippet).toBe('Result without title')
    })

    it('should handle different confidence/relevance score field names', async () => {
      const mockResponse = {
        results: [
          {
            title: 'Confidence Score',
            url: 'https://example.com/confidence',
            snippet: 'Result with confidence field',
            confidence: 0.85,
          },
          {
            title: 'Relevance Score',
            url: 'https://example.com/relevance',
            snippet: 'Result with relevance_score field',
            relevance_score: 0.92,
          },
        ],
        total_results: 2,
      }

      nock(baseUrl).post('/v1/research').reply(200, mockResponse)

      const result = await provider.search('test query')

      expect(result.results[0].relevanceScore).toBe(0.85)
      expect(result.results[1].relevanceScore).toBe(0.92)
    })

    it('should handle empty results gracefully', async () => {
      const mockResponse = {
        results: [],
        total_results: 0,
        analysis: 'No relevant information found for the given query.',
      }

      nock(baseUrl).post('/v1/research').reply(200, mockResponse)

      const result = await provider.search('nonexistent topic')
      expect(result.results).toEqual([])
      expect(result.metadata?.totalResults).toBe(0)
      expect(result.metadata?.analysis).toBe(
        'No relevant information found for the given query.'
      )
    })
  })

  describe('browsePage', () => {
    it('should successfully browse a page and return content', async () => {
      const mockResponse = {
        success: true,
        url: 'https://example.com/page',
        title: 'Example Page',
        content: 'This is the extracted page content.',
        metadata: {
          title: 'Example Page',
          language: 'en',
          author: 'John Doe',
          published_date: '2024-01-10',
          description: 'An example page for testing',
          keywords: ['example', 'test', 'page'],
        },
        images: ['https://example.com/image1.jpg'],
        links: ['https://example.com/link1', 'https://example.com/link2'],
      }

      nock(baseUrl).post('/v1/extract').reply(200, mockResponse)

      const result = await provider.browsePage!('https://example.com/page')

      expect(result).toEqual({
        url: 'https://example.com/page',
        title: 'Example Page',
        content: 'This is the extracted page content.',
        metadata: {
          extractedAt: expect.any(String),
          contentLength: 'This is the extracted page content.'.length,
          provider: 'agentspace',
          language: 'en',
          author: 'John Doe',
          publishedDate: '2024-01-10',
          description: 'An example page for testing',
          keywords: ['example', 'test', 'page'],
          images: ['https://example.com/image1.jpg'],
          links: ['https://example.com/link1', 'https://example.com/link2'],
        },
      })
    })

    it('should handle browse API errors', async () => {
      nock(baseUrl).post('/v1/extract').reply(404, { error: 'Page not found' })

      await expect(
        provider.browsePage!('https://example.com/404')
      ).rejects.toThrow('Agentspace page browsing failed:')
    })

    it('should use custom page extraction options', async () => {
      const mockResponse = {
        success: true,
        url: 'https://example.com/custom',
        title: 'Custom Extraction',
        content: 'Custom extracted content.',
        metadata: {},
      }

      const scope = nock(baseUrl)
        .post('/v1/extract', (body) => {
          expect(body.url).toBe('https://example.com/custom')
          expect(body.service).toBe('web-content-extraction')
          expect(body.parameters.extract_main_content).toBe(false)
          expect(body.parameters.include_metadata).toBe(true)
          expect(body.parameters.format).toBe('html')
          expect(body.parameters.remove_ads).toBe(false)
          expect(body.parameters.extract_images).toBe(true)
          return true
        })
        .reply(200, mockResponse)

      await provider.browsePage!('https://example.com/custom', {
        extractMainContent: false,
        includeMetadata: true,
        format: 'html',
        removeAds: false,
        extractImages: true,
      })

      expect(scope.isDone()).toBe(true)
    })

    it('should handle unsuccessful extraction', async () => {
      const mockResponse = {
        success: false,
        error: 'Failed to extract content',
      }

      nock(baseUrl).post('/v1/extract').reply(200, mockResponse)

      await expect(
        provider.browsePage!('https://example.com/fail')
      ).rejects.toThrow('No page content retrieved from Agentspace')
    })

    it('should handle missing optional metadata fields', async () => {
      const mockResponse = {
        success: true,
        url: 'https://example.com/minimal',
        content: 'Minimal content',
        // Missing title and metadata
      }

      nock(baseUrl).post('/v1/extract').reply(200, mockResponse)

      const result = await provider.browsePage!('https://example.com/minimal')

      expect(result.title).toBe('Untitled')
      expect(result.content).toBe('Minimal content')
      expect(result.metadata?.language).toBeUndefined()
      expect(result.metadata?.author).toBeUndefined()
    })

    it('should prefer metadata.title over root title', async () => {
      const mockResponse = {
        success: true,
        url: 'https://example.com/title-test',
        title: 'Root Title',
        content: 'Content',
        metadata: {
          title: 'Metadata Title',
        },
      }

      nock(baseUrl).post('/v1/extract').reply(200, mockResponse)

      const result = await provider.browsePage!(
        'https://example.com/title-test'
      )
      expect(result.title).toBe('Metadata Title')
    })
  })

  describe('performDeepAnalysis', () => {
    it('should perform deep analysis and return structured results', async () => {
      const mockResponse = {
        analysis:
          'Comprehensive analysis of artificial intelligence trends shows rapid advancement in machine learning.',
        citations: [
          {
            title: 'AI Research Breakthrough',
            url: 'https://example.com/ai-research',
            snippet: 'Recent breakthroughs in AI research.',
            relevance_score: 0.96,
          },
        ],
        metadata: {
          processingTime: 2500,
          sources: [
            'https://example.com/source1',
            'https://example.com/source2',
          ],
          confidence: 0.92,
        },
      }

      nock(baseUrl).post('/v1/analyze').reply(200, mockResponse)

      const result = await (provider as any).performDeepAnalysis(
        'artificial intelligence trends',
        ['https://example.com/source1', 'https://example.com/source2']
      )

      expect(result).toEqual(mockResponse)
    })

    it('should handle analysis API errors', async () => {
      nock(baseUrl)
        .post('/v1/analyze')
        .reply(400, { error: 'Invalid analysis request' })

      await expect(
        (provider as any).performDeepAnalysis('invalid query')
      ).rejects.toThrow('Agentspace deep analysis failed:')
    })
  })
})
