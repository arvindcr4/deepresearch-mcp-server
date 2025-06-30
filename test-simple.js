// Simple test to verify the unified tool and validation works
import { ZodValidator } from './dist/middleware/validation.js'

// Test basic query validation
const testQuery = {
  query: 'Test query for AI research',
}

console.log('Testing Zod validation...')
try {
  const validated = ZodValidator.validateDeepResearchQuery(testQuery)
  console.log('✅ Basic validation passed:', validated)
} catch (error) {
  console.log('❌ Validation failed:', error.message)
}

console.log('\nTesting invalid query...')
try {
  const invalid = ZodValidator.validateDeepResearchQuery({})
  console.log('❌ Should have failed but got:', invalid)
} catch (error) {
  console.log(
    '✅ Correctly caught validation error:',
    error.errors || error.message
  )
}
