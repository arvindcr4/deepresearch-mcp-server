import { randomUUID } from 'crypto';
import neo4j from 'neo4j-driver'; // Import the neo4j driver
import { NodeLabels } from './types.js'; // Import NodeLabels
import { Neo4jUtils } from './utils.js'; // Import Neo4jUtils

/**
 * Helper functions for the Neo4j service
 */

/**
 * Generate a unique ID string
 * @returns A unique string ID (without hyphens)
 */
export function generateId(): string {
  return randomUUID().replace(/-/g, '');
}

/**
 * Generate a timestamped ID with an optional prefix
 * @param prefix Optional prefix for the ID
 * @returns A unique ID with timestamp and random component
 */
export function generateTimestampedId(prefix?: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}

// Removed unused toNeo4jParams function

/**
 * Build a Neo4j update query dynamically based on provided fields
 * @param nodeLabel Neo4j node label
 * @param identifier Node identifier in the query (e.g., 'n')
 * @param updates Updates to apply
 * @returns Object with setClauses and params
 */
export function buildUpdateQuery(
  nodeLabel: string, // Keep nodeLabel for potential future use or context
  identifier: string,
  updates: Record<string, any>
): { setClauses: string[]; params: Record<string, any> } {
  const params: Record<string, any> = {};
  const setClauses: string[] = [];
  
  // Add update timestamp automatically
  const now = new Date().toISOString();
  params.updatedAt = now;
  setClauses.push(`${identifier}.updatedAt = $updatedAt`);
  
  // Add update clauses for each provided field in the updates object
  for (const [key, value] of Object.entries(updates)) {
    // Ensure we don't try to overwrite the id or createdAt
    if (key !== 'id' && key !== 'createdAt' && value !== undefined) {
      params[key] = value;
      setClauses.push(`${identifier}.${key} = $${key}`);
    }
  }
  
  return { setClauses, params };
}

/**
 * Interface for filter options used in buildListQuery
 */
interface ListQueryFilterOptions {
  projectId?: string; // Always required for Task/Knowledge, handled in MATCH
  status?: string | string[];
  priority?: string | string[];
  assignedTo?: string; // Requires specific MATCH clause handling
  taskType?: string;
  tags?: string[];
  domain?: string; // Requires specific MATCH clause handling
  search?: string; // Requires specific WHERE clause handling (e.g., regex or full-text)
  // Add other potential filters here
}

/**
 * Interface for pagination and sorting options used in buildListQuery
 */
interface ListQueryPaginationOptions {
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Interface for the result of buildListQuery
 */
interface ListQueryResult {
  countQuery: string;
  dataQuery: string;
  params: Record<string, any>;
}

/**
 * Builds dynamic Cypher queries for listing entities with filtering, sorting, and pagination.
 * 
 * @param label The primary node label (e.g., NodeLabels.Task, NodeLabels.Knowledge)
 * @param returnProperties An array of properties or expressions to return for the data query (e.g., ['t.id as id', 'u.name as userName'])
 * @param filters Filter options based on ListQueryFilterOptions
 * @param pagination Pagination and sorting options based on ListQueryPaginationOptions
 * @param nodeAlias Alias for the primary node in the query (default: 'n')
 * @param additionalMatchClauses Optional string containing additional MATCH or OPTIONAL MATCH clauses (e.g., for relationships like assigned user or domain)
 * @returns ListQueryResult containing the count query, data query, and parameters
 */
export function buildListQuery(
  label: NodeLabels,
  returnProperties: string[],
  filters: ListQueryFilterOptions,
  pagination: ListQueryPaginationOptions,
  nodeAlias: string = 'n',
  additionalMatchClauses: string = ''
): ListQueryResult {
  const params: Record<string, any> = {};
  let conditions: string[] = [];
  
  // --- Base MATCH Clause ---
  // projectId is handled directly in the MATCH for Task and Knowledge
  let projectIdFilter = '';
  // Only add projectId filter if it's provided and not the wildcard '*'
  if (filters.projectId && filters.projectId !== '*') { 
    projectIdFilter = `{projectId: $projectId}`;
    params.projectId = filters.projectId;
  }
  let baseMatch = `MATCH (${nodeAlias}:${label} ${projectIdFilter})`;

  // --- Additional MATCH Clauses (Relationships) ---
  // Add user-provided MATCH/OPTIONAL MATCH clauses
  const fullMatchClause = `${baseMatch}\n${additionalMatchClauses}`;

  // --- WHERE Clause Conditions ---
  // Status filter
  if (filters.status) {
    if (Array.isArray(filters.status) && filters.status.length > 0) {
      params.statusList = filters.status;
      conditions.push(`${nodeAlias}.status IN $statusList`);
    } else if (typeof filters.status === 'string') {
      params.status = filters.status;
      conditions.push(`${nodeAlias}.status = $status`);
    }
  }
  // Priority filter (assuming it applies to the primary node)
  if (filters.priority) {
     if (Array.isArray(filters.priority) && filters.priority.length > 0) {
       params.priorityList = filters.priority;
       conditions.push(`${nodeAlias}.priority IN $priorityList`);
     } else if (typeof filters.priority === 'string') {
       params.priority = filters.priority;
       conditions.push(`${nodeAlias}.priority = $priority`);
     }
  }
  // TaskType filter (assuming it applies to the primary node)
   if (filters.taskType) {
     params.taskType = filters.taskType;
     conditions.push(`${nodeAlias}.taskType = $taskType`);
   }
  // Tags filter (using helper)
  if (filters.tags && filters.tags.length > 0) {
    // Ensure Neo4jUtils is accessible or import it if helpers.ts is separate
    // Assuming Neo4jUtils is available in scope or imported
    const tagQuery = Neo4jUtils.generateArrayInListQuery(nodeAlias, 'tags', 'tagsList', filters.tags);
    if (tagQuery.cypher) {
      conditions.push(tagQuery.cypher);
      Object.assign(params, tagQuery.params);
    }
  }
  // Text search filter (Knowledge specific, using regex for now)
  if (label === NodeLabels.Knowledge && filters.search) {
    // Use case-insensitive regex
    params.search = `(?i).*${filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*`; 
    conditions.push(`${nodeAlias}.text =~ $search`);
    // TODO: Consider switching to full-text index search for performance:
    // conditions.push(`apoc.index.search('${NodeLabels.Knowledge}_fulltext', $search) YIELD node as ${nodeAlias}`);
    // This would require changing the MATCH structure significantly.
  }
  // Domain filter is handled via additionalMatchClauses typically

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // --- Sorting ---
  const sortField = pagination.sortBy || 'createdAt'; // Default sort field
  const sortDirection = pagination.sortDirection || 'desc'; // Default sort direction
  const orderByClause = `ORDER BY ${nodeAlias}.${sortField} ${sortDirection.toUpperCase()}`;

  // --- Pagination ---
  const page = Math.max(pagination.page || 1, 1);
  const limit = Math.min(Math.max(pagination.limit || 20, 1), 100);
  const skip = (page - 1) * limit;
  // Use neo4j.int() to ensure skip and limit are treated as integers
  params.skip = neo4j.int(skip);
  params.limit = neo4j.int(limit);
  const paginationClause = `SKIP $skip LIMIT $limit`;

  // --- Count Query ---
  const countQuery = `
    ${fullMatchClause}
    ${whereClause}
    RETURN count(DISTINCT ${nodeAlias}) as total
  `;

  // --- Data Query ---
  // Use WITH clause to pass distinct nodes after filtering before collecting relationships
  // This is crucial if additionalMatchClauses involve OPTIONAL MATCH that could multiply rows
  const dataQuery = `
    ${fullMatchClause}
    ${whereClause}
    WITH DISTINCT ${nodeAlias} ${additionalMatchClauses ? ', ' + additionalMatchClauses.split(' ')[1] : ''} // Pass distinct primary node and potentially relationship aliases
    ${orderByClause} // Order before skip/limit
    ${paginationClause}
    // Re-apply OPTIONAL MATCHes if needed after pagination to get related data for the paginated set
    ${additionalMatchClauses} // Re-apply OPTIONAL MATCH here if needed for RETURN
    RETURN ${returnProperties.join(',\n           ')}
  `;
  
  // Refined Data Query structure (alternative): Apply OPTIONAL MATCH *after* pagination
  // This can be more efficient if relationship data is only needed for the final page results.
  const dataQueryAlternative = `
    ${baseMatch} // Only match the primary node initially
    ${whereClause} // Apply filters on the primary node
    WITH ${nodeAlias}
    ${orderByClause}
    ${paginationClause}
    // Now apply OPTIONAL MATCHes for related data for the paginated nodes
    ${additionalMatchClauses} 
    RETURN ${returnProperties.join(',\n           ')}
  `;
  // Choosing dataQueryAlternative as it's generally more performant for pagination
  
  // Remove skip/limit from count params
  const countParams = { ...params };
  delete countParams.skip;
  delete countParams.limit;

  return {
    countQuery: countQuery,
    dataQuery: dataQueryAlternative, // Use the alternative query
    params: params // Return params including skip/limit for the data query
  };
}
