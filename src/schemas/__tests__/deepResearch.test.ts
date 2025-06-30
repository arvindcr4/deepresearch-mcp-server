/// <reference types="jest" />

/**
 * Unit Tests for Deep Research Schemas
 */

describe('Deep Research Schemas', () => {
  let deepResearchSchemas: any;

  beforeEach(async () => {
    // Dynamic import to ensure clean state
    const module = await import('../deepResearch.js');
    deepResearchSchemas = module;
  });

  describe('Provider Type Validation', () => {
    it('should validate valid provider types', () => {
      const { zProviderType } = deepResearchSchemas;
      if (zProviderType) {
        const validProviders = ['openai', 'perplexity', 'grok'];
        
        validProviders.forEach(provider => {
          const result = zProviderType.safeParse(provider);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data).toBe(provider);
          }
        });
      }
    });

    it('should reject invalid provider types', () => {
      const { zProviderType } = deepResearchSchemas;
      if (zProviderType) {
        const invalidProviders = ['invalid', 'chatgpt', 'claude', ''];
        
        invalidProviders.forEach(provider => {
          const result = zProviderType.safeParse(provider);
          expect(result.success).toBe(false);
        });
      }
    });
  });

  describe('Citation Schema Validation', () => {
    it('should validate valid citation data', () => {
      const { zCitation } = deepResearchSchemas;
      if (zCitation) {
        const validCitation = {
          title: 'Test Article',
          url: 'https://example.com/article',
          snippet: 'This is a test snippet',
          publishedDate: '2023-01-01',
          relevanceScore: 0.85
        };

        const result = zCitation.safeParse(validCitation);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validCitation);
        }
      }
    });

    it('should validate citation with only required fields', () => {
      const { zCitation } = deepResearchSchemas;
      if (zCitation) {
        const minimalCitation = {
          title: 'Minimal Citation',
          url: 'https://example.com'
        };

        const result = zCitation.safeParse(minimalCitation);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.title).toBe('Minimal Citation');
          expect(result.data.url).toBe('https://example.com');
        }
      }
    });

    it('should reject citation with invalid URL', () => {
      const { zCitation } = deepResearchSchemas;
      if (zCitation) {
        const invalidCitation = {
          title: 'Invalid URL Citation',
          url: 'not-a-valid-url'
        };

        const result = zCitation.safeParse(invalidCitation);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues).toContainEqual(
            expect.objectContaining({
              path: ['url']
            })
          );
        }
      }
    });

    it('should reject citation with relevance score out of range', () => {
      const { zCitation } = deepResearchSchemas;
      if (zCitation) {
        const invalidScores = [-0.1, 1.1, 2.0];
        
        invalidScores.forEach(score => {
          const citation = {
            title: 'Test',
            url: 'https://example.com',
            relevanceScore: score
          };

          const result = zCitation.safeParse(citation);
          expect(result.success).toBe(false);
        });
      }
    });

    it('should require title and url fields', () => {
      const { zCitation } = deepResearchSchemas;
      if (zCitation) {
        const missingFields = [
          { url: 'https://example.com' }, // missing title
          { title: 'Test Title' }, // missing url
          {} // missing both
        ];

        missingFields.forEach(citation => {
          const result = zCitation.safeParse(citation);
          expect(result.success).toBe(false);
        });
      }
    });
  });

  describe('Provider Metadata Schema Validation', () => {
    it('should validate complete provider metadata', () => {
      const { zProviderMeta } = deepResearchSchemas;
      if (zProviderMeta) {
        const validMeta = {
          provider: 'openai',
          model: 'gpt-4',
          usage: {
            prompt_tokens: 100,
            completion_tokens: 200,
            total_tokens: 300,
            search_queries: 5,
            api_calls: 2
          },
          searchTime: 1500,
          responseTime: 3000,
          searchDepth: 'deep',
          realTimeData: true,
          metadata: {
            customField: 'customValue',
            anotherField: 123
          }
        };

        const result = zProviderMeta.safeParse(validMeta);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validMeta);
        }
      }
    });

    it('should validate minimal provider metadata', () => {
      const { zProviderMeta } = deepResearchSchemas;
      if (zProviderMeta) {
        const minimalMeta = {
          provider: 'perplexity'
        };

        const result = zProviderMeta.safeParse(minimalMeta);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.provider).toBe('perplexity');
        }
      }
    });

    it('should reject invalid search depth', () => {
      const { zProviderMeta } = deepResearchSchemas;
      if (zProviderMeta) {
        const invalidMeta = {
          provider: 'test',
          searchDepth: 'invalid_depth'
        };

        const result = zProviderMeta.safeParse(invalidMeta);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues).toContainEqual(
            expect.objectContaining({
              path: ['searchDepth']
            })
          );
        }
      }
    });

    it('should require provider field', () => {
      const { zProviderMeta } = deepResearchSchemas;
      if (zProviderMeta) {
        const metaWithoutProvider = {
          model: 'test-model',
          searchTime: 1000
        };

        const result = zProviderMeta.safeParse(metaWithoutProvider);
        expect(result.success).toBe(false);
      }
    });
  });

  describe('Deep Research Query Schema Validation', () => {
    it('should validate complete query with all options', () => {
      const { zDeepResearchQuery } = deepResearchSchemas;
      if (zDeepResearchQuery) {
        const validQuery = {
          query: 'What is the latest in AI research?',
          provider: 'openai',
          model: 'gpt-4',
          temperature: 0.7,
          max_tokens: 2000,
          maxResults: 20,
          includePageContent: true,
          browsePage: 'https://example.com/research',
          recency: 'week',
          searchDepth: 'deep',
          realTimeData: true,
          searchDomainFilter: ['arxiv.org', 'nature.com'],
          includeAnalysis: true,
          context: 'Looking for recent breakthroughs in machine learning'
        };

        const result = zDeepResearchQuery.safeParse(validQuery);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validQuery);
        }
      }
    });

    it('should validate minimal query with defaults', () => {
      const { zDeepResearchQuery } = deepResearchSchemas;
      if (zDeepResearchQuery) {
        const minimalQuery = {
          query: 'Test query'
        };

        const result = zDeepResearchQuery.safeParse(minimalQuery);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.query).toBe('Test query');
          expect(result.data.provider).toBe('openai'); // default
          expect(result.data.maxResults).toBe(10); // default
          expect(result.data.includePageContent).toBe(false); // default
          expect(result.data.includeAnalysis).toBe(false); // default
        }
      }
    });

    it('should reject query that is too long', () => {
      const { zDeepResearchQuery } = deepResearchSchemas;
      if (zDeepResearchQuery) {
        const longQuery = {
          query: 'a'.repeat(1001) // Exceeds 1000 character limit
        };

        const result = zDeepResearchQuery.safeParse(longQuery);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues).toContainEqual(
            expect.objectContaining({
              path: ['query']
            })
          );
        }
      }
    });

    it('should reject empty query', () => {
      const { zDeepResearchQuery } = deepResearchSchemas;
      if (zDeepResearchQuery) {
        const emptyQuery = {
          query: ''
        };

        const result = zDeepResearchQuery.safeParse(emptyQuery);
        expect(result.success).toBe(false);
      }
    });

    it('should reject invalid temperature values', () => {
      const { zDeepResearchQuery } = deepResearchSchemas;
      if (zDeepResearchQuery) {
        const invalidTemperatures = [-0.1, 2.1, 3.0];
        
        invalidTemperatures.forEach(temp => {
          const query = {
            query: 'test',
            temperature: temp
          };

          const result = zDeepResearchQuery.safeParse(query);
          expect(result.success).toBe(false);
        });
      }
    });

    it('should reject invalid max_tokens values', () => {
      const { zDeepResearchQuery } = deepResearchSchemas;
      if (zDeepResearchQuery) {
        const invalidTokens = [0, 4001, -100];
        
        invalidTokens.forEach(tokens => {
          const query = {
            query: 'test',
            max_tokens: tokens
          };

          const result = zDeepResearchQuery.safeParse(query);
          expect(result.success).toBe(false);
        });
      }
    });

    it('should reject invalid browsePage URL', () => {
      const { zDeepResearchQuery } = deepResearchSchemas;
      if (zDeepResearchQuery) {
        const invalidQuery = {
          query: 'test',
          browsePage: 'not-a-valid-url'
        };

        const result = zDeepResearchQuery.safeParse(invalidQuery);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues).toContainEqual(
            expect.objectContaining({
              path: ['browsePage']
            })
          );
        }
      }
    });

    it('should reject invalid enum values', () => {
      const { zDeepResearchQuery } = deepResearchSchemas;
      if (zDeepResearchQuery) {
        const invalidEnums = [
          { query: 'test', recency: 'invalid' },
          { query: 'test', searchDepth: 'invalid' },
          { query: 'test', provider: 'invalid' }
        ];

        invalidEnums.forEach(queryData => {
          const result = zDeepResearchQuery.safeParse(queryData);
          expect(result.success).toBe(false);
        });
      }
    });
  });

  describe('Search Item Schema Validation', () => {
    it('should validate complete search item', () => {
      const { zSearchItem } = deepResearchSchemas;
      if (zSearchItem) {
        const validItem = {
          title: 'Test Article',
          url: 'https://example.com/article',
          snippet: 'This is a test snippet',
          relevanceScore: 0.9,
          publishedDate: '2023-01-01',
          source: 'Example News'
        };

        const result = zSearchItem.safeParse(validItem);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validItem);
        }
      }
    });

    it('should validate minimal search item', () => {
      const { zSearchItem } = deepResearchSchemas;
      if (zSearchItem) {
        const minimalItem = {
          title: 'Minimal Article',
          url: 'https://example.com',
          snippet: 'Minimal snippet'
        };

        const result = zSearchItem.safeParse(minimalItem);
        expect(result.success).toBe(true);
      }
    });

    it('should require all mandatory fields', () => {
      const { zSearchItem } = deepResearchSchemas;
      if (zSearchItem) {
        const incompleteItems = [
          { url: 'https://example.com', snippet: 'test' }, // missing title
          { title: 'test', snippet: 'test' }, // missing url
          { title: 'test', url: 'https://example.com' } // missing snippet
        ];

        incompleteItems.forEach(item => {
          const result = zSearchItem.safeParse(item);
          expect(result.success).toBe(false);
        });
      }
    });
  });

  describe('Search Result Schema Validation', () => {
    it('should validate complete search result', () => {
      const { zSearchResult } = deepResearchSchemas;
      if (zSearchResult) {
        const validResult = {
          query: 'test query',
          results: [
            {
              title: 'Test Article',
              url: 'https://example.com',
              snippet: 'Test snippet'
            }
          ],
          metadata: {
            totalResults: 100,
            searchTime: 1500,
            provider: 'openai',
            model: 'gpt-4',
            answer: 'Test answer',
            usage: {
              prompt_tokens: 50,
              completion_tokens: 100,
              total_tokens: 150
            }
          }
        };

        const result = zSearchResult.safeParse(validResult);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validResult);
        }
      }
    });

    it('should validate search result without metadata', () => {
      const { zSearchResult } = deepResearchSchemas;
      if (zSearchResult) {
        const resultWithoutMeta = {
          query: 'test query',
          results: []
        };

        const result = zSearchResult.safeParse(resultWithoutMeta);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Page Content Schema Validation', () => {
    it('should validate complete page content', () => {
      const { zPageContent } = deepResearchSchemas;
      if (zPageContent) {
        const validContent = {
          url: 'https://example.com/page',
          title: 'Test Page',
          content: 'This is the page content',
          metadata: {
            extractedAt: '2023-01-01T00:00:00Z',
            contentLength: 1000,
            provider: 'firecrawl',
            status: 'success',
            message: 'Content extracted successfully'
          }
        };

        const result = zPageContent.safeParse(validContent);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validContent);
        }
      }
    });

    it('should validate minimal page content', () => {
      const { zPageContent } = deepResearchSchemas;
      if (zPageContent) {
        const minimalContent = {
          url: 'https://example.com',
          title: 'Test',
          content: 'Content'
        };

        const result = zPageContent.safeParse(minimalContent);
        expect(result.success).toBe(true);
      }
    });

    it('should require all mandatory fields', () => {
      const { zPageContent } = deepResearchSchemas;
      if (zPageContent) {
        const incompleteContent = [
          { title: 'test', content: 'test' }, // missing url
          { url: 'https://example.com', content: 'test' }, // missing title
          { url: 'https://example.com', title: 'test' } // missing content
        ];

        incompleteContent.forEach(content => {
          const result = zPageContent.safeParse(content);
          expect(result.success).toBe(false);
        });
      }
    });
  });

  describe('Deep Research Response Schema Validation', () => {
    it('should validate complete response', () => {
      const { zDeepResearchResponse } = deepResearchSchemas;
      if (zDeepResearchResponse) {
        const validResponse = {
          query: 'test query',
          provider: 'openai',
          searchResults: {
            query: 'test query',
            results: [
              {
                title: 'Test',
                url: 'https://example.com',
                snippet: 'snippet'
              }
            ],
            metadata: {
              provider: 'openai'
            }
          },
          pageContent: {
            url: 'https://example.com',
            title: 'Test Page',
            content: 'Content'
          },
          metadata: {
            timestamp: '2023-01-01T00:00:00Z',
            processingTime: 2000,
            totalResults: 10,
            availableProviders: ['openai', 'perplexity']
          }
        };

        const result = zDeepResearchResponse.safeParse(validResponse);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validResponse);
        }
      }
    });

    it('should validate response without page content', () => {
      const { zDeepResearchResponse } = deepResearchSchemas;
      if (zDeepResearchResponse) {
        const responseWithoutPage = {
          query: 'test query',
          provider: 'openai',
          searchResults: {
            query: 'test query',
            results: [],
            metadata: { provider: 'openai' }
          },
          metadata: {
            timestamp: '2023-01-01T00:00:00Z',
            processingTime: 1000,
            totalResults: 0
          }
        };

        const result = zDeepResearchResponse.safeParse(responseWithoutPage);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Legacy Request Schemas', () => {
    it('should validate legacy deep research request', () => {
      const { deepResearchRequestSchema } = deepResearchSchemas;
      if (deepResearchRequestSchema && typeof deepResearchRequestSchema === 'object') {
        // Note: These are JSON Schema objects, not Zod schemas
        expect(deepResearchRequestSchema.type).toBe('object');
        expect(deepResearchRequestSchema.required).toContain('query');
        expect(deepResearchRequestSchema.properties.query).toHaveProperty('type', 'string');
      }
    });

    it('should validate legacy OpenAI request schema', () => {
      const { openaiRequestSchema } = deepResearchSchemas;
      if (openaiRequestSchema && typeof openaiRequestSchema === 'object') {
        expect(openaiRequestSchema.type).toBe('object');
        expect(openaiRequestSchema.required).toContain('query');
        expect(openaiRequestSchema.properties.options.properties.model.enum).toContain('gpt-4');
      }
    });

    it('should validate legacy Perplexity request schema', () => {
      const { perplexityRequestSchema } = deepResearchSchemas;
      if (perplexityRequestSchema && typeof perplexityRequestSchema === 'object') {
        expect(perplexityRequestSchema.type).toBe('object');
        expect(perplexityRequestSchema.required).toContain('query');
        expect(perplexityRequestSchema.properties.options.properties.model.enum).toContain('sonar-small-online');
      }
    });

    it('should validate legacy Grok request schema', () => {
      const { grokRequestSchema } = deepResearchSchemas;
      if (grokRequestSchema && typeof grokRequestSchema === 'object') {
        expect(grokRequestSchema.type).toBe('object');
        expect(grokRequestSchema.required).toContain('query');
        expect(grokRequestSchema.properties.options.properties.searchDepth.enum).toContain('deep');
      }
    });
  });

  describe('Tool Schema Utility Functions', () => {
    it('should get schema for valid tool names', () => {
      const { getSchemaForTool, toolSchemas } = deepResearchSchemas;
      if (getSchemaForTool && toolSchemas) {
        const validTools = Object.keys(toolSchemas);
        
        validTools.forEach(toolName => {
          const schema = getSchemaForTool(toolName);
          expect(schema).toBeDefined();
          expect(schema).toBe(toolSchemas[toolName]);
        });
      }
    });

    it('should return undefined for invalid tool names', () => {
      const { getSchemaForTool } = deepResearchSchemas;
      if (getSchemaForTool) {
        const invalidTools = ['invalid-tool', 'nonexistent', ''];
        
        invalidTools.forEach(toolName => {
          const schema = getSchemaForTool(toolName);
          expect(schema).toBeUndefined();
        });
      }
    });

    it('should have all expected tools in registry', () => {
      const { toolSchemas } = deepResearchSchemas;
      if (toolSchemas) {
        const expectedTools = ['openai-deep-research', 'perplexity-sonar', 'grok3'];
        
        expectedTools.forEach(toolName => {
          expect(toolSchemas).toHaveProperty(toolName);
        });
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed data gracefully', () => {
      const { zDeepResearchQuery } = deepResearchSchemas;
      if (zDeepResearchQuery) {
        const malformedData = [
          null,
          undefined,
          'string instead of object',
          123,
          [],
          { not_a_query: 'value' }
        ];

        malformedData.forEach(data => {
          const result = zDeepResearchQuery.safeParse(data);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error).toBeDefined();
          }
        });
      }
    });

    it('should provide detailed error messages', () => {
      const { zDeepResearchQuery } = deepResearchSchemas;
      if (zDeepResearchQuery) {
        const invalidData = {
          query: '', // Empty query (invalid)
          provider: 'invalid', // Invalid provider
          temperature: -1, // Invalid temperature
          maxResults: 0 // Invalid maxResults
        };

        const result = zDeepResearchQuery.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.length).toBeGreaterThan(0);
          result.error.issues.forEach(issue => {
            expect(issue.message).toBeDefined();
            expect(issue.path).toBeDefined();
          });
        }
      }
    });
  });

  describe('Type Safety', () => {
    it('should export correct TypeScript types', () => {
      const { 
        zDeepResearchQuery, 
        zDeepResearchResponse 
      } = deepResearchSchemas;
      
      if (zDeepResearchQuery && zDeepResearchResponse) {
        // This test ensures the schemas can be parsed and types are inferred
        const validQuery = {
          query: 'test',
          provider: 'openai' as const
        };
        
        const queryResult = zDeepResearchQuery.safeParse(validQuery);
        expect(queryResult.success).toBe(true);
        
        if (queryResult.success) {
          // TypeScript should infer the correct type
          expect(typeof queryResult.data.query).toBe('string');
          expect(typeof queryResult.data.provider).toBe('string');
        }
      }
    });
  });
});