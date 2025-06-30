# Logging, Monitoring, and Graceful Shutdown Implementation

This document describes the implementation of Step 10 of the project plan: "Logging, monitoring, graceful shutdown."

## Overview

The implementation provides comprehensive logging, request/response monitoring, and graceful shutdown capabilities for the MCP server and HTTP server.

## Features Implemented

### 1. Winston Logger with Dual Format Support

**Files:** `src/utils/logger.ts`

- **JSON Format:** Structured logging for production environments
- **Pretty Format:** Human-readable logging for development
- **Environment Control:** Set `LOG_FORMAT=json` or `LOG_FORMAT=pretty` (defaults to `pretty`)
- **Multi-level Logging:** Debug, info, warn, error levels
- **File and Console Output:** Separate log files for each level + console output
- **Security:** Logs directory path validation to prevent directory traversal

**Usage Examples:**
```bash
# Development (pretty format)
LOG_FORMAT=pretty npm start

# Production (JSON format)
LOG_FORMAT=json npm start
```

### 2. Request/Response Logging with Sensitive Data Scrubbing

**Files:** `src/middleware/requestLogger.ts`, `src/utils/secureLogger.ts`

- **Request Logging:** Method, URL, headers, body, IP, user agent
- **Response Logging:** Status code, headers, response body, duration
- **Request IDs:** Unique identifier for request correlation
- **Sensitive Data Scrubbing:** Automatically redacts API keys, passwords, tokens
- **Performance Tracking:** Request duration measurement

**Sensitive Fields Automatically Redacted:**
- Headers: authorization, cookie, x-api-key, x-auth-token, etc.
- Body fields: password, secret, token, apiKey, credentials, etc.
- Patterns: API key formats, connection strings, environment variables

### 3. Graceful Shutdown Manager

**Files:** `src/utils/gracefulShutdown.ts`

- **Signal Handling:** SIGTERM, SIGINT for graceful shutdown
- **Exception Handling:** Uncaught exceptions and unhandled promise rejections
- **Shutdown Targets:** Configurable list of resources to clean up
- **Timeout Protection:** Forced shutdown after timeout (default: 30 seconds)
- **Non-zero Exit Codes:** Proper exit codes for fatal errors

**Default Shutdown Targets:**
1. HTTP Server (graceful connection closure)
2. Neo4j Connection
3. Bottleneck Rate Limiters
4. Custom Rate Limiters

### 4. Bottleneck Scheduler Cleanup

**Files:** `src/config/index.ts`, `src/utils/gracefulShutdown.ts`

- **Automatic Detection:** Finds all configured Bottleneck instances
- **Graceful Stop:** Calls `stop()` method on each scheduler
- **Provider Support:** OpenAI, Perplexity, XAI Grok, Global limiters
- **Error Handling:** Continues cleanup even if individual schedulers fail

### 5. Custom Rate Limiter Cleanup

**Files:** `src/middleware/rateLimiter.ts`, `src/utils/gracefulShutdown.ts`

- **Global Registry:** Tracks all RateLimiter instances
- **Automatic Cleanup:** Stops intervals and clears storage
- **Resource Management:** Prevents memory leaks on shutdown

## Integration Points

### HTTP Server Integration

**File:** `src/mcp/server.ts`

```javascript
// Request logging middleware (early in chain)
app.use(requestLogger)

// Error logging middleware
app.use(errorLogger)

// Graceful shutdown initialization
gracefulShutdown.registerServer(server)
gracefulShutdown.initialize()
```

### MCP Server Integration

**File:** `src/index.ts`

```javascript
// Initialize graceful shutdown for MCP server
gracefulShutdown.initialize()
```

## Configuration

### Environment Variables

```bash
# Logging configuration
LOG_LEVEL=info          # debug, info, warn, error
LOG_FORMAT=pretty       # json, pretty

# Shutdown timeout (optional)
SHUTDOWN_TIMEOUT_MS=30000
```

### Adding Custom Shutdown Targets

```javascript
import { gracefulShutdown } from './utils/gracefulShutdown.js'

gracefulShutdown.addTarget({
  name: 'Custom Resource',
  shutdown: async () => {
    // Custom cleanup logic
    await myCustomResource.close()
  }
})
```

## Error Handling

### Fatal Error Scenarios
- **Configuration Validation Failures:** Exit code 1
- **Neo4j Connection Failures:** Exit code 1
- **Uncaught Exceptions:** Exit code 1
- **Unhandled Promise Rejections:** Exit code 1
- **Shutdown Timeout:** Exit code 1

### Graceful Error Recovery
- **Individual Shutdown Target Failures:** Continue with remaining targets
- **Rate Limiter Cleanup Failures:** Log error, continue shutdown
- **Server Close Failures:** Force close after timeout

## Testing

### Manual Testing

```bash
# Test the implementation
node test-logging-shutdown.js

# Test graceful shutdown
npm run dev:http-server &
kill -TERM $!  # or Ctrl+C

# Test with different log formats
LOG_FORMAT=json npm run dev:http-server
LOG_FORMAT=pretty npm run dev:http-server
```

### Log Output Examples

**Pretty Format (Development):**
```
[2024-01-01T12:00:00.000Z] info: HTTP Request
  Context: {
    "requestId": "abc12345",
    "method": "POST",
    "url": "/deep-research",
    "headers": {
      "authorization": "[REDACTED]"
    }
  }
```

**JSON Format (Production):**
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "info",
  "message": "HTTP Request",
  "context": {
    "requestId": "abc12345",
    "method": "POST",
    "url": "/deep-research"
  }
}
```

## Security Considerations

### Data Protection
- **Automatic Redaction:** Sensitive data never appears in logs
- **Pattern Matching:** Comprehensive regex patterns for sensitive data
- **Field-based Redaction:** Known sensitive field names are redacted
- **Safe Defaults:** Err on the side of caution when detecting sensitive data

### Log Safety
- **Path Validation:** Prevents directory traversal attacks
- **Project Boundary:** Logs only written within project directory
- **Error Handling:** Graceful fallback to console-only logging

## Performance Impact

### Minimal Overhead
- **Efficient Redaction:** Optimized pattern matching
- **Lazy Evaluation:** Context only processed when needed
- **Background Cleanup:** Rate limiter cleanup runs in background intervals
- **Non-blocking Shutdown:** Asynchronous cleanup operations

### Resource Management
- **Memory Cleanup:** Proper cleanup of intervals and storage
- **Connection Closure:** Graceful database connection closure
- **Process Management:** Clean process termination

## Production Recommendations

1. **Use JSON Logging:** Set `LOG_FORMAT=json` in production
2. **Appropriate Log Levels:** Use `info` or `warn` level in production
3. **Log Rotation:** Implement external log rotation (logrotate, etc.)
4. **Monitoring:** Monitor log files for errors and performance metrics
5. **Alerting:** Set up alerts for error patterns and shutdown events

## Troubleshooting

### Common Issues

1. **Logs Directory Not Created:** Check file permissions
2. **Graceful Shutdown Timeout:** Increase `SHUTDOWN_TIMEOUT_MS`
3. **Missing Log Entries:** Check log level configuration
4. **Rate Limiter Cleanup Errors:** Normal if no active limiters

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm start

# Verbose shutdown logging
DEBUG=shutdown npm start
```

This implementation ensures robust logging, monitoring, and graceful shutdown capabilities while maintaining security and performance standards.
