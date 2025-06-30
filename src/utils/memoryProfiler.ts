/**
 * Memory Profiler Utility
 * =======================
 *
 * Provides memory profiling capabilities for detecting memory leaks
 * and monitoring memory usage patterns in the application.
 */

import * as v8 from 'v8'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { logger } from './logger.js'
// @ts-expect-error - heapdump module doesn't have types
import heapdump from 'heapdump'
import { EventEmitter } from 'events'

export interface MemorySnapshot {
  timestamp: number
  heapUsed: number
  heapTotal: number
  external: number
  arrayBuffers: number
  rss: number
}

export interface MemoryThresholds {
  heapUsedThreshold?: number // bytes
  rssThreshold?: number // bytes
  snapshotInterval?: number // milliseconds
  leakDetectionInterval?: number // milliseconds
}

export class MemoryProfiler extends EventEmitter {
  private snapshots: MemorySnapshot[] = []
  private profileDir: string
  private isMonitoring = false
  private monitoringInterval?: NodeJS.Timeout
  private snapshotInterval?: NodeJS.Timeout
  private thresholds: Required<MemoryThresholds>
  private baselineMemory?: MemorySnapshot

  constructor(
    profileDir = './memory-profiles',
    thresholds: MemoryThresholds = {}
  ) {
    super()
    this.profileDir = profileDir
    this.thresholds = {
      heapUsedThreshold: thresholds.heapUsedThreshold || 500 * 1024 * 1024, // 500MB
      rssThreshold: thresholds.rssThreshold || 1024 * 1024 * 1024, // 1GB
      snapshotInterval: thresholds.snapshotInterval || 60000, // 1 minute
      leakDetectionInterval: thresholds.leakDetectionInterval || 300000, // 5 minutes
    }

    // Ensure profile directory exists
    if (!existsSync(this.profileDir)) {
      mkdirSync(this.profileDir, { recursive: true })
    }
  }

  /**
   * Start monitoring memory usage
   */
  public startMonitoring(): void {
    if (this.isMonitoring) {
      logger.warn('Memory monitoring is already active')
      return
    }

    this.isMonitoring = true
    this.baselineMemory = this.captureSnapshot()

    logger.info('Starting memory monitoring', {
      profileDir: this.profileDir,
      thresholds: this.thresholds,
    })

    // Regular memory snapshots
    this.snapshotInterval = setInterval(() => {
      const snapshot = this.captureSnapshot()
      this.snapshots.push(snapshot)

      // Keep only last 100 snapshots
      if (this.snapshots.length > 100) {
        this.snapshots.shift()
      }

      // Check thresholds
      this.checkThresholds(snapshot)
    }, this.thresholds.snapshotInterval)

    // Leak detection
    this.monitoringInterval = setInterval(() => {
      this.detectMemoryLeaks()
    }, this.thresholds.leakDetectionInterval)
  }

  /**
   * Stop monitoring memory usage
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return
    }

    this.isMonitoring = false

    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval)
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }

    logger.info('Stopped memory monitoring')
  }

  /**
   * Capture current memory snapshot
   */
  private captureSnapshot(): MemorySnapshot {
    const memUsage = process.memoryUsage()
    return {
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
      rss: memUsage.rss,
    }
  }

  /**
   * Check memory thresholds and emit warnings
   */
  private checkThresholds(snapshot: MemorySnapshot): void {
    if (snapshot.heapUsed > this.thresholds.heapUsedThreshold) {
      logger.warn('Heap memory usage exceeds threshold', {
        heapUsed: this.formatBytes(snapshot.heapUsed),
        threshold: this.formatBytes(this.thresholds.heapUsedThreshold),
      })
      this.emit('threshold-exceeded', {
        type: 'heap',
        value: snapshot.heapUsed,
        threshold: this.thresholds.heapUsedThreshold,
      })
    }

    if (snapshot.rss > this.thresholds.rssThreshold) {
      logger.warn('RSS memory usage exceeds threshold', {
        rss: this.formatBytes(snapshot.rss),
        threshold: this.formatBytes(this.thresholds.rssThreshold),
      })
      this.emit('threshold-exceeded', {
        type: 'rss',
        value: snapshot.rss,
        threshold: this.thresholds.rssThreshold,
      })
    }
  }

  /**
   * Detect potential memory leaks by analyzing trends
   */
  private detectMemoryLeaks(): void {
    if (this.snapshots.length < 10) {
      return // Not enough data
    }

    const recentSnapshots = this.snapshots.slice(-10)
    const heapGrowth = this.calculateGrowthRate(
      recentSnapshots.map((s) => s.heapUsed)
    )
    const rssGrowth = this.calculateGrowthRate(
      recentSnapshots.map((s) => s.rss)
    )

    if (heapGrowth > 0.1) {
      // 10% growth rate
      logger.error('Potential memory leak detected in heap', {
        growthRate: `${(heapGrowth * 100).toFixed(2)}%`,
        currentHeap: this.formatBytes(
          recentSnapshots[recentSnapshots.length - 1].heapUsed
        ),
      })
      this.emit('leak-detected', {
        type: 'heap',
        growthRate: heapGrowth,
        snapshots: recentSnapshots,
      })
    }

    if (rssGrowth > 0.1) {
      // 10% growth rate
      logger.error('Potential memory leak detected in RSS', {
        growthRate: `${(rssGrowth * 100).toFixed(2)}%`,
        currentRSS: this.formatBytes(
          recentSnapshots[recentSnapshots.length - 1].rss
        ),
      })
      this.emit('leak-detected', {
        type: 'rss',
        growthRate: rssGrowth,
        snapshots: recentSnapshots,
      })
    }
  }

  /**
   * Calculate growth rate using linear regression
   */
  private calculateGrowthRate(values: number[]): number {
    const n = values.length
    if (n < 2) return 0

    // Simple linear regression
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0

    for (let i = 0; i < n; i++) {
      sumX += i
      sumY += values[i]
      sumXY += i * values[i]
      sumX2 += i * i
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const avgValue = sumY / n

    // Return growth rate as percentage of average
    return avgValue > 0 ? slope / avgValue : 0
  }

  /**
   * Take a heap snapshot
   */
  public async takeHeapSnapshot(name?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = name || `heap-${timestamp}.heapsnapshot`
    const filepath = join(this.profileDir, filename)

    return new Promise((resolve, reject) => {
      heapdump.writeSnapshot(filepath, (err: any, filename: any) => {
        if (err) {
          logger.error('Failed to write heap snapshot', { error: err })
          reject(err)
        } else {
          logger.info('Heap snapshot written', { filename })
          resolve(filename!)
        }
      })
    })
  }

  /**
   * Write V8 heap statistics
   */
  public writeHeapStatistics(name?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = name || `heap-stats-${timestamp}.json`
    const filepath = join(this.profileDir, filename)

    const stats = v8.getHeapStatistics()
    const spaces = v8.getHeapSpaceStatistics()

    const report = {
      timestamp: new Date().toISOString(),
      heapStatistics: stats,
      heapSpaceStatistics: spaces,
      memoryUsage: process.memoryUsage(),
      snapshots: this.snapshots.slice(-20), // Last 20 snapshots
    }

    writeFileSync(filepath, JSON.stringify(report, null, 2))
    logger.info('Heap statistics written', { filename })

    return filepath
  }

  /**
   * Get memory usage summary
   */
  public getMemorySummary(): {
    current: MemorySnapshot
    baseline?: MemorySnapshot
    growth?: {
      heapUsed: number
      rss: number
    }
  } {
    const current = this.captureSnapshot()
    const result: any = { current }

    if (this.baselineMemory) {
      result.baseline = this.baselineMemory
      result.growth = {
        heapUsed:
          ((current.heapUsed - this.baselineMemory.heapUsed) /
            this.baselineMemory.heapUsed) *
          100,
        rss:
          ((current.rss - this.baselineMemory.rss) / this.baselineMemory.rss) *
          100,
      }
    }

    return result
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
  }

  /**
   * Force garbage collection (requires --expose-gc flag)
   */
  public forceGC(): void {
    if (global.gc) {
      logger.info('Forcing garbage collection')
      global.gc()
    } else {
      logger.warn(
        'Garbage collection not exposed. Run with --expose-gc flag to enable.'
      )
    }
  }
}

// Export singleton instance
export const memoryProfiler = new MemoryProfiler()
