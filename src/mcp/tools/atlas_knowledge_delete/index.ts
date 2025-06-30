import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { createToolExample, createToolMetadata, registerTool } from '../../../types/tool.js';
import { atlasDeleteKnowledge } from './deleteKnowledge.js';
import { AtlasKnowledgeDeleteSchemaShape } from './types.js';

export const registerAtlasKnowledgeDeleteTool = (server: McpServer) => {
  registerTool(
    server,
    "atlas_knowledge_delete",
    "Deletes existing knowledge item(s) from the system with support for individual removal and batch operations",
    AtlasKnowledgeDeleteSchemaShape,
    atlasDeleteKnowledge,
    createToolMetadata({
      examples: [
        createToolExample(
          {
            mode: "single",
            id: "know_graphql_benefits"
          },
          `{
            "success": true,
            "message": "Knowledge item with ID know_graphql_benefits removed successfully",
            "id": "know_graphql_benefits"
          }`,
          "Remove a specific knowledge item from the system"
        ),
        createToolExample(
          {
            mode: "bulk",
            knowledgeIds: ["know_api_design", "know_security_best_practices", "know_deprecated_methods"]
          },
          `{
            "success": true,
            "message": "Successfully removed 3 knowledge items",
            "deleted": ["know_api_design", "know_security_best_practices", "know_deprecated_methods"],
            "errors": []
          }`,
          "Clean up multiple knowledge items in a single operation"
        )
      ],
      requiredPermission: "knowledge:delete",
      returnSchema: z.union([
        // Single knowledge deletion response
        z.object({
          id: z.string().describe("Knowledge ID"),
          success: z.boolean().describe("Operation success status"),
          message: z.string().describe("Result message")
        }),
        // Bulk deletion response
        z.object({
          success: z.boolean().describe("Operation success status"),
          message: z.string().describe("Result message"),
          deleted: z.array(z.string()).describe("IDs of successfully deleted knowledge items"),
          errors: z.array(z.object({
            knowledgeId: z.string().describe("Knowledge ID that failed to delete"),
            error: z.object({
              code: z.string().describe("Error code"),
              message: z.string().describe("Error message"),
              details: z.any().optional().describe("Additional error details")
            }).describe("Error information")
          })).describe("Deletion errors")
        })
      ]),
      rateLimit: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 10 // 10 requests per minute (either single or bulk)
      }
    })
  );
};
