import client, { 
  Counter, 
  Histogram, 
  Gauge, 
  collectDefaultMetrics, 
  register 
} from 'prom-client';
import { logger } from '../utils/logger.js';

// Enable default Node.js metrics collection
collectDefaultMetrics({ 
  prefix: 'deepresearch_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // Custom GC duration buckets
});

/**
 * Application Metrics Collector
 * Provides Prometheus-compatible metrics for monitoring application performance
 */
export class MetricsCollector {
  // HTTP Request Metrics
  public readonly httpRequestsTotal: Counter<string>;
  public readonly httpRequestDuration: Histogram<string>;
  public readonly httpRequestSize: Histogram<string>;
  public readonly httpResponseSize: Histogram<string>;

  // Database Metrics
  public readonly dbConnectionsActive: Gauge<string>;
  public readonly dbQueryDuration: Histogram<string>;
  public readonly dbQueriesTotal: Counter<string>;
  public readonly dbTransactionsTotal: Counter<string>;

  // MCP Tool Metrics
  public readonly mcpToolExecutions: Counter<string>;
  public readonly mcpToolDuration: Histogram<string>;
  public readonly mcpToolErrors: Counter<string>;

  // Business Logic Metrics
  public readonly projectsTotal: Gauge<string>;
  public readonly tasksTotal: Gauge<string>;
  public readonly knowledgeItemsTotal: Gauge<string>;
  public readonly searchQueriesTotal: Counter<string>;
  public readonly deepResearchRequests: Counter<string>;

  // System Resource Metrics
  public readonly memoryUsage: Gauge<string>;
  public readonly cpuUsage: Gauge<string>;
  public readonly eventLoopLag: Histogram<string>;

  // Rate Limiting Metrics
  public readonly rateLimitHits: Counter<string>;
  public readonly rateLimitExceeded: Counter<string>;

  // Error Metrics
  public readonly errorsTotal: Counter<string>;
  public readonly errorsByType: Counter<string>;

  private static instance: MetricsCollector;

  private constructor() {
    // HTTP Request Metrics
    this.httpRequestsTotal = new Counter({
      name: 'deepresearch_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.httpRequestDuration = new Histogram({
      name: 'deepresearch_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
    });

    this.httpRequestSize = new Histogram({
      name: 'deepresearch_http_request_size_bytes',
      help: 'HTTP request size in bytes',
      labelNames: ['method', 'route'],
      buckets: [100, 1000, 10000, 100000, 1000000, 10000000],
    });

    this.httpResponseSize = new Histogram({
      name: 'deepresearch_http_response_size_bytes',
      help: 'HTTP response size in bytes',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [100, 1000, 10000, 100000, 1000000, 10000000],
    });

    // Database Metrics
    this.dbConnectionsActive = new Gauge({
      name: 'deepresearch_db_connections_active',
      help: 'Number of active database connections',
    });

    this.dbQueryDuration = new Histogram({
      name: 'deepresearch_db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation_type', 'success'],
      buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5, 10, 30],
    });

    this.dbQueriesTotal = new Counter({
      name: 'deepresearch_db_queries_total',
      help: 'Total number of database queries',
      labelNames: ['operation_type', 'success'],
    });

    this.dbTransactionsTotal = new Counter({
      name: 'deepresearch_db_transactions_total',
      help: 'Total number of database transactions',
      labelNames: ['operation_type', 'success'],
    });

    // MCP Tool Metrics
    this.mcpToolExecutions = new Counter({
      name: 'deepresearch_mcp_tool_executions_total',
      help: 'Total number of MCP tool executions',
      labelNames: ['tool_name', 'success'],
    });

    this.mcpToolDuration = new Histogram({
      name: 'deepresearch_mcp_tool_duration_seconds',
      help: 'MCP tool execution duration in seconds',
      labelNames: ['tool_name'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
    });

    this.mcpToolErrors = new Counter({
      name: 'deepresearch_mcp_tool_errors_total',
      help: 'Total number of MCP tool errors',
      labelNames: ['tool_name', 'error_type'],
    });

    // Business Logic Metrics
    this.projectsTotal = new Gauge({
      name: 'deepresearch_projects_total',
      help: 'Total number of projects in the system',
      labelNames: ['status'],
    });

    this.tasksTotal = new Gauge({
      name: 'deepresearch_tasks_total',
      help: 'Total number of tasks in the system',
      labelNames: ['status', 'priority'],
    });

    this.knowledgeItemsTotal = new Gauge({
      name: 'deepresearch_knowledge_items_total',
      help: 'Total number of knowledge items in the system',
      labelNames: ['type'],
    });

    this.searchQueriesTotal = new Counter({
      name: 'deepresearch_search_queries_total',
      help: 'Total number of search queries',
      labelNames: ['search_type'],
    });

    this.deepResearchRequests = new Counter({
      name: 'deepresearch_deep_research_requests_total',
      help: 'Total number of deep research requests',
      labelNames: ['provider', 'success'],
    });

    // System Resource Metrics
    this.memoryUsage = new Gauge({
      name: 'deepresearch_memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type'], // heap_used, heap_total, external, rss
    });

    this.cpuUsage = new Gauge({
      name: 'deepresearch_cpu_usage_percent',
      help: 'CPU usage percentage',
    });

    this.eventLoopLag = new Histogram({
      name: 'deepresearch_event_loop_lag_seconds',
      help: 'Event loop lag in seconds',
      buckets: [0.001, 0.01, 0.1, 1, 2, 5],
    });

    // Rate Limiting Metrics
    this.rateLimitHits = new Counter({
      name: 'deepresearch_rate_limit_hits_total',
      help: 'Total number of rate limit checks',
      labelNames: ['key_type'],
    });

    this.rateLimitExceeded = new Counter({
      name: 'deepresearch_rate_limit_exceeded_total',
      help: 'Total number of rate limit violations',
      labelNames: ['key_type'],
    });

    // Error Metrics
    this.errorsTotal = new Counter({
      name: 'deepresearch_errors_total',
      help: 'Total number of errors',
      labelNames: ['severity'],
    });

    this.errorsByType = new Counter({
      name: 'deepresearch_errors_by_type_total',
      help: 'Total number of errors by type',
      labelNames: ['error_type', 'component'],
    });

    this.startResourceMonitoring();
    logger.info('Metrics collector initialized with Prometheus exports');
  }

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  /**
   * Get all metrics in Prometheus format
   */
  public async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * Get metrics registry for custom integrations
   */
  public getRegistry() {
    return register;
  }

  /**
   * Clear all metrics (useful for testing)
   */
  public clear(): void {
    register.clear();
  }

  /**
   * Start monitoring system resources
   */
  private startResourceMonitoring(): void {
    // Monitor memory usage every 10 seconds
    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.memoryUsage.set({ type: 'heap_used' }, memUsage.heapUsed);
      this.memoryUsage.set({ type: 'heap_total' }, memUsage.heapTotal);
      this.memoryUsage.set({ type: 'external' }, memUsage.external);
      this.memoryUsage.set({ type: 'rss' }, memUsage.rss);
    }, 10000);

    // Monitor event loop lag
    let start = process.hrtime.bigint();
    setInterval(() => {
      const delta = process.hrtime.bigint() - start;
      const nanosec = Number(delta);
      const seconds = nanosec / 1e9;
      this.eventLoopLag.observe(seconds);
      start = process.hrtime.bigint();
    }, 1000);

    // Monitor CPU usage (requires external package)
    this.monitorCpuUsage();
  }

  /**
   * Monitor CPU usage using pidusage
   */
  private async monitorCpuUsage(): Promise<void> {
    try {
      const pidusage = await import('pidusage');
      
      setInterval(async () => {
        try {
          const stats = await pidusage.default(process.pid);
          this.cpuUsage.set(stats.cpu);
        } catch (error) {
          logger.warn('Failed to get CPU usage stats', { error });
        }
      }, 15000);
    } catch (error) {
      logger.warn('CPU monitoring not available', { error });
    }
  }

  /**
   * Record HTTP request metrics
   */
  public recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
    requestSize?: number,
    responseSize?: number
  ): void {
    const labels = { method, route, status_code: statusCode.toString() };
    
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe(labels, duration);
    
    if (requestSize !== undefined) {
      this.httpRequestSize.observe({ method, route }, requestSize);
    }
    
    if (responseSize !== undefined) {
      this.httpResponseSize.observe(labels, responseSize);
    }
  }

  /**
   * Record database operation metrics
   */
  public recordDbOperation(
    operationType: string,
    duration: number,
    success: boolean
  ): void {
    const successLabel = success ? 'true' : 'false';
    const labels = { operation_type: operationType, success: successLabel };
    
    this.dbQueriesTotal.inc(labels);
    this.dbQueryDuration.observe(labels, duration);
  }

  /**
   * Record MCP tool execution metrics
   */
  public recordMcpToolExecution(
    toolName: string,
    duration: number,
    success: boolean,
    errorType?: string
  ): void {
    const successLabel = success ? 'true' : 'false';
    
    this.mcpToolExecutions.inc({ tool_name: toolName, success: successLabel });
    this.mcpToolDuration.observe({ tool_name: toolName }, duration);
    
    if (!success && errorType) {
      this.mcpToolErrors.inc({ tool_name: toolName, error_type: errorType });
    }
  }
}

// Export singleton instance
export const metrics = MetricsCollector.getInstance();