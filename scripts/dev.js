#!/usr/bin/env node

import { spawn } from 'child_process'
import { watch } from 'fs'
import path from 'path'

console.log('🚀 Starting Deep Research MCP Server in development mode...')
console.log('👀 Watching for file changes...')

let serverProcess = null

function startServer() {
  if (serverProcess) {
    console.log('🔄 Restarting server...')
    serverProcess.kill()
  }

  console.log('▶️  Starting server...')
  serverProcess = spawn('node', ['dist/mcp/server.js'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' },
  })

  serverProcess.on('error', (error) => {
    console.error('❌ Server error:', error)
  })

  serverProcess.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.log(`🔄 Server exited with code ${code}`)
    }
  })
}

function buildAndStart() {
  console.log('🔨 Building...')

  const buildProcess = spawn('node', ['scripts/build.js'], {
    stdio: 'inherit',
  })

  buildProcess.on('exit', (code) => {
    if (code === 0) {
      startServer()
    } else {
      console.error('❌ Build failed')
    }
  })
}

// Initial build and start
buildAndStart()

// Watch for changes
const srcDir = path.join(process.cwd(), 'src')
watch(srcDir, { recursive: true }, (eventType, filename) => {
  if (filename && filename.endsWith('.ts')) {
    console.log(`📝 File changed: ${filename}`)
    buildAndStart()
  }
})

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping development server...')
  if (serverProcess) {
    serverProcess.kill()
  }
  process.exit(0)
})

process.on('SIGTERM', () => {
  if (serverProcess) {
    serverProcess.kill()
  }
  process.exit(0)
})
