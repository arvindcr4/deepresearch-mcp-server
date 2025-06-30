export { metrics, MetricsCollector } from './metrics.js';
export { healthMonitor, HealthMonitor } from './health.js';
export { performanceMonitor, PerformanceMonitor, trackPerformance } from './performance.js';
export { observabilityRouter } from './api.js';
export { 
  setupObservabilityMiddleware, 
  setupErrorObservability,
  requestIdMiddleware,
  httpMetricsMiddleware,
  errorTrackingMiddleware,
  rateLimitMetricsMiddleware,
  businessMetricsMiddleware
} from '../middleware/observability.js';

import { logger } from '../utils/logger.js';
import { metrics } from './metrics.js';
import { healthMonitor } from './health.js';
import { performanceMonitor } from './performance.js';

/**
 * Initialize complete observability system
 */
export async function initializeObservability(): Promise<void> {
  try {
    logger.info('Initializing observability system...');
    
    // Initialize metrics collection
    metrics.getRegistry(); // This ensures metrics are initialized
    
    // Initialize health monitoring
    await healthMonitor.getSystemHealth(); // This ensures health checks are registered
    
    // Initialize performance monitoring
    performanceMonitor.clearHistory(); // This ensures performance monitor is initialized
    
    // Set up custom business metrics collectors
    setupBusinessMetricsCollectors();
    
    logger.info('Observability system initialized successfully');
    
  } catch (error) {
    logger.error('Failed to initialize observability system', { error });
    throw error;
  }
}

/**
 * Set up custom business metrics collectors
 */
function setupBusinessMetricsCollectors(): void {
  // Update business metrics periodically
  setInterval(async () => {
    try {
      await updateBusinessMetrics();
    } catch (error) {
      logger.warn('Failed to update business metrics', { error });
    }
  }, 30000); // Update every 30 seconds
  
  logger.info('Business metrics collectors configured');
}

/**
 * Update business metrics from database
 */
async function updateBusinessMetrics(): Promise<void> {
  try {
    // This would require importing and using the actual database services
    // For now, we'll set placeholder values
    
    // Update project counts (you'd get this from projectService)
    metrics.projectsTotal.set({ status: 'active' }, 0);
    metrics.projectsTotal.set({ status: 'completed' }, 0);
    metrics.projectsTotal.set({ status: 'on_hold' }, 0);
    
    // Update task counts (you'd get this from taskService)
    metrics.tasksTotal.set({ status: 'todo', priority: 'high' }, 0);
    metrics.tasksTotal.set({ status: 'todo', priority: 'medium' }, 0);
    metrics.tasksTotal.set({ status: 'todo', priority: 'low' }, 0);
    metrics.tasksTotal.set({ status: 'in_progress', priority: 'high' }, 0);
    metrics.tasksTotal.set({ status: 'in_progress', priority: 'medium' }, 0);
    metrics.tasksTotal.set({ status: 'in_progress', priority: 'low' }, 0);
    metrics.tasksTotal.set({ status: 'completed', priority: 'high' }, 0);
    metrics.tasksTotal.set({ status: 'completed', priority: 'medium' }, 0);
    metrics.tasksTotal.set({ status: 'completed', priority: 'low' }, 0);
    
    // Update knowledge item counts (you'd get this from knowledgeService)
    metrics.knowledgeItemsTotal.set({ type: 'document' }, 0);
    metrics.knowledgeItemsTotal.set({ type: 'link' }, 0);
    metrics.knowledgeItemsTotal.set({ type: 'note' }, 0);
    
  } catch (error) {
    logger.error('Failed to update business metrics', { error });
  }
}

/**
 * Get observability status summary
 */
export async function getObservabilityStatus(): Promise<{
  metrics: { enabled: boolean; registry: string };
  health: { enabled: boolean; checksCount: number };
  performance: { enabled: boolean; historySize: number };
  uptime: number;
}> {
  try {
    const systemHealth = await healthMonitor.getSystemHealth();
    
    return {
      metrics: {
        enabled: true,
        registry: 'prometheus'
      },
      health: {
        enabled: true,
        checksCount: Object.keys(systemHealth.checks).length
      },
      performance: {
        enabled: true,
        historySize: 1000 // This would come from performanceMonitor config
      },
      uptime: systemHealth.uptime
    };
  } catch (error) {
    logger.error('Failed to get observability status', { error });
    throw error;
  }
}

/**
 * Graceful shutdown for observability components
 */
export async function shutdownObservability(): Promise<void> {
  try {
    logger.info('Shutting down observability system...');
    
    // Clear intervals and timers
    // This would need to be implemented in each component
    
    // Clear metrics registry
    metrics.clear();
    
    logger.info('Observability system shutdown completed');
  } catch (error) {
    logger.error('Error during observability shutdown', { error });
  }
}