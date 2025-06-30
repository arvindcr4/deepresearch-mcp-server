/**
 * Common type definitions for the Neo4j service
 */


/**
 * Neo4j entity base interface
 * Common properties for all Neo4j entities
 */
export interface Neo4jEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Project entity in Neo4j
 */
export interface Neo4jProject extends Neo4jEntity {
  name: string;
  description: string;
  status: string; // Allow any status value from ProjectStatus
  urls?: Array<{ title: string; url: string }>;
  completionRequirements: string;
  outputFormat: string;
  taskType: string;
}

/**
 * Task entity in Neo4j
 */
export interface Neo4jTask extends Neo4jEntity {
  projectId: string;
  title: string;
  description: string;
  priority: string; // Allow any priority value from PriorityLevel
  status: string; // Allow any status value from TaskStatus
  // assignedTo is now represented by the ASSIGNED_TO relationship
  urls?: Array<{ title: string; url: string }>;
  tags?: string[];
  completionRequirements: string;
  outputFormat: string;
  taskType: string;
}

/**
 * Knowledge entity in Neo4j
 */
export interface Neo4jKnowledge extends Neo4jEntity {
  projectId: string;
  text: string;
  tags?: string[];
  // domain is now represented by the BELONGS_TO_DOMAIN relationship
  // citations are now represented by the CITES relationship
}

/**
 * User entity in Neo4j
 */
export interface Neo4jUser extends Neo4jEntity {
  username: string;
  displayName: string;
  email?: string;
}

/**
 * TaskType entity in Neo4j
 */
export interface Neo4jTaskType {
  name: string;
  description?: string;
}

/**
 * Domain entity in Neo4j
 */
export interface Neo4jDomain {
  name: string;
  description?: string;
}

/**
 * Citation entity in Neo4j
 */
export interface Neo4jCitation extends Neo4jEntity {
  source: string;
  title?: string;
  author?: string;
  date?: string;
}

/**
 * Relationship types used in the Neo4j database
 */
export enum RelationshipTypes {
  CONTAINS_TASK = 'CONTAINS_TASK',
  CONTAINS_KNOWLEDGE = 'CONTAINS_KNOWLEDGE',
  DEPENDS_ON = 'DEPENDS_ON',
  ASSIGNED_TO = 'ASSIGNED_TO',
  CITES = 'CITES',
  RELATED_TO = 'RELATED_TO',
  HAS_TYPE = 'HAS_TYPE',
  BELONGS_TO_DOMAIN = 'BELONGS_TO_DOMAIN',
  BELONGS_TO_PROJECT = 'BELONGS_TO_PROJECT'
}

/**
 * Node labels used in the Neo4j database
 */
export enum NodeLabels {
  Project = 'Project',
  Task = 'Task',
  Knowledge = 'Knowledge',
  User = 'User',
  TaskType = 'TaskType',
  Domain = 'Domain',
  Citation = 'Citation'
}

/**
 * Pagination options for querying Neo4j
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
}

/**
 * Result with pagination metadata
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Filter options for Project queries
 */
export interface ProjectFilterOptions extends PaginationOptions {
  status?: 'active' | 'pending' | 'in-progress' | 'completed' | 'archived' | ('active' | 'pending' | 'in-progress' | 'completed' | 'archived')[];
  taskType?: string;
  searchTerm?: string;
}

/**
 * Filter options for Task queries
 */
export interface TaskFilterOptions extends PaginationOptions {
  projectId: string;
  status?: 'backlog' | 'todo' | 'in-progress' | 'completed' | ('backlog' | 'todo' | 'in-progress' | 'completed')[];
  priority?: 'low' | 'medium' | 'high' | 'critical' | ('low' | 'medium' | 'high' | 'critical')[];
  assignedTo?: string; // Filter by user ID (queries relationship)
  tags?: string[];
  taskType?: string;
  sortBy?: 'priority' | 'createdAt' | 'status';
  sortDirection?: 'asc' | 'desc';
}

/**
 * Filter options for Knowledge queries
 */
export interface KnowledgeFilterOptions extends PaginationOptions {
  projectId: string;
  tags?: string[];
  domain?: string; // Filter by domain name (queries relationship)
  search?: string; // Keep search for text content
}

/**
 * Specific types for project dependencies stored within the DEPENDS_ON relationship properties.
 */
export enum ProjectDependencyType {
  REQUIRES = 'requires',
  EXTENDS = 'extends',
  IMPLEMENTS = 'implements',
  REFERENCES = 'references'
}

/**
 * Project dependency relationship type
 */
export interface ProjectDependency {
  sourceProjectId: string;
  targetProjectId: string;
  type: ProjectDependencyType; // Use the enum
  description: string;
}

/**
 * Search options for unified search
 */
export interface SearchOptions extends PaginationOptions {
  property?: string;
  value: string;
  entityTypes?: ('project' | 'task' | 'knowledge')[];
  caseInsensitive?: boolean;
  fuzzy?: boolean;
  taskType?: string;
}
