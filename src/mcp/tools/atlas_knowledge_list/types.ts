import { KnowledgeFilterOptions } from '../../../services/neo4j/types.js';
import { Neo4jKnowledge } from '../../../services/neo4j/types.js';

/**
 * Query parameters for retrieving and filtering knowledge items
 */
export interface KnowledgeListRequest {
  /** ID of the project to list knowledge items for (required) */
  projectId: string;
  
  /** Array of tags to filter by (items matching any tag will be included) */
  tags?: string[];
  
  /** Filter by knowledge domain/category */
  domain?: string;
  
  /** Text search query to filter results by content relevance */
  search?: string;
  
  /** Page number for paginated results (Default: 1) */
  page?: number;
  
  /** Number of results per page, maximum 100 (Default: 20) */
  limit?: number;
}

/**
 * Response structure for knowledge queries
 */
export interface KnowledgeListResponse {
  /** Collection of knowledge items matching search criteria */
  knowledge: KnowledgeItem[];
  
  /** Total record count matching criteria (pre-pagination) */
  total: number;
  
  /** Current pagination position */
  page: number;
  
  /** Pagination size setting */
  limit: number;
  
  /** Total available pages for the current query */
  totalPages: number;
}

/**
 * Knowledge item entity structure for API responses
 */
export interface KnowledgeItem {
  /** Neo4j internal node identifier */
  identity?: number;
  
  /** Neo4j node type designations */
  labels?: string[];
  
  /** Core knowledge item attributes */
  properties?: {
    /** Unique knowledge item identifier */
    id: string;
    
    /** Project this knowledge belongs to */
    projectId: string;
    
    /** Knowledge content */
    text: string;
    
    /** Categorical labels for organization and filtering */
    tags?: string[];
    
    /** Primary knowledge area/discipline */
    domain: string;
    
    /** Reference sources supporting this knowledge */
    citations?: string[];
    
    /** Creation timestamp (ISO format) */
    createdAt: string;
    
    /** Last modification timestamp (ISO format) */
    updatedAt: string;
  };
  
  /** Neo4j element identifier */
  elementId?: string;
  
  /** Unique knowledge item identifier */
  id: string;
  
  /** Project this knowledge belongs to */
  projectId: string;
  
  /** Knowledge content */
  text: string;
  
  /** Categorical labels for organization and filtering */
  tags?: string[];
  
  /** Primary knowledge area/discipline */
  domain: string;
  
  /** Reference sources supporting this knowledge */
  citations?: string[];
  
  /** Creation timestamp (ISO format) */
  createdAt: string;
  
  /** Last modification timestamp (ISO format) */
  updatedAt: string;
  
  /** Associated project name (for context) */
  projectName?: string;
}
