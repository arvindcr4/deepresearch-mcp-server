import { z } from "zod";
import { McpToolResponse } from '../../../types/mcp.js';
import { SearchResultItem } from "../../../services/neo4j/searchService.js";

// Schema for the tool input
export const UnifiedSearchRequestSchema = z.object({
  property: z.string().optional().describe(
    "Optional: Target a specific indexed property using Lucene syntax (e.g., 'name', 'description', 'text'). If omitted, searches across default indexed fields."
  ),
  value: z.string().describe(
    "The search term or phrase. Forms the core of the Lucene query. Special characters should be escaped unless part of intended Lucene syntax (e.g., for fuzzy search)."
  ),
  entityTypes: z.array(
    z.enum(['project', 'task', 'knowledge']) // Keep as is
  ).optional().describe(
    "Array of entity types ('project', 'task', 'knowledge') to include in search (Default: all types if omitted)"
  ),
  // caseInsensitive removed - handled by index configuration
  fuzzy: z.boolean().optional().default(false).describe(
    "Enable fuzzy matching (edit distance 1) by appending '~1' to the search term in the Lucene query (Default: false)"
  ),
  taskType: z.string().optional().describe(
    "Optional filter by project/task classification (applies to project and task types)"
  ),
  page: z.number().int().positive().optional().default(1).describe(
    "Page number for paginated results (Default: 1)"
  ),
  limit: z.number().int().positive().max(100).optional().default(20).describe(
    "Number of results per page, maximum 100 (Default: 20)"
  )
});

export type UnifiedSearchRequestInput = z.infer<typeof UnifiedSearchRequestSchema>;

export interface UnifiedSearchResponse {
  results: SearchResultItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
