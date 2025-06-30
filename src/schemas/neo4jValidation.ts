import { z } from 'zod'
import {
  RelationshipTypes,
  NodeLabels,
  ProjectDependencyType,
} from '../services/neo4j/types.js'

// ============================================
// Common Schemas
// ============================================

/**
 * Valid Neo4j ID pattern (e.g., proj_xxx, task_xxx, know_xxx)
 */
export const neo4jIdSchema = z
  .string()
  .min(1, 'ID cannot be empty')
  .max(100, 'ID cannot exceed 100 characters')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'ID can only contain alphanumeric characters, underscores, and hyphens'
  )

/**
 * ISO timestamp string validation
 */
export const timestampSchema = z
  .string()
  .datetime({ message: 'Invalid timestamp format. Must be ISO 8601' })

/**
 * URL object schema for projects and tasks
 */
export const urlObjectSchema = z.object({
  title: z
    .string()
    .min(1, 'URL title cannot be empty')
    .max(500, 'URL title cannot exceed 500 characters'),
  url: z
    .string()
    .url('Invalid URL format')
    .max(2000, 'URL cannot exceed 2000 characters'),
})

/**
 * Array of URLs validation
 */
export const urlsArraySchema = z
  .array(urlObjectSchema)
  .max(50, 'Cannot have more than 50 URLs')
  .default([])

/**
 * Tags array validation
 */
export const tagsArraySchema = z
  .array(
    z
      .string()
      .min(1, 'Tag cannot be empty')
      .max(50, 'Tag cannot exceed 50 characters')
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        'Tags can only contain alphanumeric characters, underscores, and hyphens'
      )
  )
  .max(20, 'Cannot have more than 20 tags')
  .default([])

// ============================================
// Project Schemas
// ============================================

/**
 * Project status validation
 */
export const projectStatusSchema = z.enum([
  'active',
  'pending',
  'in-progress',
  'completed',
  'archived',
])

/**
 * Project data schema (for creation/updates)
 */
export const projectDataSchema = z.object({
  id: neo4jIdSchema.optional(),
  name: z
    .string()
    .min(1, 'Project name cannot be empty')
    .max(200, 'Project name cannot exceed 200 characters'),
  description: z
    .string()
    .min(1, 'Project description cannot be empty')
    .max(5000, 'Project description cannot exceed 5000 characters'),
  status: projectStatusSchema,
  urls: urlsArraySchema,
  completionRequirements: z
    .string()
    .max(5000, 'Completion requirements cannot exceed 5000 characters'),
  outputFormat: z
    .string()
    .max(1000, 'Output format cannot exceed 1000 characters'),
  taskType: z.string().max(100, 'Task type cannot exceed 100 characters'),
})

/**
 * Complete project schema (including timestamps)
 */
export const projectSchema = projectDataSchema.extend({
  id: neo4jIdSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
})

/**
 * Project dependency type validation
 */
export const projectDependencyTypeSchema = z.nativeEnum(ProjectDependencyType)

// ============================================
// Task Schemas
// ============================================

/**
 * Task status validation
 */
export const taskStatusSchema = z.enum([
  'backlog',
  'todo',
  'in-progress',
  'completed',
])

/**
 * Task priority validation
 */
export const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'critical'])

/**
 * Task data schema (for creation/updates)
 */
export const taskDataSchema = z.object({
  id: neo4jIdSchema.optional(),
  projectId: neo4jIdSchema,
  title: z
    .string()
    .min(1, 'Task title cannot be empty')
    .max(200, 'Task title cannot exceed 200 characters'),
  description: z
    .string()
    .min(1, 'Task description cannot be empty')
    .max(5000, 'Task description cannot exceed 5000 characters'),
  priority: taskPrioritySchema,
  status: taskStatusSchema,
  assignedTo: neo4jIdSchema.optional().nullable(), // For relationship creation
  urls: urlsArraySchema,
  tags: tagsArraySchema,
  completionRequirements: z
    .string()
    .max(5000, 'Completion requirements cannot exceed 5000 characters'),
  outputFormat: z
    .string()
    .max(1000, 'Output format cannot exceed 1000 characters'),
  taskType: z.string().max(100, 'Task type cannot exceed 100 characters'),
})

/**
 * Complete task schema (including timestamps)
 */
export const taskSchema = taskDataSchema.omit({ assignedTo: true }).extend({
  id: neo4jIdSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
})

// ============================================
// Knowledge Schemas
// ============================================

/**
 * Knowledge data schema (for creation/updates)
 */
export const knowledgeDataSchema = z.object({
  id: neo4jIdSchema.optional(),
  projectId: neo4jIdSchema,
  text: z
    .string()
    .min(1, 'Knowledge text cannot be empty')
    .max(50000, 'Knowledge text cannot exceed 50000 characters'),
  tags: tagsArraySchema,
  domain: z
    .string()
    .min(1, 'Domain cannot be empty')
    .max(100, 'Domain cannot exceed 100 characters')
    .optional(),
  citations: z
    .array(
      z
        .string()
        .min(1, 'Citation cannot be empty')
        .max(1000, 'Citation cannot exceed 1000 characters')
    )
    .max(50, 'Cannot have more than 50 citations')
    .optional(),
})

/**
 * Complete knowledge schema (including timestamps)
 */
export const knowledgeSchema = knowledgeDataSchema
  .omit({ domain: true, citations: true })
  .extend({
    id: neo4jIdSchema,
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })

// ============================================
// Relationship Schemas
// ============================================

/**
 * Valid relationship types
 */
export const relationshipTypeSchema = z.nativeEnum(RelationshipTypes)

/**
 * Relationship data structure
 */
export const relationshipDataSchema = z.object({
  startNodeId: neo4jIdSchema,
  endNodeId: neo4jIdSchema,
  type: z.string().min(1).max(100),
  properties: z.record(z.any()).optional().default({}),
})

// ============================================
// Backup/Restore Schemas
// ============================================

/**
 * Full export data structure
 */
export const fullExportSchema = z.object({
  nodes: z.record(
    z.string(), // Node label
    z.array(z.record(z.any())) // Array of node properties
  ),
  relationships: z.array(relationshipDataSchema),
})

/**
 * Backup metadata schema
 */
export const backupMetadataSchema = z.object({
  version: z.string(),
  timestamp: timestampSchema,
  nodeCount: z.number().int().min(0),
  relationshipCount: z.number().int().min(0),
})

// ============================================
// JSON Parse Helpers
// ============================================

/**
 * Safely parse and validate JSON with schema
 * @param jsonString The JSON string to parse
 * @param schema The Zod schema to validate against
 * @param context Context for error messages
 * @returns Parsed and validated data
 * @throws Error with detailed validation messages
 */
export function safeJsonParse<T>(
  jsonString: string,
  schema: z.ZodSchema<T>,
  context: string
): T {
  try {
    // First, try to parse the JSON
    const parsed = JSON.parse(jsonString)

    // Then validate against schema
    return schema.parse(parsed)
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${context}: ${error.message}`)
    }

    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ')
      throw new Error(`Validation failed in ${context}: ${issues}`)
    }

    throw new Error(
      `Unexpected error in ${context}: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Safely parse JSON array with fallback
 * @param jsonString The JSON string to parse
 * @param context Context for error messages
 * @returns Parsed array or empty array on error
 */
export function safeJsonParseArray<T>(
  jsonString: string | null | undefined,
  itemSchema: z.ZodSchema<T>,
  context: string
): T[] {
  if (!jsonString) return []

  try {
    const parsed = JSON.parse(jsonString)
    const arraySchema = z.array(itemSchema)
    return arraySchema.parse(parsed)
  } catch (error) {
    // Log the error but return empty array to prevent crashes
    console.error(`Failed to parse JSON array in ${context}:`, error)
    return []
  }
}

/**
 * Validate and sanitize a parsed object
 * @param data The data to validate
 * @param schema The Zod schema to validate against
 * @param context Context for error messages
 * @returns Validated data
 * @throws Error with detailed validation messages
 */
export function validateData<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  context: string
): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ')
      throw new Error(`Validation failed in ${context}: ${issues}`)
    }
    throw error
  }
}

// ============================================
// Type Exports
// ============================================

export type ProjectData = z.infer<typeof projectDataSchema>
export type Project = z.infer<typeof projectSchema>
export type TaskData = z.infer<typeof taskDataSchema>
export type Task = z.infer<typeof taskSchema>
export type KnowledgeData = z.infer<typeof knowledgeDataSchema>
export type Knowledge = z.infer<typeof knowledgeSchema>
export type RelationshipData = z.infer<typeof relationshipDataSchema>
export type FullExport = z.infer<typeof fullExportSchema>
export type BackupMetadata = z.infer<typeof backupMetadataSchema>
