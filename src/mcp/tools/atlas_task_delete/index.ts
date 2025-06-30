import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { createToolExample, createToolMetadata, registerTool } from '../../../types/tool.js';
import { atlasDeleteTask } from './deleteTask.js';
import { AtlasTaskDeleteSchemaShape } from './types.js';

export const registerAtlasTaskDeleteTool = (server: McpServer) => {
  registerTool(
    server,
    "atlas_task_delete",
    "Deletes existing task(s) from the system with support for both single task removal and bulk deletion operations",
    AtlasTaskDeleteSchemaShape,
    atlasDeleteTask,
    createToolMetadata({
      examples: [
        createToolExample(
          {
            mode: "single",
            id: "task_api_gateway"
          },
          `{
            "success": true,
            "message": "Task with ID task_api_gateway removed successfully",
            "id": "task_api_gateway"
          }`,
          "Remove a completed task from the system"
        ),
        createToolExample(
          {
            mode: "bulk",
            taskIds: ["task_graphql_schema", "task_auth", "task_old_feature"]
          },
          `{
            "success": true,
            "message": "Successfully removed 3 tasks",
            "deleted": ["task_graphql_schema", "task_auth", "task_old_feature"],
            "errors": []
          }`,
          "Clean up multiple completed or deprecated tasks in a single operation"
        )
      ],
      requiredPermission: "task:delete",
      returnSchema: z.union([
        // Single task deletion response
        z.object({
          id: z.string().describe("Task ID"),
          success: z.boolean().describe("Operation success status"),
          message: z.string().describe("Result message")
        }),
        // Bulk deletion response
        z.object({
          success: z.boolean().describe("Operation success status"),
          message: z.string().describe("Result message"),
          deleted: z.array(z.string()).describe("IDs of successfully deleted tasks"),
          errors: z.array(z.object({
            taskId: z.string().describe("Task ID that failed to delete"),
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
        maxRequests: 15 // 15 requests per minute (either single or bulk)
      }
    })
  );
};
