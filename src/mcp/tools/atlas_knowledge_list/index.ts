import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ResponseFormat, createResponseFormatEnum, createToolResponse } from "../../../types/mcp.js";
import { createToolExample, createToolMetadata, registerTool } from "../../../types/tool.js";
import { listKnowledge } from "./listKnowledge.js";
import { formatKnowledgeListResponse } from "./responseFormat.js";
import { KnowledgeListRequest } from "./types.js"; // Corrected import name

/**
 * Registers the atlas_knowledge_list tool with the MCP server
 * 
 * @param server The MCP server instance
 */
export function registerAtlasKnowledgeListTool(server: McpServer): void {
  registerTool(
    server,
    "atlas_knowledge_list",
    "Lists knowledge items according to specified filters with tag-based categorization, domain filtering, and full-text search capabilities",
    {
      projectId: z.string()
        .describe('ID of the project to list knowledge items for (required)'),
      tags: z.array(z.string()).optional()
        .describe('Array of tags to filter by (items matching any tag will be included)'),
      domain: z.string().optional()
        .describe('Filter by knowledge domain/category'),
      search: z.string().optional()
        .describe('Text search query to filter results by content relevance'),
      page: z.number().min(1).optional().default(1)
        .describe('Page number for paginated results (Default: 1)'),
      limit: z.number().min(1).max(100).optional().default(20)
        .describe('Number of results per page, maximum 100 (Default: 20)'),
      responseFormat: createResponseFormatEnum().optional().default(ResponseFormat.FORMATTED).describe(
        "Desired response format: 'formatted' (default string) or 'json' (raw object)"
      ),
    },
    async (input, context) => {
      // Process knowledge list request
      const validatedInput = input as unknown as KnowledgeListRequest & { responseFormat?: ResponseFormat }; // Corrected type cast
      const result = await listKnowledge(validatedInput);

      // Conditionally format response
      if (validatedInput.responseFormat === ResponseFormat.JSON) {
        return createToolResponse(JSON.stringify(result, null, 2));
      } else {
        // Return the result using the formatter for rich display
        return formatKnowledgeListResponse(result, false);
      }
    },
    createToolMetadata({
      examples: [
        createToolExample(
          {
            projectId: "proj_ms_migration",
            limit: 5
          },
          `{
            "knowledge": [
              {
                "id": "know_saga_pattern",
                "projectId": "proj_ms_migration",
                "projectName": "Microservice Architecture Migration",
                "text": "Distributed transactions must use Saga pattern with compensating actions to maintain data integrity across services",
                "tags": ["architecture", "data-integrity", "patterns"],
                "domain": "technical",
                "citations": ["https://microservices.io/patterns/data/saga.html"],
                "createdAt": "2025-03-23T11:22:14.789Z",
                "updatedAt": "2025-03-23T11:22:14.789Z"
              },
              {
                "id": "know_rate_limiting",
                "projectId": "proj_ms_migration",
                "projectName": "Microservice Architecture Migration",
                "text": "Rate limiting should be implemented at the API Gateway level using Redis-based token bucket algorithm",
                "tags": ["api-gateway", "performance", "security"],
                "domain": "technical",
                "citations": ["https://www.nginx.com/blog/rate-limiting-nginx/"],
                "createdAt": "2025-03-23T12:34:27.456Z",
                "updatedAt": "2025-03-23T12:34:27.456Z"
              }
            ],
            "total": 2,
            "page": 1,
            "limit": 5,
            "totalPages": 1
          }`,
          "Retrieve all knowledge items for a specific project"
        ),
        createToolExample(
          {
            projectId: "proj_ms_migration",
            domain: "technical",
            tags: ["security"]
          },
          `{
            "knowledge": [
              {
                "id": "know_rate_limiting",
                "projectId": "proj_ms_migration",
                "projectName": "Microservice Architecture Migration",
                "text": "Rate limiting should be implemented at the API Gateway level using Redis-based token bucket algorithm",
                "tags": ["api-gateway", "performance", "security"],
                "domain": "technical",
                "citations": ["https://www.nginx.com/blog/rate-limiting-nginx/"],
                "createdAt": "2025-03-23T12:34:27.456Z",
                "updatedAt": "2025-03-23T12:34:27.456Z"
              }
            ],
            "total": 1,
            "page": 1,
            "limit": 20,
            "totalPages": 1
          }`,
          "Filter knowledge items by domain and tags"
        ),
        createToolExample(
          {
            projectId: "proj_ms_migration",
            search: "data integrity"
          },
          `{
            "knowledge": [
              {
                "id": "know_saga_pattern",
                "projectId": "proj_ms_migration",
                "projectName": "Microservice Architecture Migration",
                "text": "Distributed transactions must use Saga pattern with compensating actions to maintain data integrity across services",
                "tags": ["architecture", "data-integrity", "patterns"],
                "domain": "technical",
                "citations": ["https://microservices.io/patterns/data/saga.html"],
                "createdAt": "2025-03-23T11:22:14.789Z",
                "updatedAt": "2025-03-23T11:22:14.789Z"
              }
            ],
            "total": 1,
            "page": 1,
            "limit": 20,
            "totalPages": 1
          }`,
          "Search knowledge items for specific text content"
        )
      ],
      requiredPermission: "knowledge:read",
      entityType: 'knowledge',
      returnSchema: z.object({
        knowledge: z.array(z.object({
          id: z.string().describe("Knowledge ID"),
          projectId: z.string().describe("Project ID"),
          projectName: z.string().optional().describe("Project name"),
          text: z.string().describe("Knowledge content"),
          tags: z.array(z.string()).optional().describe("Categorical labels"),
          domain: z.string().describe("Knowledge domain/category"),
          citations: z.array(z.string()).optional().describe("Reference sources"),
          createdAt: z.string().describe("Creation timestamp"),
          updatedAt: z.string().describe("Last update timestamp")
        })),
        total: z.number().describe("Total number of knowledge items matching criteria"),
        page: z.number().describe("Current page number"),
        limit: z.number().describe("Number of items per page"),
        totalPages: z.number().describe("Total number of pages")
      }),
      rateLimit: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 30 // 30 requests per minute
      }
    })
  );
}
