import { performance, PerformanceObserver } from 'perf_hooks';
import { logger } from '../utils/logger.js';
import { metrics } from './metrics.js';

export interface PerformanceMetrics {
  requestId: string;
  operationType: string;
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage: {
    before: NodeJS.MemoryUsage;
    after: NodeJS.MemoryUsage;
    delta: {
      heapUsed: number;
      heapTotal: number;
      external: number;
      rss: number;
    };
  };
  metadata?: Record<string, any>;
}

export interface SlowOperationAlert {
  operationType: string;
  duration: number;
  threshold: number;
  requestId: string;
  timestamp: string;
  stackTrace?: string;
}

/**
 * Performance Monitor
 * Tracks operation timing, memory usage, and performance bottlenecks
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private activeOperations: Map<string, {
    operationType: string;
    startTime: number;
    memoryBefore: NodeJS.MemoryUsage;
    metadata?: Record<string, any>;
  }> = new Map();
  
  private performanceObserver: PerformanceObserver;
  private slowOperationThresholds: Map<string, number> = new Map();
  private performanceHistory: PerformanceMetrics[] = [];
  private maxHistorySize = 1000;

  private constructor() {
    this.setupPerformanceObserver();
    this.setupDefaultThresholds();
    this.startPeriodicCleanup();
    logger.info('Performance monitor initialized');
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start tracking an operation
   */
  public startOperation(
    requestId: string, 
    operationType: string, 
    metadata?: Record<string, any>
  ): void {
    const startTime = performance.now();
    const memoryBefore = process.memoryUsage();

    this.activeOperations.set(requestId, {
      operationType,
      startTime,
      memoryBefore,
      metadata
    });

    // Create performance mark
    performance.mark(`${operationType}_start_${requestId}`);
  }

  /**
   * End operation tracking and record metrics
   */
  public endOperation(requestId: string): PerformanceMetrics | null {
    const operation = this.activeOperations.get(requestId);
    if (!operation) {
      logger.warn(`Performance tracking not found for request: ${requestId}`);
      return null;
    }

    const endTime = performance.now();
    const memoryAfter = process.memoryUsage();
    const duration = endTime - operation.startTime;

    // Create performance mark and measure
    performance.mark(`${operation.operationType}_end_${requestId}`);
    performance.measure(
      `${operation.operationType}_${requestId}`,
      `${operation.operationType}_start_${requestId}`,
      `${operation.operationType}_end_${requestId}`
    );

    const performanceMetrics: PerformanceMetrics = {
      requestId,
      operationType: operation.operationType,
      startTime: operation.startTime,
      endTime,
      duration,
      memoryUsage: {
        before: operation.memoryBefore,
        after: memoryAfter,
        delta: {
          heapUsed: memoryAfter.heapUsed - operation.memoryBefore.heapUsed,
          heapTotal: memoryAfter.heapTotal - operation.memoryBefore.heapTotal,
          external: memoryAfter.external - operation.memoryBefore.external,
          rss: memoryAfter.rss - operation.memoryBefore.rss
        }
      },
      metadata: operation.metadata
    };

    // Record metrics
    this.recordOperationMetrics(performanceMetrics);

    // Check for slow operations
    this.checkSlowOperation(performanceMetrics);

    // Store in history
    this.addToHistory(performanceMetrics);

    // Clean up
    this.activeOperations.delete(requestId);

    logger.debug(`Operation completed: ${operation.operationType}`, {
      requestId,
      duration: Math.round(duration),
      memoryDelta: Math.round(performanceMetrics.memoryUsage.delta.heapUsed / 1024)
    });

    return performanceMetrics;
  }

  /**
   * Set slow operation threshold
   */
  public setSlowOperationThreshold(operationType: string, thresholdMs: number): void {
    this.slowOperationThresholds.set(operationType, thresholdMs);
    logger.info(`Slow operation threshold set: ${operationType} = ${thresholdMs}ms`);
  }

  /**
   * Get performance statistics for an operation type
   */
  public getOperationStats(operationType: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    p50: number;
    p95: number;
    p99: number;
    avgMemoryDelta: number;
  } | null {
    const operations = this.performanceHistory.filter(
      op => op.operationType === operationType
    );

    if (operations.length === 0) {
      return null;
    }

    const durations = operations.map(op => op.duration).sort((a, b) => a - b);
    const memoryDeltas = operations.map(op => op.memoryUsage.delta.heapUsed);

    const percentile = (arr: number[], p: number) => {
      const index = Math.ceil(arr.length * p / 100) - 1;
      return arr[Math.max(0, index)];
    };

    return {
      count: operations.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p50: percentile(durations, 50),
      p95: percentile(durations, 95),
      p99: percentile(durations, 99),
      avgMemoryDelta: memoryDeltas.reduce((a, b) => a + b, 0) / memoryDeltas.length
    };
  }

  /**
   * Get all operation statistics
   */
  public getAllOperationStats(): Record<string, ReturnType<typeof this.getOperationStats>> {
    const operationTypes = [...new Set(this.performanceHistory.map(op => op.operationType))];
    const stats: Record<string, ReturnType<typeof this.getOperationStats>> = {};

    for (const operationType of operationTypes) {
      stats[operationType] = this.getOperationStats(operationType);
    }

    return stats;
  }

  /**
   * Get recent slow operations
   */
  public getRecentSlowOperations(limit: number = 10): PerformanceMetrics[] {
    return this.performanceHistory
      .filter(op => {
        const threshold = this.slowOperationThresholds.get(op.operationType) || 1000;
        return op.duration > threshold;
      })
      .sort((a, b) => b.endTime - a.endTime)
      .slice(0, limit);
  }

  /**
   * Clear performance history
   */
  public clearHistory(): void {
    this.performanceHistory = [];
    logger.info('Performance history cleared');
  }

  /**
   * Setup Performance Observer for Node.js performance events
   */
  private setupPerformanceObserver(): void {
    this.performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (entry.entryType === 'measure') {
          logger.debug(`Performance measure: ${entry.name} = ${entry.duration}ms`);
        }
      });
    });

    this.performanceObserver.observe({ entryTypes: ['measure', 'mark'] });
  }

  /**
   * Setup default slow operation thresholds
   */
  private setupDefaultThresholds(): void {
    // Database operations
    this.setSlowOperationThreshold('db_query', 1000);
    this.setSlowOperationThreshold('db_transaction', 2000);
    
    // MCP tool operations
    this.setSlowOperationThreshold('mcp_tool_execution', 5000);
    this.setSlowOperationThreshold('deep_research', 30000);
    
    // HTTP operations
    this.setSlowOperationThreshold('http_request', 2000);
    this.setSlowOperationThreshold('external_api_call', 10000);
    
    // Search operations
    this.setSlowOperationThreshold('unified_search', 3000);
    this.setSlowOperationThreshold('knowledge_search', 1500);
  }

  /**
   * Record operation metrics to Prometheus
   */
  private recordOperationMetrics(performanceMetrics: PerformanceMetrics): void {
    // Record duration in appropriate metric based on operation type
    if (performanceMetrics.operationType.startsWith('db_')) {
      metrics.dbQueryDuration.observe(
        { 
          operation_type: performanceMetrics.operationType,
          success: 'true' // Assuming success if we reached this point
        },
        performanceMetrics.duration / 1000 // Convert to seconds
      );
    } else if (performanceMetrics.operationType.startsWith('mcp_')) {
      const toolName = performanceMetrics.operationType.replace('mcp_tool_', '');
      metrics.mcpToolDuration.observe(
        { tool_name: toolName },
        performanceMetrics.duration / 1000
      );
    } else if (performanceMetrics.operationType.startsWith('http_')) {
      // Would be recorded elsewhere in HTTP middleware
    }

    // Record memory delta as a custom metric (if we had one)
    const memoryDeltaMB = performanceMetrics.memoryUsage.delta.heapUsed / 1024 / 1024;
    if (Math.abs(memoryDeltaMB) > 10) { // Only log significant memory changes
      logger.debug(`Significant memory change detected`, {
        operationType: performanceMetrics.operationType,
        requestId: performanceMetrics.requestId,
        memoryDeltaMB: Math.round(memoryDeltaMB)
      });
    }
  }

  /**
   * Check if operation is slow and alert if necessary
   */
  private checkSlowOperation(performanceMetrics: PerformanceMetrics): void {
    const threshold = this.slowOperationThresholds.get(performanceMetrics.operationType);
    if (threshold && performanceMetrics.duration > threshold) {
      const alert: SlowOperationAlert = {
        operationType: performanceMetrics.operationType,
        duration: performanceMetrics.duration,
        threshold,
        requestId: performanceMetrics.requestId,
        timestamp: new Date().toISOString(),
        stackTrace: new Error().stack
      };

      logger.warn('Slow operation detected', {
        ...alert,
        stackTrace: undefined // Don't log stack trace in structured logs
      });

      // Emit event for potential alerting systems
      process.emit('slowOperation', alert);
    }
  }

  /**
   * Add performance metrics to history
   */
  private addToHistory(performanceMetrics: PerformanceMetrics): void {
    this.performanceHistory.push(performanceMetrics);
    
    // Keep history size under control
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory = this.performanceHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Periodic cleanup of stale operations
   */
  private startPeriodicCleanup(): void {
    setInterval(() => {
      const now = performance.now();
      const staleThreshold = 300000; // 5 minutes

      for (const [requestId, operation] of this.activeOperations.entries()) {
        if (now - operation.startTime > staleThreshold) {
          logger.warn(`Cleaning up stale performance tracking`, {
            requestId,
            operationType: operation.operationType,
            duration: now - operation.startTime
          });
          this.activeOperations.delete(requestId);
        }
      }
    }, 60000); // Run every minute
  }
}

/**
 * Performance tracking decorator for async functions
 */
export function trackPerformance(operationType: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const requestId = `${operationType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const perfMonitor = PerformanceMonitor.getInstance();
      
      perfMonitor.startOperation(requestId, operationType, {
        method: propertyName,
        args: args.length
      });

      try {
        const result = await method.apply(this, args);
        perfMonitor.endOperation(requestId);
        return result;
      } catch (error) {
        perfMonitor.endOperation(requestId);
        throw error;
      }
    };

    return descriptor;
  };
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();