#!/usr/bin/env node

import { createHttpServer } from './src/mcp/server.js'

async function testHttpServer() {
  try {
    console.log('Starting HTTP server on port 3000...')
    await createHttpServer(3000)
    console.log('✅ HTTP server started successfully')
    console.log('Test the endpoints:')
    console.log('  GET  http://localhost:3000/healthz')
    console.log('  POST http://localhost:3000/deep-research')
    console.log('')
    console.log('Sample POST request:')
    console.log('curl -X POST http://localhost:3000/deep-research \\')
    console.log('  -H "Content-Type: application/json" \\')
    console.log(
      '  -d \'{"query": "Best papers on RLHF", "provider": "perplexity"}\''
    )
  } catch (error) {
    console.error('❌ HTTP server test failed:', error)
    process.exit(1)
  }
}

testHttpServer()
