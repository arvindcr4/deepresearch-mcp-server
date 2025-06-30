import { secureLogger } from './secureLogger.js'
import { closeNeo4jConnection } from '../services/neo4j/index.js'
import { rateLimitManager } from '../config/index.js'
import { stopAllRateLimiters } from '../middleware/rateLimiter.js'
import type { Server } from 'http'

export interface ShutdownTarget {
  name: string
  shutdown: () => Promise<void> | void
}

export class GracefulShutdownManager {
  private static instance: GracefulShutdownManager
  private targets: ShutdownTarget[] = []
  private isShuttingDown = false
  private server?: Server
  private shutdownTimeout = 30000 // 30 seconds default timeout

  private constructor() {}

  public static getInstance(): GracefulShutdownManager {
    if (!GracefulShutdownManager.instance) {
      GracefulShutdownManager.instance = new GracefulShutdownManager()
    }
    return GracefulShutdownManager.instance
  }

  /**
   * Register a server instance for shutdown
   */
  public registerServer(server: Server): void {
    this.server = server
    this.addTarget({
      name: 'HTTP Server',
      shutdown: () => this.shutdownServer(server),
    })
  }

  /**
   * Add a shutdown target (e.g., database connections, schedulers)
   */
  public addTarget(target: ShutdownTarget): void {
    this.targets.push(target)
  }

  /**
   * Set shutdown timeout in milliseconds
   */
  public setShutdownTimeout(timeout: number): void {
    this.shutdownTimeout = timeout
  }

  /**
   * Initialize graceful shutdown handlers
   */
  public initialize(): void {
    // Handle process signals
    process.on('SIGTERM', () => this.handleShutdown('SIGTERM'))
    process.on('SIGINT', () => this.handleShutdown('SIGINT'))

    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', (error) => {
      secureLogger.error('Uncaught exception detected', error)
      this.handleShutdown('UNCAUGHT_EXCEPTION', 1)
    })

    process.on('unhandledRejection', (reason) => {
      const error = reason instanceof Error ? reason : new Error(String(reason))
      secureLogger.error('Unhandled promise rejection detected', error)
      this.handleShutdown('UNHANDLED_REJECTION', 1)
    })

    // Add default shutdown targets
    this.addDefaultTargets()
  }

  /**
   * Add default shutdown targets for common resources
   */
  private addDefaultTargets(): void {
    // Add Neo4j connection cleanup
    this.addTarget({
      name: 'Neo4j Connection',
      shutdown: async () => {
        secureLogger.info('Closing Neo4j connection...')
        await closeNeo4jConnection()
        secureLogger.info('Neo4j connection closed')
      },
    })

    // Add Bottleneck rate limiters cleanup
    this.addTarget({
      name: 'Bottleneck Rate Limiters',
      shutdown: async () => {
        secureLogger.info('Stopping Bottleneck rate limiters...')
        try {
          // Stop all Bottleneck instances
          const limiters = [
            'global',
            'openai',
            'perplexity',
            'xaiGrok',
          ] as const
          for (const provider of limiters) {
            try {
              const limiter = rateLimitManager.getLimiter(provider)
              if (limiter && typeof limiter.stop === 'function') {
                await limiter.stop()
                secureLogger.debug(
                  `Stopped Bottleneck rate limiter for ${provider}`
                )
              }
            } catch (error) {
              secureLogger.warn(
                `Failed to stop Bottleneck rate limiter for ${provider}`,
                {
                  error: error instanceof Error ? error.message : String(error),
                }
              )
            }
          }
          secureLogger.info('Bottleneck rate limiters stopped')
        } catch (error) {
          secureLogger.error(
            'Error stopping Bottleneck rate limiters',
            error instanceof Error ? error : new Error(String(error))
          )
        }
      },
    })

    // Add custom RateLimiter cleanup (for middleware rate limiters)
    this.addTarget({
      name: 'Custom Rate Limiters',
      shutdown: async () => {
        secureLogger.info('Stopping custom rate limiters...')
        try {
          stopAllRateLimiters()
          secureLogger.info('Custom rate limiters cleanup completed')
        } catch (error) {
          secureLogger.error(
            'Error stopping custom rate limiters',
            error instanceof Error ? error : new Error(String(error))
          )
        }
      },
    })
  }

  /**
   * Handle shutdown signal
   */
  private async handleShutdown(
    signal: string,
    exitCode: number = 0
  ): Promise<void> {
    if (this.isShuttingDown) {
      secureLogger.warn(
        `Received ${signal} while already shutting down, forcing exit...`
      )
      process.exit(exitCode || 1)
      return
    }

    this.isShuttingDown = true
    secureLogger.info(`Received ${signal}, starting graceful shutdown...`)

    const shutdownPromise = this.performShutdown()
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Shutdown timeout after ${this.shutdownTimeout}ms`))
      }, this.shutdownTimeout)
    })

    try {
      await Promise.race([shutdownPromise, timeoutPromise])
      secureLogger.info('Graceful shutdown completed successfully')
      process.exit(exitCode)
    } catch (error) {
      secureLogger.error(
        'Error during graceful shutdown',
        error instanceof Error ? error : new Error(String(error))
      )
      process.exit(exitCode || 1)
    }
  }

  /**
   * Perform the actual shutdown sequence
   */
  private async performShutdown(): Promise<void> {
    const shutdownPromises = this.targets.map(async (target) => {
      try {
        secureLogger.debug(`Shutting down ${target.name}...`)
        await target.shutdown()
        secureLogger.debug(`${target.name} shutdown completed`)
      } catch (error) {
        secureLogger.error(
          `Error shutting down ${target.name}`,
          error instanceof Error ? error : new Error(String(error))
        )
        // Continue with other shutdowns even if one fails
      }
    })

    await Promise.allSettled(shutdownPromises)
  }

  /**
   * Shutdown HTTP server with a timeout
   */
  private async shutdownServer(server: Server): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      secureLogger.info('Closing HTTP server...')

      const timeout = setTimeout(() => {
        secureLogger.warn('Server shutdown timeout, forcing close')
        // Force close all connections if server has this method
        if (typeof (server as any).destroy === 'function') {
          ;(server as any).destroy()
        }
        resolve()
      }, 10000) // 10 second timeout for server

      server.close((error) => {
        clearTimeout(timeout)
        if (error) {
          secureLogger.error('Error closing server', error)
          reject(error)
        } else {
          secureLogger.info('HTTP server closed successfully')
          resolve()
        }
      })
    })
  }

  /**
   * Force shutdown (for emergency cases)
   */
  public forceShutdown(exitCode: number = 1): void {
    secureLogger.error('Forcing immediate shutdown')
    process.exit(exitCode)
  }

  /**
   * Check if shutdown is in progress
   */
  public isShutdownInProgress(): boolean {
    return this.isShuttingDown
  }
}

// Export singleton instance
export const gracefulShutdown = GracefulShutdownManager.getInstance()
