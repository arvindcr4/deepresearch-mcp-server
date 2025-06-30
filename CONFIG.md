# Configuration & API Key Management

This document describes the configuration and rate limiting system implemented for the deepresearch-mcp-server.

## Overview

The configuration system uses:
- **dotenv + dotenv-expand** for environment variable management
- **zod** for configuration validation
- **Bottleneck** for per-provider rate limiting

## Environment Variables

### Required API Keys

Copy `.env.example` to `.env` and configure your API keys:

```bash
# API Keys
OPENAI_API_KEY=your_openai_api_key_here
PERPLEXITY_API_KEY=your_perplexity_api_key_here
XAI_GROK_API_KEY=your_xai_grok_api_key_here
```

### Rate Limiting Configuration

```bash
# Rate Limiting Configuration (requests per minute)
GLOBAL_RATE_LIMIT=30      # Global rate limit
OPENAI_RATE_LIMIT=50      # OpenAI-specific limit
PERPLEXITY_RATE_LIMIT=30  # Perplexity-specific limit
XAI_GROK_RATE_LIMIT=40    # XAI Grok-specific limit
```

### Other Configuration

```bash
# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password

# Application Configuration
LOG_LEVEL=info # debug, info, warn, error
NODE_ENV=development # development, production, test

# Database Backup Configuration
BACKUP_MAX_COUNT=15
BACKUP_FILE_DIR=/path/to/backup/directory
```

## Usage in Code

### Basic Configuration Access

```typescript
import { config } from './config/index.js';

// Access API keys
const openaiKey = config.apiKeys.openai;
const perplexityKey = config.apiKeys.perplexity;
const grokKey = config.apiKeys.xaiGrok;

// Access rate limits
const globalLimit = config.rateLimits.global;
const openaiLimit = config.rateLimits.openai;

// Backward compatibility (legacy apis structure)
const legacyOpenaiKey = config.apis.openai?.apiKey;
```

### Rate Limiting with Bottleneck

```typescript
import { rateLimitManager, rateLimiters } from './config/index.js';

// Method 1: Using the rate limit manager
const result = await rateLimitManager.schedule('openai', async () => {
  // Your API call here
  return await openaiApiCall();
});

// Method 2: Using individual limiters
const result = await rateLimiters.openai.schedule(() => {
  // Your API call here
  return openaiApiCall();
});

// Check rate limiter status
const status = rateLimitManager.getStatus('openai');
console.log('Queued:', status.queued);
console.log('Running:', status.running);

// Get status for all providers
const allStatus = rateLimitManager.getAllStatus();
```

### Configuration Validation

The configuration is automatically validated using Zod schemas. If validation fails, the application will exit with detailed error messages.

```typescript
import { ConfigSchema } from './config/index.js';

// The configuration is automatically validated on import
// Invalid configurations will cause the application to exit
```

## Rate Limiting Features

### Per-Provider Limits

Each API provider has its own rate limiter with configurable limits:

- **OpenAI**: Default 50 requests/minute, max 3 concurrent
- **Perplexity**: Default 30 requests/minute, max 2 concurrent  
- **XAI Grok**: Default 40 requests/minute, max 2 concurrent
- **Global**: Default 30 requests/minute, max 5 concurrent

### Bottleneck Configuration

Each provider's rate limiter is configured with:
- **Reservoir**: Number of requests per time window
- **Reservoir Refresh**: Refills the reservoir every minute
- **Max Concurrent**: Maximum concurrent requests
- **Automatic Queue Management**: Requests are queued when limits are reached

## Environment Variable Expansion

The system supports dotenv variable expansion:

```bash
# Example: Use one base URL for multiple endpoints
BASE_API_URL=https://api.example.com
OPENAI_ENDPOINT=${BASE_API_URL}/openai
PERPLEXITY_ENDPOINT=${BASE_API_URL}/perplexity
```

## Error Handling

- **Configuration Validation**: Zod validates all configuration on startup
- **Missing API Keys**: Optional keys won't cause validation errors
- **Rate Limiting**: Bottleneck handles queuing and backpressure automatically
- **Environment Issues**: Detailed error messages for debugging

## Migration from Legacy Configuration

The new system maintains backward compatibility with the existing `config.apis` structure:

```typescript
// Legacy code continues to work
const openaiKey = config.apis.openai?.apiKey;
const perplexityKey = config.apis.perplexity?.apiKey;
const grokKey = config.apis.grok?.apiKey;

// New recommended approach
const openaiKey = config.apiKeys.openai;
const perplexityKey = config.apiKeys.perplexity;
const grokKey = config.apiKeys.xaiGrok;
```

## Testing

Run the configuration test to verify your setup:

```bash
npm run build
node ./test-config.js
```

This will show:
- Configuration structure
- API key status (masked)
- Rate limit settings
- Rate limiter status
- Backward compatibility verification
