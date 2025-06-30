/**
 * Test script for CSRF protection
 * Run with: node test-csrf.js
 */

import axios from 'axios'

// Configure axios with cookie support
const client = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

async function testCsrfProtection() {
  console.log('=== Testing CSRF Protection ===\n')

  try {
    // Test 1: Try to access protected endpoint without CSRF token
    console.log('1. Testing request without CSRF token...')
    try {
      await client.post('/deep-research', {
        query: 'Test query',
        provider: 'perplexity',
      })
      console.log(
        '❌ Request succeeded without CSRF token (should have failed)'
      )
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ Request correctly rejected without CSRF token')
      } else {
        console.log('❌ Unexpected error:', error.message)
      }
    }

    // Test 2: Get CSRF token
    console.log('\n2. Getting CSRF token...')
    const tokenResponse = await client.get('/csrf-token')
    const csrfToken = tokenResponse.data.token
    console.log('✅ Got CSRF token:', csrfToken)

    // Test 3: Make request with CSRF token
    console.log('\n3. Testing request with CSRF token...')
    try {
      const response = await client.post(
        '/deep-research',
        {
          query: 'Test query with CSRF protection',
          provider: 'perplexity',
        },
        {
          headers: {
            'X-CSRF-Token': csrfToken,
          },
        }
      )
      console.log('✅ Request succeeded with CSRF token')
      console.log('Response:', response.data)
    } catch (error) {
      console.log(
        '❌ Request failed with CSRF token:',
        error.response?.data || error.message
      )
    }

    // Test 4: Test with invalid CSRF token
    console.log('\n4. Testing request with invalid CSRF token...')
    try {
      await client.post(
        '/deep-research',
        {
          query: 'Test query',
          provider: 'perplexity',
        },
        {
          headers: {
            'X-CSRF-Token': 'invalid-token-12345',
          },
        }
      )
      console.log(
        '❌ Request succeeded with invalid CSRF token (should have failed)'
      )
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ Request correctly rejected with invalid CSRF token')
      } else {
        console.log('❌ Unexpected error:', error.message)
      }
    }

    // Test 5: Test token expiration (if implemented)
    console.log('\n5. Testing multiple requests with same token...')
    for (let i = 0; i < 3; i++) {
      try {
        await client.post(
          '/deep-research',
          {
            query: `Test query ${i + 1}`,
            provider: 'perplexity',
          },
          {
            headers: {
              'X-CSRF-Token': csrfToken,
            },
          }
        )
        console.log(`✅ Request ${i + 1} succeeded`)
      } catch (error) {
        console.log(`❌ Request ${i + 1} failed:`, error.message)
      }
    }

    console.log('\n=== All tests completed ===')
  } catch (error) {
    console.error('Test failed:', error.message)
  }
}

// Run the test
testCsrfProtection()
