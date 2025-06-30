# Observability System

This directory contains a comprehensive observability solution for the DeepResearch MCP Server, providing metrics, health checks, performance monitoring, and API endpoints for monitoring system health and performance.

## Components

### 1. Metrics Collection (`metrics.ts`)
- **Prometheus-compatible metrics** using `prom-client`
- **HTTP request metrics**: Request count, duration, size, response codes
- **Database metrics**: Query duration, connection count, transaction metrics
- **MCP tool metrics**: Execution time, success/failure rates, error types
- **Business metrics**: Project counts, task counts, knowledge items, search queries
- **System metrics**: Memory usage, CPU usage, event loop lag
- **Rate limiting metrics**: Hit counts, violations

### 2. Health Monitoring (`health.ts`)
- **Database connectivity** checks
- **Memory usage** monitoring with thresholds
- **Event loop lag** detection
- **Disk space** monitoring
- **Custom health checks** registration
- **Liveness/readiness** probes for Kubernetes

### 3. Performance Monitoring (`performance.ts`)
- **Operation timing** with start/end tracking
- **Memory usage** delta tracking
- **Slow operation** detection and alerting
- **Performance statistics** (avg, percentiles)
- **Performance decorator** for automatic tracking
- **Stale operation** cleanup

### 4. API Endpoints (`api.ts`)
- **Metrics endpoint**: `/observability/metrics` (Prometheus format)
- **Health endpoints**: `/observability/health/*`
- **Performance endpoints**: `/observability/performance/*`
- **System info**: `/observability/system`
- **Dashboard**: `/observability/dashboard`

### 5. Middleware Integration (`../middleware/observability.ts`)
- **Request ID** assignment
- **HTTP metrics** collection
- **Error tracking**
- **Rate limit monitoring**
- **Business metrics** tracking

## Usage

### Basic Setup

```typescript
import { initializeObservability, observabilityRouter } from './src/observability/index.js';
import express from 'express';

const app = express();

// Initialize observability system
await initializeObservability();

// Add observability routes
app.use('/observability', observabilityRouter);

// Add observability middleware
setupObservabilityMiddleware(app);
```

### Performance Tracking

```typescript
import { performanceMonitor, trackPerformance } from './src/observability/index.js';

// Manual tracking
const requestId = 'unique-request-id';
performanceMonitor.startOperation(requestId, 'database_query');
// ... perform operation
const metrics = performanceMonitor.endOperation(requestId);

// Decorator-based tracking
class DatabaseService {
  @trackPerformance('db_query')
  async executeQuery(query: string) {
    // This method will be automatically tracked
    return await database.run(query);
  }
}
```

### Custom Health Checks

```typescript
import { healthMonitor } from './src/observability/index.js';

// Register custom health check
healthMonitor.registerHealthCheck('external_api', async () => {
  try {
    await fetch('https://api.example.com/health');
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      duration: 100,
      details: { endpoint: 'api.example.com' }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      duration: 100,
      error: error.message
    };
  }
});
```

### Custom Metrics

```typescript
import { metrics } from './src/observability/index.js';

// Record custom business metrics
metrics.deepResearchRequests.inc({ provider: 'openai', success: 'true' });
metrics.searchQueriesTotal.inc({ search_type: 'unified' });
```

## API Endpoints

### Metrics
- `GET /observability/metrics` - Prometheus metrics (text/plain)
- `GET /observability/config` - Observability configuration

### Health Checks
- `GET /observability/health` - Comprehensive health status
- `GET /observability/health/live` - Liveness probe
- `GET /observability/health/ready` - Readiness probe
- `GET /observability/health/:checkName` - Specific health check

### Performance
- `GET /observability/performance/stats` - Performance statistics
- `GET /observability/performance/stats?operationType=db_query` - Specific operation stats
- `GET /observability/performance/slow` - Recent slow operations
- `DELETE /observability/performance/history` - Clear performance history

### System
- `GET /observability/system` - System information
- `GET /observability/dashboard` - Overview dashboard

## Monitoring Integration

### Prometheus
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'deepresearch-mcp'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/observability/metrics'
    scrape_interval: 15s
```

### Kubernetes
```yaml
# deployment.yaml
apiVersion: v1
kind: Service
metadata:
  name: deepresearch-mcp
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/path: "/observability/metrics"
    prometheus.io/port: "3000"
spec:
  ports:
    - port: 3000
  selector:
    app: deepresearch-mcp

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: deepresearch-mcp
spec:
  template:
    spec:
      containers:
      - name: app
        livenessProbe:
          httpGet:
            path: /observability/health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /observability/health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Metrics Reference

### HTTP Metrics
- `deepresearch_http_requests_total` - Total HTTP requests
- `deepresearch_http_request_duration_seconds` - Request duration histogram
- `deepresearch_http_request_size_bytes` - Request size histogram
- `deepresearch_http_response_size_bytes` - Response size histogram

### Database Metrics
- `deepresearch_db_connections_active` - Active database connections
- `deepresearch_db_query_duration_seconds` - Database query duration
- `deepresearch_db_queries_total` - Total database queries
- `deepresearch_db_transactions_total` - Total database transactions

### MCP Tool Metrics
- `deepresearch_mcp_tool_executions_total` - Total tool executions
- `deepresearch_mcp_tool_duration_seconds` - Tool execution duration
- `deepresearch_mcp_tool_errors_total` - Tool execution errors

### Business Metrics
- `deepresearch_projects_total` - Total projects by status
- `deepresearch_tasks_total` - Total tasks by status and priority
- `deepresearch_knowledge_items_total` - Total knowledge items by type
- `deepresearch_search_queries_total` - Total search queries by type
- `deepresearch_deep_research_requests_total` - Deep research requests

### System Metrics
- `deepresearch_memory_usage_bytes` - Memory usage by type
- `deepresearch_cpu_usage_percent` - CPU usage percentage
- `deepresearch_event_loop_lag_seconds` - Event loop lag histogram

### Error Metrics
- `deepresearch_errors_total` - Total errors by severity
- `deepresearch_errors_by_type_total` - Errors by type and component

## Configuration

The observability system can be configured through environment variables:

```bash
# Logging level affects observability logging
LOG_LEVEL=info

# Node environment affects health check behavior
NODE_ENV=production

# Custom metrics collection interval (default: 30s)
METRICS_UPDATE_INTERVAL=30000

# Performance history size (default: 1000)
PERFORMANCE_HISTORY_SIZE=1000
```

## Troubleshooting

### High Memory Usage
- Check `/observability/health/memory` for memory usage details
- Review `/observability/performance/slow` for memory-intensive operations
- Monitor `deepresearch_memory_usage_bytes` metric

### Slow Operations
- Use `/observability/performance/slow` to identify slow operations
- Check `deepresearch_mcp_tool_duration_seconds` for tool performance
- Review `deepresearch_db_query_duration_seconds` for database performance

### Health Check Failures
- Check specific health checks: `/observability/health/database`
- Review logs for health check errors
- Monitor `deepresearch_errors_total` metric for error trends

### Missing Metrics
- Verify Prometheus is scraping `/observability/metrics`
- Check observability initialization in application startup
- Review network connectivity and firewall settings

## Development

To extend the observability system:

1. **Add new metrics** in `metrics.ts`
2. **Create custom health checks** in `health.ts`
3. **Add performance tracking** using decorators or manual calls
4. **Extend API endpoints** in `api.ts`
5. **Add middleware** for automatic tracking

## Dependencies

- `prom-client`: Prometheus metrics collection
- `pidusage`: Process CPU usage monitoring
- `systeminformation`: System information gathering
- `express`: Web framework for API endpoints
- `nanoid`: Unique request ID generation