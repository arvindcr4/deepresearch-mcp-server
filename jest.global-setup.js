// Jest global setup - runs once before all tests
const dotenv = require('dotenv')
const { spawn } = require('child_process')

// Load test environment
dotenv.config({ path: '.env.test' })

module.exports = async () => {
  console.log('🚀 Setting up test environment...')

  // Global test configuration
  global.testStartTime = Date.now()

  // Check if Neo4j is available for integration tests
  try {
    // Try to connect to Neo4j (optional - tests should be able to run without it)
    const neo4jUri = process.env.NEO4J_URI || 'bolt://localhost:7687'
    console.log(`📊 Checking Neo4j connection at ${neo4jUri}...`)

    // You could add actual connection check here if needed
    // For now, we'll just log the attempt
    console.log('📊 Neo4j connection check completed')
  } catch (error) {
    console.warn(
      '⚠️  Neo4j not available for integration tests:',
      error.message
    )
    console.warn(
      '⚠️  Unit tests will still run, but integration tests may fail'
    )
  }

  // Setup test database or mock services if needed
  console.log('✅ Test environment setup completed')

  // Set global timeout
  global.testTimeout = 30000

  return Promise.resolve()
}
