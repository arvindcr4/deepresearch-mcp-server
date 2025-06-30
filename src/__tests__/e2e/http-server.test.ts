import { spawn, ChildProcess } from 'child_process'
import fetch from 'node-fetch'

describe('HTTP Server E2E Tests', () => {
  let serverProcess: ChildProcess
  const PORT = 3001 // Use a different port for testing
  const BASE_URL = `http://localhost:${PORT}`

  // Increased timeout for server startup
  const SERVER_STARTUP_TIMEOUT = 30000
  const TEST_TIMEOUT = 60000

  beforeAll(async () => {
    // Start the HTTP server
    console.log('Starting HTTP server for E2E tests...')

    serverProcess = spawn(
      'node',
      [
        '--loader',
        'ts-node/esm',
        'src/index.ts',
        'http-server',
        '--port',
        PORT.toString(),
      ],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'test',
          // Mock API keys for testing
          OPENAI_API_KEY: 'test-openai-key',
          PERPLEXITY_API_KEY: 'test-perplexity-key',
          GROK_API_KEY: 'test-grok-key',
          FIRECRAWL_API_KEY: 'test-firecrawl-key',
          AGENTSPACE_API_KEY: 'test-agentspace-key',
        },
      }
    )

    // Handle server output
    serverProcess.stdout?.on('data', (data) => {
      console.log(`Server stdout: ${data}`)
    })

    serverProcess.stderr?.on('data', (data) => {
      console.error(`Server stderr: ${data}`)
    })

    // Wait for server to start
    await waitForServer(BASE_URL, SERVER_STARTUP_TIMEOUT)
    console.log('HTTP server started successfully')
  }, SERVER_STARTUP_TIMEOUT + 5000)

  afterAll(async () => {
    if (serverProcess) {
      console.log('Shutting down HTTP server...')
      serverProcess.kill('SIGTERM')

      // Wait for graceful shutdown
      await new Promise<void>((resolve) => {
        serverProcess.on('exit', () => {
          console.log('HTTP server shut down successfully')
          resolve()
        })

        // Force kill after 5 seconds if not gracefully shut down
        setTimeout(() => {
          if (!serverProcess.killed) {
            serverProcess.kill('SIGKILL')
          }
          resolve()
        }, 5000)
      })
    }
  })

  describe('Health Check', () => {
    it(
      'should respond to health check endpoint',
      async () => {
        const response = await fetch(`${BASE_URL}/health`)
        expect(response.status).toBe(200)

        const data = await response.json()
        expect(data).toMatchObject({
          status: 'healthy',
          timestamp: expect.any(String),
          version: expect.any(String),
        })
      },
      TEST_TIMEOUT
    )
  })

  describe('Deep Research Endpoints', () => {
    it(
      'should handle search requests',
      async () => {
        const response = await fetch(`${BASE_URL}/api/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: 'test search query',
            provider: 'openai',
            maxResults: 5,
          }),
        })

        // We expect this to fail in E2E since we're using mock API keys
        // But we should get a proper error response structure
        expect(response.status).toBeGreaterThanOrEqual(400)

        const data = await response.json()
        expect(data).toHaveProperty('error')
        expect(data).toHaveProperty('timestamp')
      },
      TEST_TIMEOUT
    )

    it(
      'should validate search request parameters',
      async () => {
        // Test with missing query
        const response = await fetch(`${BASE_URL}/api/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            provider: 'openai',
          }),
        })

        expect(response.status).toBe(400)

        const data = (await response.json()) as { error?: string }
        expect(data).toHaveProperty('error')
        expect(data.error).toContain('query')
      },
      TEST_TIMEOUT
    )

    it(
      'should handle invalid provider',
      async () => {
        const response = await fetch(`${BASE_URL}/api/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: 'test query',
            provider: 'invalid-provider',
          }),
        })

        expect(response.status).toBe(400)

        const data = await response.json()
        expect(data).toHaveProperty('error')
      },
      TEST_TIMEOUT
    )
  })

  describe('Browse Page Endpoints', () => {
    it(
      'should handle browse page requests',
      async () => {
        const response = await fetch(`${BASE_URL}/api/browse`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: 'https://example.com',
            provider: 'firecrawl',
          }),
        })

        // We expect this to fail in E2E since we're using mock API keys
        // But we should get a proper error response structure
        expect(response.status).toBeGreaterThanOrEqual(400)

        const data = await response.json()
        expect(data).toHaveProperty('error')
        expect(data).toHaveProperty('timestamp')
      },
      TEST_TIMEOUT
    )

    it(
      'should validate browse request parameters',
      async () => {
        // Test with missing URL
        const response = await fetch(`${BASE_URL}/api/browse`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            provider: 'firecrawl',
          }),
        })

        expect(response.status).toBe(400)

        const data = (await response.json()) as { error?: string }
        expect(data).toHaveProperty('error')
        expect(data.error).toContain('url')
      },
      TEST_TIMEOUT
    )

    it(
      'should handle invalid URL format',
      async () => {
        const response = await fetch(`${BASE_URL}/api/browse`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: 'not-a-valid-url',
            provider: 'firecrawl',
          }),
        })

        expect(response.status).toBe(400)

        const data = await response.json()
        expect(data).toHaveProperty('error')
      },
      TEST_TIMEOUT
    )
  })

  describe('Error Handling', () => {
    it(
      'should handle malformed JSON',
      async () => {
        const response = await fetch(`${BASE_URL}/api/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: 'invalid json',
        })

        expect(response.status).toBe(400)

        const data = await response.json()
        expect(data).toHaveProperty('error')
      },
      TEST_TIMEOUT
    )

    it(
      'should handle missing Content-Type header',
      async () => {
        const response = await fetch(`${BASE_URL}/api/search`, {
          method: 'POST',
          body: JSON.stringify({
            query: 'test',
            provider: 'openai',
          }),
        })

        // Should still work or return appropriate error
        expect(response.status).toBeGreaterThanOrEqual(400)
      },
      TEST_TIMEOUT
    )

    it(
      'should handle non-existent endpoints',
      async () => {
        const response = await fetch(`${BASE_URL}/api/nonexistent`)
        expect(response.status).toBe(404)
      },
      TEST_TIMEOUT
    )
  })

  describe('CORS and Security Headers', () => {
    it(
      'should include appropriate CORS headers',
      async () => {
        const response = await fetch(`${BASE_URL}/health`)

        // Check for basic security headers
        expect(response.headers.get('x-content-type-options')).toBeTruthy()
        expect(response.headers.get('x-frame-options')).toBeTruthy()
      },
      TEST_TIMEOUT
    )

    it(
      'should handle preflight requests',
      async () => {
        const response = await fetch(`${BASE_URL}/api/search`, {
          method: 'OPTIONS',
        })

        expect(response.status).toBe(200)
        expect(
          response.headers.get('access-control-allow-methods')
        ).toBeTruthy()
      },
      TEST_TIMEOUT
    )
  })
})

// Helper function to wait for server to start
async function waitForServer(url: string, timeout: number): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`${url}/health`)
      if (response.status === 200) {
        return
      }
    } catch (error) {
      // Server not ready yet, continue waiting
    }

    // Wait 1 second before next attempt
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error(`Server did not start within ${timeout}ms`)
}
