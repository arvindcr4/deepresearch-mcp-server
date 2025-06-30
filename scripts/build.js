#!/usr/bin/env node

import { execSync } from 'child_process'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'

console.log('🔨 Building Deep Research MCP Server...')

try {
  // Ensure dist directory exists
  const distDir = path.join(process.cwd(), 'dist')
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true })
  }

  // Clean previous build
  console.log('🧹 Cleaning previous build...')
  execSync('rm -rf dist/*', { stdio: 'inherit' })

  // Compile TypeScript
  console.log('📦 Compiling TypeScript...')
  execSync('npx tsc', { stdio: 'inherit' })

  // Copy non-TS files if any
  console.log('📋 Copying additional files...')

  console.log('✅ Build completed successfully!')
  console.log('📁 Output directory: dist/')
} catch (error) {
  console.error('❌ Build failed:', error.message)
  process.exit(1)
}
