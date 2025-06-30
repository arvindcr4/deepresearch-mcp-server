import { logger } from '../../utils/logger.js'

/**
 * Cypher Security utilities to prevent injection attacks
 */

/**
 * Allowed relationship types as a whitelist
 * Add new relationship types here as they are defined
 */
export const ALLOWED_RELATIONSHIP_TYPES = new Set([
  'DEPENDS_ON',
  'BELONGS_TO',
  'PART_OF',
  'RELATED_TO',
  'CITES',
  'CREATED_BY',
  'ASSIGNED_TO',
  'IS_SUBTOPIC_OF',
  'ADDRESSES',
  'BELONGS_TO_DOMAIN',
  'REQUIRES',
])

/**
 * Allowed node labels as a whitelist
 */
export const ALLOWED_NODE_LABELS = new Set([
  'Project',
  'Task',
  'Knowledge',
  'User',
  'Citation',
  'TaskType',
  'Domain',
])

/**
 * Validates and escapes a node label for safe use in Cypher queries
 * @param label The label to validate
 * @returns The escaped label
 * @throws Error if the label is not in the allowed list
 */
export function escapeNodeLabel(label: string): string {
  if (!ALLOWED_NODE_LABELS.has(label)) {
    logger.error(`Attempted to use unauthorized node label: ${label}`)
    throw new Error(
      `Invalid node label: ${label}. Label must be one of: ${Array.from(ALLOWED_NODE_LABELS).join(', ')}`
    )
  }
  // Escape backticks for Neo4j
  return `\`${label.replace(/`/g, '``')}\``
}

/**
 * Validates and escapes a relationship type for safe use in Cypher queries
 * @param type The relationship type to validate
 * @returns The escaped relationship type
 * @throws Error if the type is not in the allowed list
 */
export function escapeRelationshipType(type: string): string {
  if (!ALLOWED_RELATIONSHIP_TYPES.has(type)) {
    logger.error(`Attempted to use unauthorized relationship type: ${type}`)
    throw new Error(
      `Invalid relationship type: ${type}. Type must be one of: ${Array.from(ALLOWED_RELATIONSHIP_TYPES).join(', ')}`
    )
  }
  // Escape backticks for Neo4j
  return `\`${type.replace(/`/g, '``')}\``
}

/**
 * Validates property names to ensure they don't contain injection attempts
 * @param propertyName The property name to validate
 * @returns The validated property name
 * @throws Error if the property name contains invalid characters
 */
export function validatePropertyName(propertyName: string): string {
  // Allow alphanumeric, underscore, and dash only
  const validPattern = /^[a-zA-Z0-9_-]+$/
  if (!validPattern.test(propertyName)) {
    logger.error(`Invalid property name attempted: ${propertyName}`)
    throw new Error(
      `Invalid property name: ${propertyName}. Property names must contain only letters, numbers, underscores, and dashes.`
    )
  }
  return propertyName
}

/**
 * Escapes a string value for use in regex patterns within Cypher
 * @param value The value to escape
 * @returns The escaped value safe for regex use
 */
export function escapeRegexValue(value: string): string {
  // Escape special regex characters
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Creates a safe parameter name for Cypher queries
 * @param baseName The base name for the parameter
 * @param index Optional index for uniqueness
 * @returns A safe parameter name
 */
export function createSafeParameterName(
  baseName: string,
  index?: number
): string {
  const safeName = baseName.replace(/[^a-zA-Z0-9_]/g, '_')
  return index !== undefined ? `${safeName}_${index}` : safeName
}

/**
 * Validates that a value is safe for use as a node/relationship property
 * Neo4j supports primitives and arrays of primitives
 * @param value The value to validate
 * @param propertyName The name of the property (for error messages)
 * @throws Error if the value is not a valid Neo4j property type
 */
export function validatePropertyValue(value: any, propertyName: string): void {
  const isValidPrimitive = (v: any): boolean => {
    return (
      v === null ||
      v === undefined ||
      typeof v === 'string' ||
      typeof v === 'number' ||
      typeof v === 'boolean'
    )
  }

  if (isValidPrimitive(value)) {
    return
  }

  if (Array.isArray(value)) {
    if (value.every(isValidPrimitive)) {
      return
    }
    throw new Error(
      `Property ${propertyName} contains non-primitive array elements. Neo4j only supports arrays of primitive types.`
    )
  }

  throw new Error(
    `Property ${propertyName} has invalid type ${typeof value}. Neo4j only supports primitive types and arrays of primitives.`
  )
}

/**
 * Builds a safe SET clause for updates
 * @param updates Object containing property updates
 * @param nodeAlias The alias of the node being updated
 * @param paramPrefix Prefix for parameter names
 * @returns Object with cypher SET clause and parameters
 */
export function buildSafeSetClause(
  updates: Record<string, any>,
  nodeAlias: string,
  paramPrefix: string = 'update'
): { setClauses: string[]; params: Record<string, any> } {
  const setClauses: string[] = []
  const params: Record<string, any> = {}

  Object.entries(updates).forEach(([key, value], index) => {
    if (value !== undefined) {
      const propName = validatePropertyName(key)
      validatePropertyValue(value, propName)
      const paramName = createSafeParameterName(
        `${paramPrefix}_${propName}`,
        index
      )
      setClauses.push(`${nodeAlias}.${propName} = $${paramName}`)
      params[paramName] = value
    }
  })

  return { setClauses, params }
}

/**
 * Builds a safe WHERE clause for filtering
 * @param filters Object containing filter conditions
 * @param nodeAlias The alias of the node being filtered
 * @param paramPrefix Prefix for parameter names
 * @returns Object with cypher WHERE conditions and parameters
 */
export function buildSafeWhereClause(
  filters: Record<string, any>,
  nodeAlias: string,
  paramPrefix: string = 'filter'
): { conditions: string[]; params: Record<string, any> } {
  const conditions: string[] = []
  const params: Record<string, any> = {}

  Object.entries(filters).forEach(([key, value], index) => {
    if (value !== undefined && value !== null) {
      const propName = validatePropertyName(key)
      const paramName = createSafeParameterName(
        `${paramPrefix}_${propName}`,
        index
      )

      if (Array.isArray(value)) {
        // For array values, use IN operator
        conditions.push(`${nodeAlias}.${propName} IN $${paramName}`)
        params[paramName] = value
      } else if (typeof value === 'object' && value.regex) {
        // For regex patterns
        conditions.push(`${nodeAlias}.${propName} =~ $${paramName}`)
        params[paramName] = value.regex
      } else {
        // For exact matches
        conditions.push(`${nodeAlias}.${propName} = $${paramName}`)
        params[paramName] = value
      }
    }
  })

  return { conditions, params }
}
