#!/usr/bin/env node

import { UnifiedDeepResearchTool } from './src/mcp/tools/deep-research-unified.js'
import { CLIValidator } from './src/middleware/validation.js'

async function testCLI() {
  try {
    console.log('Testing CLI validation and unified tool...')

    // Test CLI validation
    const validatedQuery = CLIValidator.validateCLIArgs({
      query: 'Best papers on RLHF',
      provider: 'perplexity',
      model: undefined,
      temperature: undefined,
      maxTokens: undefined,
      maxResults: 10,
      includePageContent: false,
      browsePage: undefined,
      recency: undefined,
      searchDepth: undefined,
      realTimeData: false,
      searchDomainFilter: undefined,
      includeAnalysis: false,
      context: undefined,
    })

    console.log('✅ CLI validation successful:', validatedQuery)
    console.log('✅ Test completed successfully')
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

testCLI()
