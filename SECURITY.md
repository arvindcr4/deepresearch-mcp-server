# Security Best Practices for DeepResearch MCP Server

## API Key Security

### Never Expose API Keys

1. **Environment Variables Only**: Always store API keys in environment variables or `.env` files
2. **Never Commit**: Add `.env` to `.gitignore` to prevent accidental commits
3. **Use `.env.example`**: Provide a template without actual keys for other developers

### API Key Format Validation

The server validates API key formats at startup:
- **OpenAI**: Must start with `sk-`
- **Perplexity**: Must start with `pplx-`
- **XAI Grok**: Must start with `xai-`

Invalid formats will cause the server to fail startup with a clear error message.

## Secure Logging

The server implements automatic log sanitization to prevent sensitive data exposure:

### What Gets Redacted

- API keys and bearer tokens
- Passwords and secrets
- Connection strings with credentials
- Any field containing 'key', 'token', 'secret', 'password'

### Example Log Output

```
// Instead of:
"Failed to connect: Bearer sk-proj-1234567890abcdef"

// You'll see:
"Failed to connect: Bearer [REDACTED]"
```

### Debug Mode in Production

**Warning**: Running with `LOG_LEVEL=debug` in production is discouraged as it may log additional details. Always use `info` or higher in production.

## Error Handling

### Sanitized Error Messages

All error messages are automatically sanitized before being:
- Logged to files
- Returned in API responses
- Displayed in console output

### Stack Trace Security

Stack traces are sanitized to remove any inline sensitive data while preserving debugging information.

## Configuration Security

### Neo4j Password

- Never use the default password ('password')
- Use strong, unique passwords
- The server will refuse to start with default passwords in production

### Authentication

- `AUTH_REQUIRED=true` by default
- Only disable for local development
- Production deployments should always require authentication

## Network Security

### Rate Limiting

Configure appropriate rate limits to prevent abuse:
```env
GLOBAL_RATE_LIMIT=30      # Overall limit
OPENAI_RATE_LIMIT=50      # Per-provider limits
PERPLEXITY_RATE_LIMIT=30
XAI_GROK_RATE_LIMIT=40
```

### API Error Responses

Provider API errors are sanitized to never expose:
- Full error response bodies
- API keys in error messages
- Internal system paths

## Development vs Production

### Development Mode
- More verbose logging acceptable
- Debug information available
- Relaxed security for easier debugging

### Production Mode
- Minimal logging
- No debug information
- Strict security enforcement
- Configuration validation

## Security Checklist

Before deploying to production:

- [ ] All API keys are stored in environment variables
- [ ] `.env` file is in `.gitignore`
- [ ] Neo4j password is changed from default
- [ ] `NODE_ENV=production` is set
- [ ] `LOG_LEVEL` is set to `info` or higher
- [ ] `AUTH_REQUIRED=true` is set
- [ ] Rate limits are configured appropriately
- [ ] No sensitive data in code comments
- [ ] Error messages don't expose system details

## Reporting Security Issues

If you discover a security vulnerability, please:
1. Do NOT open a public issue
2. Email security concerns to the maintainers
3. Include steps to reproduce if possible
4. Allow time for a fix before public disclosure

## Monitoring

### Log Review

Regularly review logs for:
- Repeated authentication failures
- Unusual API usage patterns
- Rate limit violations
- Error spikes

### Secure Log Storage

- Store logs in a secure location
- Implement log rotation
- Consider log aggregation services
- Ensure logs are not publicly accessible

## Updates and Patches

- Keep all dependencies updated
- Monitor security advisories
- Apply patches promptly
- Test updates in staging first