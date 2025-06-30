# JSON Schema Validation

This directory contains comprehensive JSON schema validation for the deepresearch-mcp-server to prevent injection attacks and ensure data integrity.

## Validation Schemas

### neo4jValidation.ts

Provides comprehensive validation for all Neo4j data structures:

- **Common Schemas**:
  - `neo4jIdSchema` - Validates Neo4j node IDs (alphanumeric with underscores/hyphens)
  - `timestampSchema` - Validates ISO 8601 timestamps
  - `urlObjectSchema` - Validates URL objects with title and URL
  - `urlsArraySchema` - Validates arrays of URLs (max 50)
  - `tagsArraySchema` - Validates arrays of tags (max 20)

- **Entity Schemas**:
  - `projectDataSchema` / `projectSchema` - Project validation
  - `taskDataSchema` / `taskSchema` - Task validation
  - `knowledgeDataSchema` / `knowledgeSchema` - Knowledge validation
  - `relationshipDataSchema` - Relationship validation
  - `fullExportSchema` - Backup/export file validation

### validation.ts

Provides validation for MCP tool arguments:
- OpenAI Deep Research arguments
- Perplexity Sonar arguments  
- Grok3 arguments

## Helper Functions

### safeJsonParse<T>
Safely parses JSON and validates against a Zod schema:
```typescript
safeJsonParse(jsonString: string, schema: z.ZodSchema<T>, context: string): T
```

### safeJsonParseArray<T>
Safely parses JSON arrays with fallback to empty array:
```typescript
safeJsonParseArray(jsonString: string | null | undefined, itemSchema: z.ZodSchema<T>, context: string): T[]
```

### validateData<T>
Validates parsed data against a schema:
```typescript
validateData(data: unknown, schema: z.ZodSchema<T>, context: string): T
```

## Security Features

1. **Input Validation**: All JSON inputs are validated against strict schemas
2. **Length Limits**: Enforces maximum lengths for strings and arrays
3. **Character Restrictions**: IDs and tags limited to safe characters
4. **Type Safety**: Full TypeScript type inference from schemas
5. **Error Handling**: Detailed error messages without exposing sensitive data
6. **Fallback Values**: Safe defaults for optional fields

## Usage Example

```typescript
import { safeJsonParse, projectDataSchema } from './schemas/neo4jValidation.js'

// Parse and validate project URLs
const urls = safeJsonParseArray(
  result.get('urls'), 
  urlObjectSchema, 
  'project urls'
)

// Validate complete project data
const validatedProject = validateData(
  projectData,
  projectDataSchema,
  'project creation'
)
```

## Implementation Status

✅ **Completed**:
- Project service JSON validation
- Task service JSON validation  
- Backup/restore service validation
- Config file package.json validation
- Comprehensive schema definitions

## Prevention Measures

1. **JSON Injection**: All JSON.parse operations wrapped with validation
2. **Schema Validation**: Strict schemas prevent malformed data
3. **Context Tracking**: Error messages include context for debugging
4. **Safe Defaults**: Empty arrays returned on parse failures
5. **Type Safety**: Full TypeScript integration