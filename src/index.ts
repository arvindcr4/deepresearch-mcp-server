#!/usr/bin/env node
import { createMcpServer, createHttpServer } from './mcp/server.js'
import { secureLogger } from './utils/secureLogger.js'
import {
  validateConfiguration,
  printConfigSummary,
} from './utils/configValidator.js'
import { program } from 'commander'
import { UnifiedDeepResearchTool } from './mcp/tools/deep-research-unified.js'
import { CLIValidator } from './middleware/validation.js'
import { gracefulShutdown } from './utils/gracefulShutdown.js'

let server: any | undefined

const startMcpServer = async () => {
  try {
    secureLogger.info('Starting ATLAS MCP Server...')

    // Validate configuration first
    const validation = validateConfiguration()
    if (!validation.valid) {
      secureLogger.error(
        'Configuration validation failed. Please check your environment variables.'
      )
      process.exit(1)
    }

    // Print configuration summary
    printConfigSummary()

    // Create server with timeout
    const SERVER_INIT_TIMEOUT = 60000 // 60 seconds
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `Server initialization timed out after ${SERVER_INIT_TIMEOUT}ms`
          )
        )
      }, SERVER_INIT_TIMEOUT)
    })

    // Create and store server instance
    server = await Promise.race([createMcpServer(), timeoutPromise])

    secureLogger.info('ATLAS MCP Server is running and awaiting messages.')

    // Initialize graceful shutdown for MCP server
    gracefulShutdown.initialize()
  } catch (error) {
    secureLogger.error(
      'Failed to start ATLAS MCP Server:',
      error instanceof Error ? error : new Error(String(error))
    )
    process.exit(1)
  }
}

// CLI setup for the main deepresearch-mcp command
program
  .name('deepresearch-mcp')
  .description('Deep research CLI using multiple AI providers')
  .version('1.0.0')

// Main command without subcommand - for the requested interface
program
  .argument('<query>', 'Search query')
  .option(
    '-p, --provider <provider>',
    'Provider to use (openai|perplexity|grok)',
    'openai'
  )
  .option('-m, --model <model>', 'Model to use (provider-specific)')
  .option('-t, --temperature <number>', 'Temperature for the model (0.0-2.0)')
  .option('--max-tokens <number>', 'Maximum tokens for the response')
  .option('--max-results <number>', 'Maximum number of results', '10')
  .option('-c, --include-page-content', 'Include full page content')
  .option(
    '-b, --browse-page <url>',
    'Browse a specific page for additional context'
  )
  .option('-r, --recency <period>', 'Time filter (day|week|month|year)')
  .option(
    '--search-depth <depth>',
    'Search depth (shallow|medium|deep) - Grok only'
  )
  .option('--real-time-data', 'Use real-time data - Grok only')
  .option(
    '--search-domain-filter <domains...>',
    'Domain filter - Perplexity only'
  )
  .option('--include-analysis', 'Include AI analysis of results')
  .option('--context <text>', 'Additional context for the research query')
  .option('-v, --verbose', 'Verbose output')
  .action(async (query: string, options: any) => {
    try {
      // Validate CLI arguments using Zod
      const validatedQuery = CLIValidator.validateCLIArgs({
        query,
        provider: options.provider,
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        maxResults: options.maxResults,
        includePageContent: options.includePageContent || false,
        browsePage: options.browsePage,
        recency: options.recency,
        searchDepth: options.searchDepth,
        realTimeData: options.realTimeData || false,
        searchDomainFilter: options.searchDomainFilter,
        includeAnalysis: options.includeAnalysis || false,
        context: options.context,
      })

      // Create unified tool instance
      const unifiedTool = new UnifiedDeepResearchTool()

      // Execute search
      const result = await unifiedTool.execute(validatedQuery)

      // Output JSON stringified result as requested
      console.log(JSON.stringify(result, null, 2))
    } catch (error) {
      console.error(
        JSON.stringify(
          {
            error: 'Deep research failed',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          },
          null,
          2
        )
      )
      if (options.verbose) {
        console.error(error)
      }
      process.exit(1)
    }
  })

program
  .command('mcp-server')
  .description('Start the MCP server (stdio transport)')
  .action(async () => {
    await startMcpServer()
  })

program
  .command('http-server')
  .description('Start HTTP server with deep research endpoints')
  .option('-p, --port <number>', 'Port to run the server on', '3000')
  .action(async (options: any) => {
    try {
      const port = parseInt(options.port, 10)

      // Create server with timeout
      const SERVER_INIT_TIMEOUT = 60000 // 60 seconds
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new Error(
              `HTTP server initialization timed out after ${SERVER_INIT_TIMEOUT}ms`
            )
          )
        }, SERVER_INIT_TIMEOUT)
      })

      server = await Promise.race([createHttpServer(port), timeoutPromise])

      // Graceful shutdown is already initialized in createHttpServer
    } catch (error) {
      console.error(
        '❌ Failed to start HTTP server:',
        error instanceof Error ? error.message : 'Unknown error'
      )
      process.exit(1)
    }
  })

// If no command is provided and no arguments, start MCP server (legacy behavior)
if (process.argv.length === 2) {
  startMcpServer()
} else {
  // Parse CLI arguments
  program.parse()
}
