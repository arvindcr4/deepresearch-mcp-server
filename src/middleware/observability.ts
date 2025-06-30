import { Request, Response, NextFunction } from 'express';
import { metrics } from '../observability/metrics.js';
import { performanceMonitor } from '../observability/performance.js';
import { logger } from '../utils/logger.js';
import { nanoid } from 'nanoid';

export interface ObservabilityRequest extends Request {
  requestId?: string;
  startTime?: number;
}

/**
 * Request ID middleware - assigns unique ID to each request
 */
export function requestIdMiddleware(req: ObservabilityRequest, res: Response, next: NextFunction): void {
  req.requestId = req.headers['x-request-id'] as string || nanoid();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}

/**
 * Request timing middleware - tracks request duration
 */
export function requestTimingMiddleware(req: ObservabilityRequest, res: Response, next: NextFunction): void {
  req.startTime = Date.now();
  
  // Start performance tracking
  if (req.requestId) {
    performanceMonitor.startOperation(req.requestId, 'http_request', {
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });
  }
  
  next();
}

/**
 * HTTP metrics middleware - records request metrics
 */
export function httpMetricsMiddleware(req: ObservabilityRequest, res: Response, next: NextFunction): void {
  const originalSend = res.send;
  const originalJson = res.json;
  let responseSize = 0;

  // Override response methods to capture response size
  res.send = function(body: any) {
    if (body) {
      responseSize = Buffer.byteLength(body, 'utf8');
    }
    return originalSend.call(this, body);
  };

  res.json = function(body: any) {
    if (body) {
      responseSize = Buffer.byteLength(JSON.stringify(body), 'utf8');
    }
    return originalJson.call(this, body);
  };

  // Record metrics when response finishes
  res.on('finish', () => {
    try {
      const duration = req.startTime ? (Date.now() - req.startTime) / 1000 : 0;
      const route = req.route?.path || req.path || 'unknown';
      const requestSize = parseInt(req.headers['content-length'] as string) || 0;

      // Record HTTP metrics
      metrics.recordHttpRequest(
        req.method,
        route,
        res.statusCode,
        duration,
        requestSize,
        responseSize
      );

      // End performance tracking
      if (req.requestId) {
        performanceMonitor.endOperation(req.requestId);
      }

      // Log request completion
      logger.info('HTTP request completed', {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: Math.round(duration * 1000),
        requestSize,
        responseSize,
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });

    } catch (error) {
      logger.error('Failed to record HTTP metrics', { 
        error,
        requestId: req.requestId,
        method: req.method,
        url: req.url
      });
    }
  });

  next();
}

/**
 * Error tracking middleware - records error metrics
 */
export function errorTrackingMiddleware(
  error: Error, 
  req: ObservabilityRequest, 
  res: Response, 
  next: NextFunction
): void {
  try {
    // Record error metrics
    metrics.errorsTotal.inc({ severity: 'error' });
    metrics.errorsByType.inc({ 
      error_type: error.name || 'UnknownError',
      component: 'http_middleware'
    });

    // End performance tracking with error
    if (req.requestId) {
      performanceMonitor.endOperation(req.requestId);
    }

    // Log error with context
    logger.error('HTTP request error', {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });

  } catch (metricsError) {
    logger.error('Failed to record error metrics', { 
      originalError: error.message,
      metricsError,
      requestId: req.requestId
    });
  }

  next(error);
}

/**
 * Rate limit metrics middleware - tracks rate limiting events
 */
export function rateLimitMetricsMiddleware(keyType: string = 'default') {
  return (req: ObservabilityRequest, res: Response, next: NextFunction): void => {
    // Record rate limit check
    metrics.rateLimitHits.inc({ key_type: keyType });
    
    // Override rate limit error handling to capture violations
    const originalStatus = res.status;
    res.status = function(code: number) {
      if (code === 429) { // Too Many Requests
        metrics.rateLimitExceeded.inc({ key_type: keyType });
        logger.warn('Rate limit exceeded', {
          requestId: req.requestId,
          keyType,
          method: req.method,
          url: req.url,
          ip: req.ip
        });
      }
      return originalStatus.call(this, code);
    };
    
    next();
  };
}

/**
 * Business metrics middleware - tracks custom business events
 */
export function businessMetricsMiddleware(req: ObservabilityRequest, res: Response, next: NextFunction): void {
  // Track search queries
  if (req.path.includes('/search') || req.path.includes('/unified_search')) {
    const searchType = req.path.includes('unified') ? 'unified' : 'standard';
    metrics.searchQueriesTotal.inc({ search_type: searchType });
  }
  
  // Track deep research requests
  if (req.path.includes('/deep_research')) {
    const provider = req.body?.provider || 'unknown';
    // We'll increment success/failure metrics in the actual handlers
    // This just tracks the attempt
    logger.info('Deep research request initiated', {
      requestId: req.requestId,
      provider,
      method: req.method
    });
  }
  
  // Track project/task/knowledge operations
  if (req.method === 'POST') {
    if (req.path.includes('/project')) {
      logger.debug('Project creation tracked', { requestId: req.requestId });
    } else if (req.path.includes('/task')) {
      logger.debug('Task creation tracked', { requestId: req.requestId });
    } else if (req.path.includes('/knowledge')) {
      logger.debug('Knowledge item creation tracked', { requestId: req.requestId });
    }
  }
  
  next();
}

/**
 * Complete observability middleware stack
 */
export function setupObservabilityMiddleware(app: any): void {
  // Request ID and timing (should be first)
  app.use(requestIdMiddleware);
  app.use(requestTimingMiddleware);
  
  // HTTP metrics tracking
  app.use(httpMetricsMiddleware);
  
  // Business metrics tracking
  app.use(businessMetricsMiddleware);
  
  // Rate limiting metrics (applied to all routes)
  app.use(rateLimitMetricsMiddleware('global'));
  
  logger.info('Observability middleware configured');
}

/**
 * Error handling middleware (should be last)
 */
export function setupErrorObservability(app: any): void {
  app.use(errorTrackingMiddleware);
  logger.info('Error observability middleware configured');
}