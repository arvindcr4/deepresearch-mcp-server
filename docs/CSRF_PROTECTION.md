# CSRF Protection Documentation

## Overview

The Deep Research MCP Server implements Cross-Site Request Forgery (CSRF) protection for all state-changing HTTP endpoints. This prevents malicious websites from making unauthorized requests on behalf of authenticated users.

## How It Works

1. **Session Management**: Each client receives a unique session ID stored in an HTTP-only cookie
2. **Token Generation**: Clients must request a CSRF token before making POST/PUT/DELETE requests
3. **Token Validation**: The server validates the CSRF token on every state-changing request
4. **Token Rotation**: Tokens are tied to sessions and expire after 1 hour

## API Endpoints

### Get CSRF Token

```
GET /csrf-token
```

**Response:**
```json
{
  "success": true,
  "token": "csrf_token_string",
  "timestamp": "2025-06-30T12:00:00.000Z"
}
```

### Protected Endpoints

All POST, PUT, and DELETE endpoints require a valid CSRF token, including:

- `POST /deep-research` - Perform deep research queries

## Usage Examples

### 1. Using Axios (Node.js/Browser)

```javascript
const axios = require('axios');

// Configure axios with cookie support
const client = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true // Required for cookies
});

// Get CSRF token
const tokenResponse = await client.get('/csrf-token');
const csrfToken = tokenResponse.data.token;

// Make protected request
const response = await client.post('/deep-research', 
  {
    query: 'Your research query',
    provider: 'perplexity'
  },
  {
    headers: {
      'X-CSRF-Token': csrfToken
    }
  }
);
```

### 2. Using Fetch API (Browser)

```javascript
// Get CSRF token
const tokenResponse = await fetch('http://localhost:3000/csrf-token', {
  credentials: 'include' // Required for cookies
});
const { token } = await tokenResponse.json();

// Make protected request
const response = await fetch('http://localhost:3000/deep-research', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': token
  },
  body: JSON.stringify({
    query: 'Your research query',
    provider: 'perplexity'
  })
});
```

### 3. Using cURL

```bash
# Get session cookie and CSRF token
CSRF_TOKEN=$(curl -c cookies.txt -s http://localhost:3000/csrf-token | jq -r '.token')

# Make protected request
curl -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d '{"query":"Your research query","provider":"perplexity"}' \
  http://localhost:3000/deep-research
```

## Token Placement Options

The CSRF token can be sent in three ways:

1. **HTTP Header** (Recommended):
   ```
   X-CSRF-Token: your_csrf_token
   ```

2. **Request Body**:
   ```json
   {
     "query": "your query",
     "_csrf": "your_csrf_token"
   }
   ```

3. **Query Parameter**:
   ```
   POST /deep-research?_csrf=your_csrf_token
   ```

## Error Handling

### CSRF Token Missing

**Status Code:** 403 Forbidden

```json
{
  "success": false,
  "error": "CSRF_ERROR",
  "message": "CSRF token required",
  "timestamp": "2025-06-30T12:00:00.000Z"
}
```

### Invalid CSRF Token

**Status Code:** 403 Forbidden

```json
{
  "success": false,
  "error": "CSRF_ERROR",
  "message": "Invalid CSRF token",
  "timestamp": "2025-06-30T12:00:00.000Z"
}
```

### Session Required

**Status Code:** 403 Forbidden

```json
{
  "success": false,
  "error": "CSRF_ERROR",
  "message": "Session required for CSRF protection",
  "timestamp": "2025-06-30T12:00:00.000Z"
}
```

## Best Practices

1. **Always Include Credentials**: Set `withCredentials: true` (Axios) or `credentials: 'include'` (Fetch) to ensure cookies are sent

2. **Token Refresh**: Get a new CSRF token if you receive a 403 error with CSRF_ERROR

3. **Secure Cookies**: In production, cookies are set with `secure: true` and `sameSite: 'strict'`

4. **Token Storage**: Store the CSRF token in memory, not in localStorage or sessionStorage

5. **Error Retry**: Implement retry logic to handle token expiration:

```javascript
async function makeRequest(data) {
  try {
    return await client.post('/deep-research', data, {
      headers: { 'X-CSRF-Token': csrfToken }
    });
  } catch (error) {
    if (error.response?.status === 403 && error.response?.data?.error === 'CSRF_ERROR') {
      // Get new token and retry
      const tokenResponse = await client.get('/csrf-token');
      csrfToken = tokenResponse.data.token;
      
      return await client.post('/deep-research', data, {
        headers: { 'X-CSRF-Token': csrfToken }
      });
    }
    throw error;
  }
}
```

## CORS Configuration

The server includes CORS headers to support cross-origin requests:

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Credentials: true`
- `Access-Control-Allow-Headers` includes `X-CSRF-Token`

## Security Considerations

1. **HTTPS Required**: Always use HTTPS in production to prevent token interception

2. **Token Lifetime**: Tokens expire with the session (1 hour by default)

3. **No Token Reuse**: Each token is tied to a specific session

4. **Exempt Endpoints**: Only safe methods (GET, HEAD, OPTIONS) and specific endpoints (/healthz, /csrf-token) are exempt from CSRF protection

## Troubleshooting

### "CSRF token required" Error
- Ensure you're including the CSRF token in your request
- Check that you're using POST/PUT/DELETE methods

### "Invalid CSRF token" Error
- The token may have expired - get a new one
- Ensure you're sending the exact token received from /csrf-token
- Check that cookies are being sent with your request

### "Session required" Error
- Enable cookies in your HTTP client
- Set `withCredentials: true` or `credentials: 'include'`
- Check that your client supports cookies

## Example Files

Complete working examples are available in the `/examples` directory:

- `csrf-client-example.js` - Node.js client example
- `csrf-client-example.ts` - TypeScript client example
- `csrf-browser-example.html` - Browser-based example