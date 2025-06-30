# Deep Research Validation with Zod

This document outlines the comprehensive validation system implemented for the Deep Research MCP Server using Zod schemas.

## Overview

The validation system provides type-safe validation for both HTTP and CLI invocations of the deep research functionality. It ensures data integrity and provides clear error messages for invalid inputs.

## Core Schemas

### zDeepResearchQuery

The unified schema for deep research queries that supports all providers:

```typescript
export const zDeepResearchQuery = z.object({
  query: z.string().min(1).max(1000).describe('The research query to search for'),
  provider: zProviderType.default('openai').describe('The provider to use for the search'),
  model: z.string().optional().describe('The model to use (provider-specific)'),
  temperature: z.number().min(0).max(2).optional().describe('Temperature for the model'),
  max_tokens: z.number().min(1).max(4000).optional().describe('Maximum tokens for the response'),
  maxResults: z.number().min(1).max(100).optional().default(10).describe('Maximum number of search results'),
  includePageContent: z.boolean().optional().default(false).describe('Whether to include full page content'),
  browsePage: z.string().url().optional().describe('Specific URL to browse for additional context'),
  recency: z.enum(['day', 'week', 'month', 'year']).optional().describe('Time filter for search results (Perplexity only)'),
  searchDepth: z.enum(['shallow', 'medium', 'deep']).optional().describe('Search depth (Grok only)'),
  realTimeData: z.boolean().optional().describe('Use real-time data (Grok only)'),
  searchDomainFilter: z.array(z.string()).optional().describe('Domain filter for search results (Perplexity only)'),
  includeAnalysis: z.boolean().optional().default(false).describe('Whether to include AI analysis of results'),
  context: z.string().optional().describe('Additional context for the research query')
})
```

### zDeepResearchResponse

The schema for validating research responses:

```typescript
export const zDeepResearchResponse = z.object({
  query: z.string(),
  provider: z.string(),
  searchResults: zSearchResult,
  pageContent: zPageContent.optional(),
  metadata: z.object({
    timestamp: z.string(),
    processingTime: z.number(),
    totalResults: z.number(),
    availableProviders: z.array(z.string()).optional()
  })
})
```

## Validation Classes

### ZodValidator

The main validation class providing static methods for validation:

```typescript
export class ZodValidator {
  // Validate deep research query input
  static validateDeepResearchQuery(data: unknown): DeepResearchQuery

  // Validate deep research response output
  static validateDeepResearchResponse(data: unknown): DeepResearchResponseType

  // Generic Zod schema validator
  static validate<T>(schema: z.ZodSchema<T>, data: unknown, schemaName: string = 'Schema'): T

  // Safe parse that returns result with success/error status
  static safeParse<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string }
}
```

### CLIValidator

Specialized validator for CLI arguments with type conversion:

```typescript
export class CLIValidator {
  // Validate CLI arguments for deep research
  static validateCLIArgs(args: any): DeepResearchQuery
}
```

## HTTP Middleware

For Express.js applications, validation middleware is provided:

```typescript
export function createValidationMiddleware<T>(
  schema: z.ZodSchema<T>, 
  target: 'body' | 'query' | 'params' = 'body'
) {
  return (req: any, res: any, next: any) => {
    // Validates request data and adds validated data to req object
  }
}
```

### Usage Example

```typescript
import { createValidationMiddleware, zDeepResearchQuery } from './middleware/validation.js'

app.post('/api/research', 
  createValidationMiddleware(zDeepResearchQuery, 'body'),
  (req, res) => {
    // req.validatedBody contains the validated data
    const validatedQuery = req.validatedBody
    // ... handle request
  }
)
```

## CLI Integration

The CLI now supports comprehensive validation with the `unified-search` command:

```bash
# Basic usage
npx deepresearch-mcp unified-search "What is quantum computing?"

# Advanced usage with all options
npx deepresearch-mcp unified-search "AI developments 2024" \
  --provider perplexity \
  --model sonar-medium-online \
  --temperature 0.7 \
  --max-tokens 2000 \
  --max-results 15 \
  --include-page-content \
  --recency week \
  --search-domain-filter arxiv.org nature.com \
  --include-analysis \
  --context "Research for academic paper" \
  --output json
```

## MCP Tool Integration

The unified deep research tool is available as an MCP tool with automatic validation:

```json
{
  "name": "deep-research-unified",
  "description": "Perform comprehensive deep research using multiple AI providers with unified interface and validation",
  "arguments": {
    "query": "What are the latest developments in quantum computing?",
    "provider": "openai",
    "model": "gpt-4",
    "maxResults": 10,
    "includePageContent": true
  }
}
```

## Provider-Specific Options

### OpenAI
- `model`: gpt-4, gpt-4-turbo, gpt-3.5-turbo
- `temperature`: 0.0 - 2.0
- `max_tokens`: 1 - 4000
- `includePageContent`: boolean
- `browsePage`: URL string

### Perplexity
- `model`: sonar-small-online, sonar-medium-online, sonar-small-chat, sonar-medium-chat
- `recency`: day, week, month, year
- `searchDomainFilter`: array of domain strings
- `maxResults`: 1 - 30

### Grok
- `searchDepth`: shallow, medium, deep
- `realTimeData`: boolean
- `includePageContent`: boolean
- `browsePage`: URL string
- `maxResults`: 1 - 40

## Error Handling

The validation system provides detailed error messages:

```typescript
try {
  const validatedQuery = ZodValidator.validateDeepResearchQuery(userData)
} catch (error) {
  // Error message includes field path and validation details
  console.error(error.message)
  // Example: "Deep Research Query validation failed: query: String must contain at least 1 character(s), temperature: Number must be less than or equal to 2"
}
```

## Testing

Run the validation test suite:

```bash
# Basic test
npm run test:validation

# Verbose output
npm run test:validation:verbose
```

The test suite covers:
- Valid and invalid query inputs
- Response validation
- CLI argument conversion
- Edge cases and error conditions
- Safe parse functionality

## Best Practices

1. **Always validate inputs** before processing
2. **Use safe parse** for non-critical validations where you want to handle errors gracefully
3. **Leverage TypeScript types** generated from Zod schemas
4. **Provide context** in validation error messages
5. **Test validation** with both valid and invalid inputs

## Type Safety

All schemas generate TypeScript types for compile-time safety:

```typescript
import type { DeepResearchQuery, DeepResearchResponseType } from './schemas/deepResearch.js'

function processQuery(query: DeepResearchQuery): Promise<DeepResearchResponseType> {
  // TypeScript ensures type safety
}
```

## Migration from Legacy Validation

The system maintains backward compatibility with existing JSON Schema validation while providing the enhanced Zod-based validation for new features. Legacy tools continue to work while new unified tools use Zod validation.
