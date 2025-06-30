import { z } from 'zod'

// Common validation schemas
export const querySchema = z
  .string()
  .min(1, 'Query cannot be empty')
  .max(1000, 'Query cannot exceed 1000 characters')
  .trim()

export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .refine(
    (url) => {
      try {
        const parsed = new URL(url)
        return ['http:', 'https:'].includes(parsed.protocol)
      } catch {
        return false
      }
    },
    { message: 'URL must use http or https protocol' }
  )

export const maxResultsSchema = z
  .number()
  .int('Must be an integer')
  .min(1, 'Must be at least 1')
  .max(100, 'Cannot exceed 100')
  .default(10)

// OpenAI Deep Research validation schemas
export const openAIOptionsSchema = z
  .object({
    maxResults: maxResultsSchema.optional(),
    includePageContent: z.boolean().optional(),
    browsePage: urlSchema.optional(),
  })
  .strict()
  .optional()

export const openAIResearchArgsSchema = z.object({
  query: querySchema,
  options: openAIOptionsSchema,
})

// Perplexity Sonar validation schemas
export const perplexityRecencySchema = z.enum(['day', 'week', 'month', 'year'])

export const perplexityOptionsSchema = z
  .object({
    maxResults: maxResultsSchema.optional(),
    recency: perplexityRecencySchema.optional(),
  })
  .strict()
  .optional()

export const perplexitySonarArgsSchema = z.object({
  query: querySchema,
  options: perplexityOptionsSchema,
})

// Grok3 validation schemas
export const grokOptionsSchema = z
  .object({
    maxResults: maxResultsSchema.optional(),
    includePageContent: z.boolean().optional(),
    browsePage: urlSchema.optional(),
  })
  .strict()
  .optional()

export const grok3ArgsSchema = z.object({
  query: querySchema,
  options: grokOptionsSchema,
})

// Type exports
export type OpenAIResearchArgs = z.infer<typeof openAIResearchArgsSchema>
export type PerplexitySonarArgs = z.infer<typeof perplexitySonarArgsSchema>
export type Grok3Args = z.infer<typeof grok3ArgsSchema>

// Validation helper function
export function validateArgs<T>(
  schema: z.ZodSchema<T>,
  args: unknown,
  toolName: string
): T {
  try {
    return schema.parse(args)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ')
      throw new Error(`Validation failed for ${toolName}: ${issues}`)
    }
    throw error
  }
}
