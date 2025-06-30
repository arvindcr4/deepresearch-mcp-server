import express, { Request, Response } from 'express';
import { metrics } from './metrics.js';
import { healthMonitor } from './health.js';
import { performanceMonitor } from './performance.js';
import { logger } from '../utils/logger.js';

/**
 * Observability API Router
 * Provides endpoints for metrics, health checks, and performance monitoring
 */
export const observabilityRouter = express.Router();

/**
 * Prometheus metrics endpoint
 * GET /observability/metrics
 */
observabilityRouter.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metricsData = await metrics.getMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metricsData);
  } catch (error) {
    logger.error('Failed to generate metrics', { error });
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
});

/**
 * Comprehensive health check endpoint
 * GET /observability/health
 */
observabilityRouter.get('/health', async (req: Request, res: Response) => {
  try {
    const systemHealth = await healthMonitor.getSystemHealth();
    const statusCode = systemHealth.status === 'healthy' ? 200 : 
                      systemHealth.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(systemHealth);
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check system failure'
    });
  }
});

/**
 * Liveness probe endpoint (basic health check)
 * GET /observability/health/live
 */
observabilityRouter.get('/health/live', (req: Request, res: Response) => {
  try {
    const liveness = healthMonitor.getLivenessProbe();
    res.json(liveness);
  } catch (error) {
    logger.error('Liveness probe failed', { error });
    res.status(503).json({ status: 'dead', timestamp: new Date().toISOString() });
  }
});

/**
 * Readiness probe endpoint (dependency health check)
 * GET /observability/health/ready
 */
observabilityRouter.get('/health/ready', async (req: Request, res: Response) => {
  try {
    const readiness = await healthMonitor.getReadinessProbe();
    const statusCode = readiness.status === 'ready' ? 200 : 503;
    res.status(statusCode).json(readiness);
  } catch (error) {
    logger.error('Readiness probe failed', { error });
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      details: ['Readiness check system failure']
    });
  }
});

/**
 * Specific health check endpoint
 * GET /observability/health/:checkName
 */
observabilityRouter.get('/health/:checkName', async (req: Request, res: Response) => {
  try {
    const { checkName } = req.params;
    const healthCheck = await healthMonitor.getHealthCheck(checkName);
    
    if (!healthCheck) {
      return res.status(404).json({ error: `Health check '${checkName}' not found` });
    }
    
    const statusCode = healthCheck.status === 'healthy' ? 200 :
                      healthCheck.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(healthCheck);
  } catch (error) {
    logger.error(`Health check failed: ${req.params.checkName}`, { error });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check execution failed'
    });
  }
});

/**
 * Performance statistics endpoint
 * GET /observability/performance/stats
 */
observabilityRouter.get('/performance/stats', (req: Request, res: Response) => {
  try {
    const { operationType } = req.query;
    
    if (operationType && typeof operationType === 'string') {
      const stats = performanceMonitor.getOperationStats(operationType);
      if (!stats) {
        return res.status(404).json({ error: `No statistics found for operation type: ${operationType}` });
      }
      res.json({ operationType, stats });
    } else {
      const allStats = performanceMonitor.getAllOperationStats();
      res.json(allStats);
    }
  } catch (error) {
    logger.error('Failed to get performance stats', { error });
    res.status(500).json({ error: 'Failed to retrieve performance statistics' });
  }
});

/**
 * Slow operations endpoint
 * GET /observability/performance/slow
 */
observabilityRouter.get('/performance/slow', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const slowOperations = performanceMonitor.getRecentSlowOperations(limit);
    res.json({
      limit,
      count: slowOperations.length,
      operations: slowOperations
    });
  } catch (error) {
    logger.error('Failed to get slow operations', { error });
    res.status(500).json({ error: 'Failed to retrieve slow operations' });
  }
});

/**
 * Clear performance history endpoint
 * DELETE /observability/performance/history
 */
observabilityRouter.delete('/performance/history', (req: Request, res: Response) => {
  try {
    performanceMonitor.clearHistory();
    res.json({ message: 'Performance history cleared successfully' });
  } catch (error) {
    logger.error('Failed to clear performance history', { error });
    res.status(500).json({ error: 'Failed to clear performance history' });
  }
});

/**
 * System information endpoint
 * GET /observability/system
 */
observabilityRouter.get('/system', async (req: Request, res: Response) => {
  try {
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      env: {
        nodeEnv: process.env.NODE_ENV,
        logLevel: process.env.LOG_LEVEL
      },
      timestamp: new Date().toISOString()
    };
    
    res.json(systemInfo);
  } catch (error) {
    logger.error('Failed to get system information', { error });
    res.status(500).json({ error: 'Failed to retrieve system information' });
  }
});

/**
 * Observability dashboard endpoint
 * GET /observability/dashboard
 */
observabilityRouter.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const [systemHealth, performanceStats] = await Promise.all([
      healthMonitor.getSystemHealth(),
      Promise.resolve(performanceMonitor.getAllOperationStats())
    ]);
    
    const dashboard = {
      timestamp: new Date().toISOString(),
      health: {
        status: systemHealth.status,
        uptime: systemHealth.uptime,
        checksCount: Object.keys(systemHealth.checks).length,
        failedChecks: Object.entries(systemHealth.checks)
          .filter(([_, check]) => check.status === 'unhealthy')
          .map(([name, _]) => name)
      },
      performance: {
        operationTypes: Object.keys(performanceStats).length,
        totalOperations: Object.values(performanceStats)
          .reduce((total, stats) => total + (stats?.count || 0), 0),
        slowOperations: performanceMonitor.getRecentSlowOperations(5).length
      },
      system: {
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        nodeVersion: process.version
      }
    };
    
    res.json(dashboard);
  } catch (error) {
    logger.error('Failed to generate dashboard data', { error });
    res.status(500).json({ error: 'Failed to generate dashboard data' });
  }
});

/**
 * Export configuration endpoint
 * GET /observability/config
 */
observabilityRouter.get('/config', (req: Request, res: Response) => {
  try {
    const config = {
      metrics: {
        enabled: true,
        prefix: 'deepresearch_',
        collectDefaultMetrics: true
      },
      health: {
        checksCount: healthMonitor['healthChecks']?.size || 0,
        defaultTimeout: 10000
      },
      performance: {
        historySize: 1000,
        slowOperationThresholds: Object.fromEntries(
          performanceMonitor['slowOperationThresholds'] || new Map()
        )
      }
    };
    
    res.json(config);
  } catch (error) {
    logger.error('Failed to get observability config', { error });
    res.status(500).json({ error: 'Failed to retrieve configuration' });
  }
});

logger.info('Observability API routes initialized');