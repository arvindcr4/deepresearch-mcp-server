import { RateLimitError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyGenerator?: (identifier: string) => string // Custom key generator
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

// Global registry for RateLimiter instances to enable cleanup during shutdown
const rateLimiterInstances = new Set<RateLimiter>()

export class RateLimiter {
  private storage: Map<string, RateLimitEntry> = new Map()
  private config: RateLimitConfig
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(config: RateLimitConfig) {
    // Set defaults first, then override with provided config
    const defaultConfig: RateLimitConfig = {
      windowMs: 60 * 1000, // Default: 1 minute
      maxRequests: 100, // Default: 100 requests per minute
      keyGenerator: (id) => id,
    }

    this.config = {
      ...defaultConfig,
      ...config,
    }

    // Clean up expired entries every minute
    this.startCleanupInterval()

    // Register this instance for global cleanup
    rateLimiterInstances.add(this)
  }

  async checkLimit(identifier: string): Promise<void> {
    const key = this.config.keyGenerator!(identifier)
    const now = Date.now()
    const entry = this.storage.get(key)

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      this.storage.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs,
      })
      return
    }

    if (entry.count >= this.config.maxRequests) {
      const resetIn = entry.resetTime - now
      logger.warn('Rate limit exceeded', {
        identifier,
        count: entry.count,
        limit: this.config.maxRequests,
        resetIn,
      })

      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${Math.ceil(resetIn / 1000)} seconds.`,
        {
          identifier,
          limit: this.config.maxRequests,
          resetTime: entry.resetTime,
          retryAfter: Math.ceil(resetIn / 1000),
        }
      )
    }

    // Increment counter
    entry.count++
    this.storage.set(key, entry)

    logger.debug('Rate limit check passed', {
      identifier,
      count: entry.count,
      limit: this.config.maxRequests,
    })
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanup()
      } catch (error) {
        logger.error('Error during rate limiter cleanup', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }, 60 * 1000)
  }

  // Method to stop the cleanup interval
  public stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    // Remove from global registry
    rateLimiterInstances.delete(this)
  }

  private async cleanup(): Promise<void> {
    const now = Date.now()
    let cleanedCount = 0

    try {
      for (const [key, entry] of this.storage.entries()) {
        if (now > entry.resetTime) {
          this.storage.delete(key)
          cleanedCount++
        }
      }

      if (cleanedCount > 0) {
        logger.debug('Rate limiter cleanup completed', {
          cleanedEntries: cleanedCount,
          remainingEntries: this.storage.size,
        })
      }
    } catch (error) {
      logger.error('Failed to clean up rate limiter entries', {
        error: error instanceof Error ? error.message : String(error),
        cleanedSoFar: cleanedCount,
      })
      throw error
    }
  }

  getStats(): { activeEntries: number; totalRequests: number } {
    const now = Date.now()
    let totalRequests = 0
    let activeEntries = 0

    for (const entry of this.storage.values()) {
      if (now <= entry.resetTime) {
        activeEntries++
        totalRequests += entry.count
      }
    }

    return { activeEntries, totalRequests }
  }
}

// Pre-configured rate limiters for different use cases
export const createProviderRateLimiter = (provider: string) => {
  const configs = {
    openai: { windowMs: 60 * 1000, maxRequests: 50 }, // 50/min for OpenAI
    perplexity: { windowMs: 60 * 1000, maxRequests: 30 }, // 30/min for Perplexity
    grok: { windowMs: 60 * 1000, maxRequests: 40 }, // 40/min for Grok
    default: { windowMs: 60 * 1000, maxRequests: 20 }, // Conservative default
  }

  const config = configs[provider as keyof typeof configs] || configs.default

  return new RateLimiter({
    ...config,
    keyGenerator: (id) => `${provider}:${id}`,
  })
}

/**
 * Stop all active RateLimiter instances (for graceful shutdown)
 */
export const stopAllRateLimiters = (): void => {
  logger.info(`Stopping ${rateLimiterInstances.size} rate limiter instances...`)

  for (const limiter of rateLimiterInstances) {
    try {
      limiter.stop()
    } catch (error) {
      logger.error('Error stopping rate limiter instance', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  rateLimiterInstances.clear()
  logger.info('All rate limiter instances stopped')
}
