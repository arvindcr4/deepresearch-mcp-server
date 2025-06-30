#!/usr/bin/env node
/**
 * Memory Profiling Script
 * =======================
 *
 * Run memory profiling on the application to detect leaks
 * and monitor memory usage patterns.
 *
 * Usage:
 *   npm run memory:profile
 *   npm run memory:profile -- --duration 300000
 *   npm run memory:profile -- --snapshot-interval 30000
 */

import { memoryProfiler } from '../src/utils/memoryProfiler.js'
import { program } from 'commander'
import { logger } from '../src/utils/logger.js'
import { createMcpServer } from '../src/mcp/server.js'

// Configure CLI options
program
  .name('memory-profile')
  .description('Run memory profiling on the MCP server')
  .option('-d, --duration <ms>', 'Profile duration in milliseconds', '300000') // 5 minutes default
  .option(
    '-s, --snapshot-interval <ms>',
    'Snapshot interval in milliseconds',
    '30000'
  ) // 30 seconds
  .option('-t, --heap-threshold <mb>', 'Heap threshold in MB', '500')
  .option('-r, --rss-threshold <mb>', 'RSS threshold in MB', '1024')
  .option(
    '--take-snapshots',
    'Take heap snapshots on threshold exceeded',
    false
  )
  .option(
    '--force-gc',
    'Force garbage collection (requires --expose-gc)',
    false
  )
  .parse()

const options = program.opts()

async function runMemoryProfile() {
  logger.info('Starting memory profiling', options)

  // Configure memory profiler
  const profiler = memoryProfiler

  // Set up event listeners
  profiler.on('threshold-exceeded', async (data) => {
    logger.warn('Memory threshold exceeded', data)

    if (options.takeSnapshots) {
      try {
        const filename = await profiler.takeHeapSnapshot(
          `threshold-${data.type}-${Date.now()}.heapsnapshot`
        )
        logger.info('Heap snapshot saved', { filename })
      } catch (error) {
        logger.error('Failed to take heap snapshot', { error })
      }
    }
  })

  profiler.on('leak-detected', async (data) => {
    logger.error('Memory leak detected!', {
      type: data.type,
      growthRate: `${(data.growthRate * 100).toFixed(2)}%`,
    })

    // Take snapshot and write statistics
    try {
      const snapshotFile = await profiler.takeHeapSnapshot(
        `leak-${data.type}-${Date.now()}.heapsnapshot`
      )
      const statsFile = profiler.writeHeapStatistics(
        `leak-${data.type}-${Date.now()}.json`
      )

      logger.info('Leak detection files saved', {
        snapshot: snapshotFile,
        statistics: statsFile,
      })
    } catch (error) {
      logger.error('Failed to save leak detection files', { error })
    }
  })

  // Start the server
  logger.info('Starting MCP server for profiling...')
  let server

  try {
    server = await createMcpServer()

    // Start memory monitoring with custom thresholds
    profiler.startMonitoring()

    // Take initial snapshot
    const initialSnapshot = await profiler.takeHeapSnapshot(
      'initial.heapsnapshot'
    )
    logger.info('Initial heap snapshot taken', { filename: initialSnapshot })

    // Periodic GC if requested
    if (options.forceGc) {
      const gcInterval = setInterval(() => {
        profiler.forceGC()
      }, 60000) // Every minute

      // Clean up on exit
      process.on('beforeExit', () => clearInterval(gcInterval))
    }

    // Run for specified duration
    const duration = parseInt(options.duration)
    logger.info(`Running memory profile for ${duration}ms...`)

    await new Promise((resolve) => setTimeout(resolve, duration))

    // Take final snapshot
    const finalSnapshot = await profiler.takeHeapSnapshot('final.heapsnapshot')
    logger.info('Final heap snapshot taken', { filename: finalSnapshot })

    // Write final statistics
    const statsFile = profiler.writeHeapStatistics('final-stats.json')
    logger.info('Final statistics written', { filename: statsFile })

    // Get memory summary
    const summary = profiler.getMemorySummary()
    logger.info('Memory usage summary', {
      initial: {
        heapUsed: `${(summary.baseline!.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        rss: `${(summary.baseline!.rss / 1024 / 1024).toFixed(2)} MB`,
      },
      final: {
        heapUsed: `${(summary.current.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        rss: `${(summary.current.rss / 1024 / 1024).toFixed(2)} MB`,
      },
      growth: summary.growth
        ? {
            heapUsed: `${summary.growth.heapUsed.toFixed(2)}%`,
            rss: `${summary.growth.rss.toFixed(2)}%`,
          }
        : 'N/A',
    })
  } catch (error) {
    logger.error('Error during memory profiling', { error })
  } finally {
    // Stop monitoring
    profiler.stopMonitoring()

    // Cleanup
    if (server) {
      logger.info('Shutting down server...')
      process.exit(0)
    }
  }
}

// Run the profiler
runMemoryProfile().catch((error) => {
  logger.error('Memory profiling failed', { error })
  process.exit(1)
})
