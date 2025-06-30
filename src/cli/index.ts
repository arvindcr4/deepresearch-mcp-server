#!/usr/bin/env node

import { program } from 'commander'
import { OpenAIProvider } from '../providers/openai.js'
import { PerplexityProvider } from '../providers/perplexity.js'
import { GrokProvider } from '../providers/grok.js'
import { FirecrawlProvider } from '../providers/firecrawl.js'
import { AgentspaceProvider } from '../providers/agentspace.js'
import { config } from '../config/index.js'
import { logger } from '../utils/logger.js'
import { UnifiedDeepResearchTool } from '../mcp/tools/deep-research-unified.js'
import { CLIValidator, ZodValidator } from '../middleware/validation.js'

interface CLIOptions {
  provider?: 'openai' | 'perplexity' | 'grok' | 'firecrawl' | 'agentspace'
  maxResults?: number
  includePageContent?: boolean
  browsePage?: string
  recency?: 'day' | 'week' | 'month' | 'year'
  output?: 'json' | 'table' | 'summary'
  verbose?: boolean
  depth?: 'quick' | 'standard' | 'comprehensive'
  includeAnalysis?: boolean
}

async function performSearch(query: string, options: CLIOptions) {
  try {
    const startTime = Date.now()

    // Configure logging level
    if (options.verbose) {
      // TODO: Logger class doesn't expose level setter - logging level is set during construction
      // Consider adding a setLevel method to Logger class or using a different approach
      // logger.level = 'debug';
    }

    // Determine provider
    let provider
    const providerName = options.provider || 'auto'

    switch (providerName) {
      case 'openai':
        if (!config.apiKeys.openai) {
          console.error('OpenAI API key not configured')
          process.exit(1)
        }
        provider = new OpenAIProvider(config.apiKeys.openai)
        break
      case 'perplexity':
        if (!config.apiKeys.perplexity) {
          console.error('Perplexity API key not configured')
          process.exit(1)
        }
        provider = new PerplexityProvider(config.apiKeys.perplexity)
        break
      case 'grok':
        if (!config.apiKeys.xaiGrok) {
          console.error('Grok API key not configured')
          process.exit(1)
        }
        provider = new GrokProvider(config.apiKeys.xaiGrok)
        break
      case 'firecrawl':
        if (!config.apis.firecrawl?.apiKey) {
          console.error('Firecrawl API key not configured')
          process.exit(1)
        }
        provider = new FirecrawlProvider(config.apis.firecrawl.apiKey)
        break
      case 'agentspace':
        if (!config.apis.agentspace?.apiKey) {
          console.error('Agentspace API key not configured')
          process.exit(1)
        }
        provider = new AgentspaceProvider(
          config.apis.agentspace.apiKey,
          config.apis.agentspace.baseUrl
        )
        break
      case 'auto':
        // Auto-select first available provider
        if (config.apiKeys.openai) {
          provider = new OpenAIProvider(config.apiKeys.openai)
          logger.info('Auto-selected OpenAI provider')
        } else if (config.apiKeys.perplexity) {
          provider = new PerplexityProvider(config.apiKeys.perplexity)
          logger.info('Auto-selected Perplexity provider')
        } else if (config.apiKeys.xaiGrok) {
          provider = new GrokProvider(config.apiKeys.xaiGrok)
          logger.info('Auto-selected Grok provider')
        } else {
          console.error(
            'No API keys configured. Please set up at least one provider.'
          )
          process.exit(1)
        }
        break
      default:
        console.error(`Unknown provider: ${providerName}`)
        process.exit(1)
    }

    console.log(`🔍 Searching: "${query}"...`)

    // Perform search
    const searchOptions = {
      maxResults: options.maxResults,
      recency: options.recency,
    }

    const searchResults = await provider.search(query, searchOptions)

    // Handle page browsing if requested
    let pageContent
    if (options.browsePage && 'browsePage' in provider && provider.browsePage) {
      console.log(`📄 Browsing page: ${options.browsePage}...`)
      pageContent = await provider.browsePage(options.browsePage)
    }

    const processingTime = Date.now() - startTime

    // Output results
    outputResults(
      {
        query,
        searchResults,
        pageContent,
        processingTime,
        provider: providerName,
      },
      options
    )
  } catch (error) {
    console.error(
      '❌ Search failed:',
      error instanceof Error ? error.message : 'Unknown error'
    )
    if (options.verbose) {
      console.error(error)
    }
    process.exit(1)
  }
}

function outputResults(results: any, options: CLIOptions) {
  switch (options.output) {
    case 'json':
      console.log(JSON.stringify(results, null, 2))
      break
    case 'table':
      outputTable(results)
      break
    case 'summary':
    default:
      outputSummary(results)
      break
  }
}

function outputSummary(results: any) {
  console.log('\n📊 Search Results Summary')
  console.log('='.repeat(50))
  console.log(`Query: ${results.query}`)
  console.log(`Provider: ${results.provider}`)
  console.log(`Results: ${results.searchResults.results.length}`)
  console.log(`Processing Time: ${results.processingTime}ms`)
  console.log('')

  results.searchResults.results.forEach((result: any, index: number) => {
    console.log(`${index + 1}. ${result.title}`)
    console.log(`   URL: ${result.url}`)
    console.log(`   ${result.snippet}`)
    console.log('')
  })

  if (results.pageContent) {
    console.log('📄 Page Content')
    console.log('-'.repeat(30))
    console.log(`Title: ${results.pageContent.title}`)
    console.log(`URL: ${results.pageContent.url}`)
    console.log(
      `Content Length: ${results.pageContent.content.length} characters`
    )
    console.log('')
  }
}

function outputTable(results: any) {
  console.table(
    results.searchResults.results.map((result: any, index: number) => ({
      '#': index + 1,
      Title:
        result.title.substring(0, 50) + (result.title.length > 50 ? '...' : ''),
      URL: result.url.substring(0, 40) + (result.url.length > 40 ? '...' : ''),
      Snippet:
        result.snippet.substring(0, 60) +
        (result.snippet.length > 60 ? '...' : ''),
    }))
  )
}

function outputUnifiedResults(results: any, options: any) {
  switch (options.output) {
    case 'json':
      console.log(JSON.stringify(results, null, 2))
      break
    case 'table':
      outputUnifiedTable(results)
      break
    case 'summary':
    default:
      outputUnifiedSummary(results)
      break
  }
}

function outputUnifiedSummary(results: any) {
  console.log('\n📊 Unified Deep Research Results')
  console.log('='.repeat(50))
  console.log(`Query: ${results.query}`)
  console.log(`Provider: ${results.provider}`)
  console.log(`Results: ${results.searchResults.results.length}`)
  console.log(`Processing Time: ${results.metadata.processingTime}ms`)
  console.log(`Timestamp: ${results.metadata.timestamp}`)
  if (results.metadata.availableProviders) {
    console.log(
      `Available Providers: ${results.metadata.availableProviders.join(', ')}`
    )
  }

  // Show model info if available
  if (results.searchResults.metadata?.model) {
    console.log(`Model: ${results.searchResults.metadata.model}`)
  }

  // Show usage info if available
  if (results.searchResults.metadata?.usage) {
    const usage = results.searchResults.metadata.usage
    console.log(`Token Usage: ${usage.total_tokens || 'N/A'} total`)
    if (usage.prompt_tokens) console.log(`  Prompt: ${usage.prompt_tokens}`)
    if (usage.completion_tokens)
      console.log(`  Completion: ${usage.completion_tokens}`)
  }

  console.log('')

  // Show answer if available (from providers like Perplexity)
  if (results.searchResults.metadata?.answer) {
    console.log('🎯 AI Answer')
    console.log('-'.repeat(30))
    console.log(results.searchResults.metadata.answer)
    console.log('')
  }

  // Show search results
  console.log('🔍 Search Results')
  console.log('-'.repeat(30))
  results.searchResults.results.forEach((result: any, index: number) => {
    console.log(`${index + 1}. ${result.title}`)
    console.log(`   URL: ${result.url}`)
    console.log(`   ${result.snippet}`)
    if (result.relevanceScore) {
      console.log(`   Relevance: ${(result.relevanceScore * 100).toFixed(1)}%`)
    }
    if (result.publishedDate) {
      console.log(`   Published: ${result.publishedDate}`)
    }
    console.log('')
  })

  // Show page content if available
  if (results.pageContent) {
    console.log('📄 Page Content')
    console.log('-'.repeat(30))
    console.log(`Title: ${results.pageContent.title}`)
    console.log(`URL: ${results.pageContent.url}`)
    console.log(
      `Content Length: ${results.pageContent.content.length} characters`
    )
    if (results.pageContent.metadata?.extractedAt) {
      console.log(`Extracted At: ${results.pageContent.metadata.extractedAt}`)
    }
    console.log('')
  }
}

function outputUnifiedTable(results: any) {
  console.log(`\n📊 Query: ${results.query} | Provider: ${results.provider}\n`)

  console.table(
    results.searchResults.results.map((result: any, index: number) => ({
      '#': index + 1,
      Title:
        result.title.substring(0, 50) + (result.title.length > 50 ? '...' : ''),
      URL: result.url.substring(0, 40) + (result.url.length > 40 ? '...' : ''),
      Snippet:
        result.snippet.substring(0, 60) +
        (result.snippet.length > 60 ? '...' : ''),
      Relevance: result.relevanceScore
        ? `${(result.relevanceScore * 100).toFixed(1)}%`
        : 'N/A',
      Published: result.publishedDate || 'N/A',
    }))
  )

  console.log(`\nProcessing Time: ${results.metadata.processingTime}ms`)
  if (results.searchResults.metadata?.usage?.total_tokens) {
    console.log(
      `Token Usage: ${results.searchResults.metadata.usage.total_tokens}`
    )
  }
}

// CLI setup
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
  .command('search')
  .description('Perform a deep research search (legacy interface)')
  .argument('<query>', 'Search query')
  .option(
    '-p, --provider <provider>',
    'Provider to use (openai|perplexity|grok|firecrawl|agentspace|auto)',
    'auto'
  )
  .option('-m, --max-results <number>', 'Maximum number of results', '10')
  .option('-c, --include-page-content', 'Include full page content')
  .option(
    '-b, --browse-page <url>',
    'Browse a specific page for additional context'
  )
  .option('-r, --recency <period>', 'Time filter (day|week|month|year)')
  .option(
    '-o, --output <format>',
    'Output format (json|table|summary)',
    'summary'
  )
  .option('-v, --verbose', 'Verbose output')
  .action(async (query: string, options: CLIOptions) => {
    // Convert string numbers to numbers
    if (options.maxResults) {
      options.maxResults = parseInt(options.maxResults.toString(), 10)
    }

    await performSearch(query, options)
  })

program
  .command('unified-search')
  .description(
    'Perform a deep research search using the unified tool with Zod validation (legacy interface)'
  )
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
  .option(
    '-o, --output <format>',
    'Output format (json|table|summary)',
    'summary'
  )
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

      console.log(`🔍 Unified Search: "${validatedQuery.query}"...`)
      console.log(`🤖 Provider: ${validatedQuery.provider}`)
      if (validatedQuery.model) {
        console.log(`🧠 Model: ${validatedQuery.model}`)
      }

      // Create unified tool instance
      const unifiedTool = new UnifiedDeepResearchTool()

      // Execute search
      const result = await unifiedTool.execute(validatedQuery)

      // Output results
      outputUnifiedResults(result, options)
    } catch (error) {
      console.error(
        '❌ Unified search failed:',
        error instanceof Error ? error.message : 'Unknown error'
      )
      if (options.verbose) {
        console.error(error)
      }
      process.exit(1)
    }
  })

program
  .command('config')
  .description('Show configuration status')
  .action(() => {
    console.log('🔧 Configuration Status')
    console.log('='.repeat(30))
    console.log(
      `OpenAI: ${config.apiKeys.openai ? '✅ Configured' : '❌ Not configured'}`
    )
    console.log(
      `Perplexity: ${config.apiKeys.perplexity ? '✅ Configured' : '❌ Not configured'}`
    )
    console.log(
      `Grok: ${config.apiKeys.xaiGrok ? '✅ Configured' : '❌ Not configured'}`
    )
    console.log(
      `Firecrawl: ${config.apis.firecrawl?.apiKey ? '✅ Configured' : '❌ Not configured'}`
    )
    console.log(
      `Agentspace: ${config.apis.agentspace?.apiKey ? '✅ Configured' : '❌ Not configured'}`
    )
  })

program
  .command('http-server')
  .description('Start HTTP server with deep research endpoints')
  .option('-p, --port <number>', 'Port to run the server on', '3000')
  .action(async (options: any) => {
    try {
      const port = parseInt(options.port, 10)
      const { createHttpServer } = await import('../mcp/server.js')
      await createHttpServer(port)
    } catch (error) {
      console.error(
        '❌ Failed to start HTTP server:',
        error instanceof Error ? error.message : 'Unknown error'
      )
      process.exit(1)
    }
  })

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled rejection:', reason)
  process.exit(1)
})

// Parse CLI arguments
program.parse()
