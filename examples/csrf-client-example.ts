/**
 * Example client code demonstrating CSRF protection usage
 * with the Deep Research HTTP Server
 */

import axios, { AxiosInstance } from 'axios'

// Configure axios instance with cookie support
const client: AxiosInstance = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true, // Important for cookie-based sessions
  headers: {
    'Content-Type': 'application/json',
  },
})

// Store CSRF token
let csrfToken: string | null = null

/**
 * Get a CSRF token from the server
 */
async function getCsrfToken(): Promise<string> {
  try {
    const response = await client.get('/csrf-token')

    if (response.data.success && response.data.token) {
      csrfToken = response.data.token
      console.log('Retrieved CSRF token:', csrfToken)
      return csrfToken
    } else {
      throw new Error('Failed to get CSRF token')
    }
  } catch (error) {
    console.error('Error getting CSRF token:', error)
    throw error
  }
}

/**
 * Make a deep research request with CSRF protection
 */
async function performDeepResearch(
  query: string,
  provider: string = 'perplexity'
) {
  try {
    // First, get a CSRF token if we don't have one
    if (!csrfToken) {
      await getCsrfToken()
    }

    // Make the request with CSRF token
    const response = await client.post(
      '/deep-research',
      {
        query,
        provider,
        options: {
          maxResults: 10,
          includeImages: true,
        },
      },
      {
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      }
    )

    console.log('Deep research successful:', response.data)
    return response.data
  } catch (error: any) {
    // Handle CSRF errors specifically
    if (
      error.response?.status === 403 &&
      error.response?.data?.error === 'CSRF_ERROR'
    ) {
      console.log('CSRF token expired or invalid, getting new token...')

      // Get a new CSRF token and retry
      await getCsrfToken()

      // Retry the request with new token
      const retryResponse = await client.post(
        '/deep-research',
        {
          query,
          provider,
          options: {
            maxResults: 10,
            includeImages: true,
          },
        },
        {
          headers: {
            'X-CSRF-Token': csrfToken,
          },
        }
      )

      console.log('Deep research successful after retry:', retryResponse.data)
      return retryResponse.data
    }

    console.error(
      'Deep research failed:',
      error.response?.data || error.message
    )
    throw error
  }
}

/**
 * Example usage with multiple requests
 */
async function exampleUsage() {
  try {
    // Example 1: Simple research query
    await performDeepResearch(
      'What is CSRF protection and why is it important?'
    )

    // Example 2: Research with different provider
    await performDeepResearch('Latest developments in AI security', 'openai')

    // Example 3: Multiple requests using the same session
    const queries = [
      'Best practices for web security',
      'Common CSRF attack vectors',
      'How to implement CSRF protection in modern applications',
    ]

    for (const query of queries) {
      await performDeepResearch(query)
      console.log('---')
    }
  } catch (error) {
    console.error('Example failed:', error)
  }
}

/**
 * Alternative: Using CSRF token in request body
 */
async function performDeepResearchWithBodyToken(query: string) {
  try {
    if (!csrfToken) {
      await getCsrfToken()
    }

    // Include CSRF token in request body instead of header
    const response = await client.post('/deep-research', {
      query,
      provider: 'perplexity',
      _csrf: csrfToken, // CSRF token in body
    })

    console.log('Deep research with body token successful:', response.data)
    return response.data
  } catch (error) {
    console.error('Deep research with body token failed:', error)
    throw error
  }
}

/**
 * Browser-based example (using fetch API)
 */
const browserExample = `
// Browser-based JavaScript example
async function browserDeepResearch() {
  try {
    // Get CSRF token
    const tokenResponse = await fetch('http://localhost:3000/csrf-token', {
      credentials: 'include' // Important for cookies
    });
    const { token } = await tokenResponse.json();
    
    // Make deep research request
    const response = await fetch('http://localhost:3000/deep-research', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': token
      },
      body: JSON.stringify({
        query: 'Your research query here',
        provider: 'perplexity'
      })
    });
    
    const result = await response.json();
    console.log('Research result:', result);
    
  } catch (error) {
    console.error('Browser request failed:', error);
  }
}
`

// Export for use in other modules
export { getCsrfToken, performDeepResearch, performDeepResearchWithBodyToken }

// Run example if this file is executed directly
if (require.main === module) {
  exampleUsage().catch(console.error)
}
