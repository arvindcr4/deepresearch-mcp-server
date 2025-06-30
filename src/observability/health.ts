import { logger } from '../utils/logger.js';
import { neo4jDriver } from '../services/neo4j/driver.js';
import { metrics } from './metrics.js';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  duration: number;
  details?: any;
  error?: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    [key: string]: HealthCheckResult;
  };
  metrics?: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage?: number;
    activeConnections?: number;
  };
}

/**
 * Health Check System
 * Provides comprehensive health monitoring for all system components
 */
export class HealthMonitor {
  private static instance: HealthMonitor;
  private healthChecks: Map<string, () => Promise<HealthCheckResult>> = new Map();
  private startTime: Date;

  private constructor() {
    this.startTime = new Date();
    this.registerDefaultHealthChecks();
    logger.info('Health monitor initialized');
  }

  public static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor();
    }
    return HealthMonitor.instance;
  }

  /**
   * Register a custom health check
   */
  public registerHealthCheck(
    name: string, 
    checkFunction: () => Promise<HealthCheckResult>
  ): void {
    this.healthChecks.set(name, checkFunction);
    logger.info(`Health check registered: ${name}`);
  }

  /**
   * Get comprehensive system health status
   */
  public async getSystemHealth(): Promise<SystemHealth> {
    const startTime = Date.now();
    const checks: { [key: string]: HealthCheckResult } = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Execute all health checks
    const checkPromises = Array.from(this.healthChecks.entries()).map(
      async ([name, checkFn]) => {
        try {
          const result = await Promise.race([
            checkFn(),
            this.createTimeoutResult(name, 10000) // 10 second timeout
          ]);
          checks[name] = result;
          
          // Update overall status
          if (result.status === 'unhealthy') {
            overallStatus = 'unhealthy';
          } else if (result.status === 'degraded' && overallStatus === 'healthy') {
            overallStatus = 'degraded';
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          checks[name] = {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            duration: Date.now() - startTime,
            error: errorMsg
          };
          overallStatus = 'unhealthy';
          logger.error(`Health check failed: ${name}`, { error: errorMsg });
        }
      }
    );

    await Promise.all(checkPromises);

    const systemHealth: SystemHealth = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: Date.now() - this.startTime.getTime(),
      checks,
      metrics: {
        memoryUsage: process.memoryUsage(),
        activeConnections: this.getActiveConnectionsCount()
      }
    };

    // Record health check metrics
    metrics.recordHealthCheck(overallStatus, Date.now() - startTime);

    return systemHealth;
  }

  /**
   * Get a specific health check result
   */
  public async getHealthCheck(name: string): Promise<HealthCheckResult | null> {
    const checkFn = this.healthChecks.get(name);
    if (!checkFn) {
      return null;
    }

    try {
      return await checkFn();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        duration: 0,
        error: errorMsg
      };
    }
  }

  /**
   * Get simple liveness probe (basic health check)
   */
  public getLivenessProbe(): { status: string; timestamp: string } {
    return {
      status: 'alive',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get readiness probe (detailed health status)
   */
  public async getReadinessProbe(): Promise<{ 
    status: 'ready' | 'not_ready'; 
    timestamp: string;
    details: string[];
  }> {
    const health = await this.getSystemHealth();
    const failedChecks = Object.entries(health.checks)
      .filter(([_, check]) => check.status === 'unhealthy')
      .map(([name, _]) => name);

    return {
      status: health.status === 'unhealthy' ? 'not_ready' : 'ready',
      timestamp: health.timestamp,
      details: failedChecks.length > 0 
        ? [`Failed checks: ${failedChecks.join(', ')}`]
        : ['All systems operational']
    };
  }

  /**
   * Register default health checks
   */
  private registerDefaultHealthChecks(): void {
    // Database connectivity check
    this.registerHealthCheck('database', async () => {
      const startTime = Date.now();
      try {
                 const neo4jDriverInstance = neo4jDriver;
                 const driver = await neo4jDriverInstance.getDriver();
         
         // Test connection with a simple query
         const session = await neo4jDriverInstance.getSession();
        try {
          await session.run('RETURN 1 as test');
          
          return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            duration: Date.now() - startTime,
            details: { 
              driver_status: 'connected',
              connection_pool: 'active'
            }
          };
        } finally {
          await session.close();
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
          error: errorMsg
        };
      }
    });

    // Memory usage check
    this.registerHealthCheck('memory', async () => {
      const startTime = Date.now();
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
      const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (heapUsagePercent > 90) {
        status = 'unhealthy';
      } else if (heapUsagePercent > 75) {
        status = 'degraded';
      }

      return {
        status,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        details: {
          heap_used_mb: Math.round(heapUsedMB),
          heap_total_mb: Math.round(heapTotalMB),
          heap_usage_percent: Math.round(heapUsagePercent),
          rss_mb: Math.round(memUsage.rss / 1024 / 1024),
          external_mb: Math.round(memUsage.external / 1024 / 1024)
        }
      };
    });

    // Event loop lag check
    this.registerHealthCheck('event_loop', async () => {
      const startTime = Date.now();
      
      return new Promise<HealthCheckResult>((resolve) => {
        const start = process.hrtime.bigint();
        setImmediate(() => {
          const delta = process.hrtime.bigint() - start;
          const lag = Number(delta) / 1e6; // Convert to milliseconds
          
          let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
          if (lag > 100) {
            status = 'unhealthy';
          } else if (lag > 50) {
            status = 'degraded';
          }

          resolve({
            status,
            timestamp: new Date().toISOString(),
            duration: Date.now() - startTime,
            details: {
              lag_ms: Math.round(lag),
              threshold_warning_ms: 50,
              threshold_critical_ms: 100
            }
          });
        });
      });
    });

    // Disk space check (logs directory)
    this.registerHealthCheck('disk_space', async () => {
      const startTime = Date.now();
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        
        // Check logs directory disk space
        const logsDir = path.resolve(process.cwd(), 'logs');
        const stats = await fs.stat(logsDir).catch(() => null);
        
        if (!stats) {
          return {
            status: 'degraded',
            timestamp: new Date().toISOString(),
            duration: Date.now() - startTime,
            details: { message: 'Logs directory not accessible' }
          };
        }

        // Note: This is a basic check. For production, you'd want to check actual disk space
        return {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
          details: {
            logs_directory: 'accessible',
            note: 'Basic disk check - implement statvfs for detailed space monitoring'
          }
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
          error: errorMsg
        };
      }
    });
  }

  /**
   * Create a timeout result for health checks that take too long
   */
  private createTimeoutResult(checkName: string, timeoutMs: number): Promise<HealthCheckResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          duration: timeoutMs,
          error: `Health check timeout after ${timeoutMs}ms`
        });
      }, timeoutMs);
    });
  }

  /**
   * Get active connections count (mock implementation)
   */
  private getActiveConnectionsCount(): number {
    // This would need to be implemented based on your actual connection tracking
    // For now, return a placeholder
    return process.listenerCount('connection') || 0;
  }
}

// Add health check recording to metrics
declare module './metrics.js' {
  interface MetricsCollector {
    recordHealthCheck(status: string, duration: number): void;
  }
}

// Extend metrics collector with health check recording
Object.defineProperty(metrics.constructor.prototype, 'recordHealthCheck', {
  value: function(status: string, duration: number) {
    // This would be implemented if we had access to modify the metrics class
    // For now, we'll track it through existing error metrics
    if (status === 'unhealthy') {
      this.errorsTotal.inc({ severity: 'critical' });
    }
  },
  writable: true
});

// Export singleton instance
export const healthMonitor = HealthMonitor.getInstance();