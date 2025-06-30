import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { createToolExample, createToolMetadata, registerTool } from '../../../types/tool.js';
import { atlasDeleteProject } from './deleteProject.js';
import { AtlasProjectDeleteSchemaShape } from './types.js';

export const registerAtlasProjectDeleteTool = (server: McpServer) => {
  registerTool(
    server,
    "atlas_project_delete",
    "Removes project entities and associated resources from the system with cascading deletion of linked tasks and knowledge items",
    AtlasProjectDeleteSchemaShape,
    atlasDeleteProject,
    createToolMetadata({
      examples: [
        createToolExample(
          {
            mode: "single",
            id: "proj_ms_migration"
          },
          `{
            "success": true,
            "message": "Project with ID proj_ms_migration deleted successfully",
            "id": "proj_ms_migration"
          }`,
          "Remove a completed engineering project from the system"
        ),
        createToolExample(
          {
            mode: "bulk",
            projectIds: ["proj_graphql", "proj_perf", "proj_deprecated_api"]
          },
          `{
            "success": true,
            "message": "Successfully deleted 3 projects",
            "deleted": ["proj_graphql", "proj_perf", "proj_deprecated_api"],
            "errors": []
          }`,
          "Clean up multiple completed or deprecated projects in a single atomic operation"
        )
      ],
      requiredPermission: "project:delete",
      returnSchema: z.union([
        // Single project deletion response
        z.object({
          id: z.string().describe("Project ID"),
          success: z.boolean().describe("Operation success status"),
          message: z.string().describe("Result message")
        }),
        // Bulk deletion response
        z.object({
          success: z.boolean().describe("Operation success status"),
          message: z.string().describe("Result message"),
          deleted: z.array(z.string()).describe("IDs of successfully deleted projects"),
          errors: z.array(z.object({
            projectId: z.string().describe("Project ID that failed to delete"),
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
