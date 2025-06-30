/**
 * Example client code demonstrating CSRF protection usage
 * with the Deep Research HTTP Server (JavaScript version)
 */

import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Get current directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configure axios instance with cookie support
const client = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true, // Important for cookie-based sessions
  headers: {
    'Content-Type': 'application/json',
  },
})

// Store CSRF token
let csrfToken = null

/**
 * Get a CSRF token from the server
 */
async function getCsrfToken() {
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
    console.error('Error getting CSRF token:', error.message)
    throw error
  }
}

/**
 * Make a deep research request with CSRF protection
 */
async function performDeepResearch(query, provider = 'perplexity') {
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
  } catch (error) {
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
 * Example usage
 */
async function runExamples() {
  try {
    console.log('=== Running CSRF Protection Examples ===\n')

    // Example 1: Get CSRF token
    console.log('1. Getting CSRF token...')
    await getCsrfToken()
    console.log('✓ Token obtained\n')

    // Example 2: Make a research request
    console.log('2. Making deep research request...')
    const result = await performDeepResearch('What is CSRF protection?')
    console.log('✓ Research completed\n')

    // Example 3: Multiple requests with same session
    console.log('3. Making multiple requests...')
    const queries = ['CSRF attack prevention', 'Web security best practices']

    for (const query of queries) {
      await performDeepResearch(query)
      console.log(`✓ Completed: "${query}"`)
    }

    console.log('\n=== All examples completed successfully! ===')
  } catch (error) {
    console.error('Example failed:', error.message)
  }
}

// HTML example for browser usage
const htmlExample = `
<!DOCTYPE html>
<html>
<head>
    <title>CSRF Protection Example</title>
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
</head>
<body>
    <h1>Deep Research with CSRF Protection</h1>
    
    <div>
        <input type="text" id="query" placeholder="Enter your research query" style="width: 300px;">
        <button onclick="doResearch()">Research</button>
    </div>
    
    <div id="result" style="margin-top: 20px;"></div>
    
    <script>
        let csrfToken = null;
        
        async function getCsrfToken() {
            try {
                const response = await axios.get('http://localhost:3000/csrf-token', {
                    withCredentials: true
                });
                csrfToken = response.data.token;
                console.log('Got CSRF token:', csrfToken);
            } catch (error) {
                console.error('Failed to get CSRF token:', error);
            }
        }
        
        async function doResearch() {
            const query = document.getElementById('query').value;
            const resultDiv = document.getElementById('result');
            
            if (!query) {
                alert('Please enter a query');
                return;
            }
            
            resultDiv.innerHTML = 'Researching...';
            
            try {
                // Get CSRF token if needed
                if (!csrfToken) {
                    await getCsrfToken();
                }
                
                // Make research request
                const response = await axios.post('http://localhost:3000/deep-research', 
                    {
                        query: query,
                        provider: 'perplexity'
                    },
                    {
                        headers: {
                            'X-CSRF-Token': csrfToken
                        },
                        withCredentials: true
                    }
                );
                
                resultDiv.innerHTML = '<h3>Results:</h3><pre>' + 
                    JSON.stringify(response.data, null, 2) + '</pre>';
                    
            } catch (error) {
                resultDiv.innerHTML = '<p style="color: red;">Error: ' + 
                    (error.response?.data?.message || error.message) + '</p>';
            }
        }
        
        // Get CSRF token on page load
        window.onload = getCsrfToken;
    </script>
</body>
</html>
`

// Save HTML example to file
function saveHtmlExample() {
  const examplesDir = path.join(__dirname)
  const htmlPath = path.join(examplesDir, 'csrf-browser-example.html')

  fs.writeFileSync(htmlPath, htmlExample)
  console.log(`\nHTML example saved to: ${htmlPath}`)
}

// Export functions
export { getCsrfToken, performDeepResearch }

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  saveHtmlExample()
  runExamples().catch(console.error)
}
