# ReDoS (Regular Expression Denial of Service) Protection

## Overview

The deepresearch-mcp-server implements comprehensive protection against ReDoS attacks through a dedicated safe regex utility module. This protection is critical because user-provided regex patterns can potentially cause catastrophic backtracking, leading to CPU exhaustion and service unavailability.

## What is ReDoS?

ReDoS occurs when a regular expression takes exponentially longer to match certain inputs due to catastrophic backtracking. For example:

```javascript
// Dangerous pattern
const pattern = /(a+)+b/
// Input "aaaaaaaaaaaaaaaaaaaaaaaaa!" causes exponential backtracking
```

## Protection Mechanisms

### 1. Pattern Validation

Before any regex is compiled, the system validates it against known dangerous patterns:

- **Nested quantifiers**: `(a+)+`, `(a*)*`, `(.*)+`
- **Alternation with quantifiers**: `(foo|bar)*`
- **Excessive quantifiers**: `a{1000}`, `b{101,200}`
- **Deep nesting**: More than 3 levels of nested groups
- **Too many alternations**: More than 10 `|` operators

### 2. Pattern Limits

- **Maximum length**: 1000 characters
- **Maximum quantifier**: 100 repetitions
- **Maximum nesting depth**: 3 levels
- **Maximum alternations**: 10

### 3. Execution Timeout

All regex executions have a configurable timeout (default: 100ms) to prevent runaway patterns.

## Implementation

### Safe Regex Utility (`src/utils/safeRegex.ts`)

```typescript
// Check if a pattern is safe
const validation = isSafePattern(pattern)
if (!validation.safe) {
  console.error(`Unsafe pattern: ${validation.reason}`)
}

// Compile a safe regex
try {
  const regex = compileSafeRegex(pattern, {
    flags: 'i',
    timeout: 50,
    logRejections: true
  })
} catch (error) {
  // Pattern was rejected as unsafe
}

// Create a safe tester function
const tester = createSafeRegexTester(pattern)
const isMatch = tester(inputString)
```

### Validation Middleware Update

The validation middleware (`src/middleware/validation.ts`) has been updated to use safe regex compilation:

```typescript
if (schema.pattern) {
  try {
    const regexTester = createSafeRegexTester(schema.pattern, {
      logRejections: true,
      timeout: 50
    })
    
    if (!regexTester(str)) {
      throw new ValidationError('String does not match required pattern')
    }
  } catch (error) {
    throw new ValidationError(`Invalid or unsafe pattern: ${error.message}`)
  }
}
```

## Pre-defined Safe Patterns

The module includes pre-validated safe patterns for common use cases:

```typescript
SAFE_PATTERNS = {
  URL: '^https?://[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}(/[^\\s]*)?$',
  EMAIL: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
  IDENTIFIER: '^[a-zA-Z0-9_-]+$',
  NUMBER: '^-?\\d+(\\.\\d+)?$',
  ISO_DATE: '^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}(\\.\\d{3})?Z?)?$',
  PATH: '^[a-zA-Z0-9/_.-]+$'
}
```

## Usage Guidelines

### For Developers

1. **Never use `new RegExp()` with user input directly**
2. **Always use the safe regex utilities**
3. **Prefer pre-defined patterns when possible**
4. **Test patterns with the validation tools**

### For API Users

1. **Keep patterns simple and specific**
2. **Avoid nested quantifiers**
3. **Test patterns before deployment**
4. **Use exact matches when possible**

## Testing

The module includes comprehensive tests for ReDoS protection:

```bash
npm test -- src/utils/__tests__/safeRegex.test.ts
npm test -- src/middleware/__tests__/validation.test.ts
```

## Examples

### Safe Pattern Usage

```typescript
// Good: Simple, specific pattern
const phonePattern = '^\\d{3}-\\d{3}-\\d{4}$'

// Good: Using pre-defined pattern
const isValidEmail = validateWithSafePattern(email, 'EMAIL')

// Bad: Nested quantifiers
const dangerousPattern = '(\\w+)*@(\\w+)*\\.(\\w+)*'

// Bad: Excessive backtracking potential
const riskyPattern = '(a|ab|abc)*d'
```

### API Usage

```javascript
// In validation schemas
const schema = {
  type: 'object',
  properties: {
    email: {
      type: 'string',
      pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
    }
  }
}

// Pattern will be validated before use
```

## Monitoring

The system logs all rejected patterns for security monitoring:

```
[WARN] Rejected unsafe regex pattern {
  pattern: "(a+)+b",
  reason: "Pattern contains potentially dangerous constructs that may cause catastrophic backtracking"
}
```

## References

- [OWASP ReDoS Prevention](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS)
- [Regular Expression Denial of Service](https://en.wikipedia.org/wiki/ReDoS)
- [Safe Regex Libraries](https://github.com/substack/safe-regex)