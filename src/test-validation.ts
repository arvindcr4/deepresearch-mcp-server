#!/usr/bin/env ts-node
import {
  ZodValidator,
  CLIValidator,
  zDeepResearchQuery,
} from './middleware/validation.js'

// Test cases for Deep Research Query validation
const testQueries = [
  // Valid query with minimal data
  {
    description: 'Valid minimal query',
    data: {
      query: 'What is artificial intelligence?',
    },
  },
  // Valid query with full options
  {
    description: 'Valid full query',
    data: {
      query: 'Latest developments in quantum computing',
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
      max_tokens: 2000,
      maxResults: 15,
      includePageContent: true,
      browsePage: 'https://example.com/quantum-computing',
      recency: 'week',
      searchDepth: 'deep',
      realTimeData: true,
      searchDomainFilter: ['arxiv.org', 'nature.com'],
      includeAnalysis: true,
      context: 'Research for academic paper on quantum supremacy',
    },
  },
  // Invalid query - missing query field
  {
    description: 'Invalid - missing query',
    data: {
      provider: 'openai',
    },
    expectError: true,
  },
  // Invalid query - query too short
  {
    description: 'Invalid - query too short',
    data: {
      query: '',
    },
    expectError: true,
  },
  // Invalid query - invalid provider
  {
    description: 'Invalid - bad provider',
    data: {
      query: 'test query',
      provider: 'invalid-provider',
    },
    expectError: true,
  },
  // Invalid query - temperature out of range
  {
    description: 'Invalid - temperature out of range',
    data: {
      query: 'test query',
      temperature: 3.0,
    },
    expectError: true,
  },
  // Invalid query - invalid URL
  {
    description: 'Invalid - bad browsePage URL',
    data: {
      query: 'test query',
      browsePage: 'not-a-url',
    },
    expectError: true,
  },
]

// Test cases for Deep Research Response validation
const testResponses = [
  // Valid response
  {
    description: 'Valid response',
    data: {
      query: 'test query',
      provider: 'openai',
      searchResults: {
        query: 'test query',
        results: [
          {
            title: 'Test Result',
            url: 'https://example.com/test',
            snippet: 'This is a test snippet',
          },
        ],
        metadata: {
          provider: 'openai',
          totalResults: 1,
        },
      },
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: 1500,
        totalResults: 1,
      },
    },
  },
  // Invalid response - missing required fields
  {
    description: 'Invalid - missing searchResults',
    data: {
      query: 'test query',
      provider: 'openai',
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: 1500,
        totalResults: 1,
      },
    },
    expectError: true,
  },
]

// CLI argument test cases
const testCLIArgs = [
  // Valid CLI args
  {
    description: 'Valid CLI args',
    data: {
      query: 'test query',
      provider: 'openai',
      maxResults: '10',
      temperature: '0.7',
    },
  },
  // CLI args with type conversion needed
  {
    description: 'CLI args needing type conversion',
    data: {
      query: 'test query',
      provider: 'perplexity',
      maxResults: '25',
      temperature: '1.2',
      maxTokens: '3000',
      includePageContent: true,
      realTimeData: false,
    },
  },
]

function runTest(
  testName: string,
  testCases: any[],
  validator: (data: any) => any
) {
  console.log(`\n🧪 Testing ${testName}`)
  console.log('='.repeat(50))

  let passed = 0
  let failed = 0

  for (const testCase of testCases) {
    try {
      const result = validator(testCase.data)

      if (testCase.expectError) {
        console.log(
          `❌ ${testCase.description} - Expected error but got success`
        )
        failed++
      } else {
        console.log(`✅ ${testCase.description} - Passed`)
        if (process.env.VERBOSE) {
          console.log('   Result:', JSON.stringify(result, null, 2))
        }
        passed++
      }
    } catch (error) {
      if (testCase.expectError) {
        console.log(
          `✅ ${testCase.description} - Expected error caught: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
        passed++
      } else {
        console.log(
          `❌ ${testCase.description} - Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
        failed++
      }
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`)
  return { passed, failed }
}

function runSafeParseTest() {
  console.log(`\n🧪 Testing Safe Parse`)
  console.log('='.repeat(50))

  const validData = { query: 'test query' }
  const invalidData = { query: '' }

  const validResult = ZodValidator.safeParse(zDeepResearchQuery, validData)
  const invalidResult = ZodValidator.safeParse(zDeepResearchQuery, invalidData)

  console.log(
    'Valid data safe parse:',
    validResult.success ? '✅ Success' : '❌ Failed'
  )
  console.log(
    'Invalid data safe parse:',
    !invalidResult.success ? '✅ Expected failure' : '❌ Unexpected success'
  )

  if (!invalidResult.success) {
    console.log('Error details:', invalidResult.error)
  }
}

async function main() {
  console.log('🔍 Deep Research Zod Validation Test Suite')
  console.log('==========================================')

  let totalPassed = 0
  let totalFailed = 0

  // Test Deep Research Query validation
  const queryResults = runTest(
    'Deep Research Query Validation',
    testQueries,
    (data) => ZodValidator.validateDeepResearchQuery(data)
  )
  totalPassed += queryResults.passed
  totalFailed += queryResults.failed

  // Test Deep Research Response validation
  const responseResults = runTest(
    'Deep Research Response Validation',
    testResponses,
    (data) => ZodValidator.validateDeepResearchResponse(data)
  )
  totalPassed += responseResults.passed
  totalFailed += responseResults.failed

  // Test CLI validation
  const cliResults = runTest('CLI Validation', testCLIArgs, (data) =>
    CLIValidator.validateCLIArgs(data)
  )
  totalPassed += cliResults.passed
  totalFailed += cliResults.failed

  // Test safe parse functionality
  runSafeParseTest()

  // Final summary
  console.log(`\n📊 Final Results`)
  console.log('='.repeat(30))
  console.log(`Total Passed: ${totalPassed}`)
  console.log(`Total Failed: ${totalFailed}`)
  console.log(
    `Success Rate: ${totalPassed + totalFailed > 0 ? ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1) : 0}%`
  )

  if (totalFailed > 0) {
    console.log('\n❌ Some tests failed!')
    process.exit(1)
  } else {
    console.log('\n✅ All tests passed!')
  }
}

// Run the tests
main().catch((error) => {
  console.error('Test suite failed:', error)
  process.exit(1)
})
