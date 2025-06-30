import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { BaseErrorCode, DatabaseExportImportErrorCode } from '../../../types/errors.js';
import { createToolExample, createToolMetadata, registerTool } from '../../../types/tool.js';
import { atlasDatabaseClean } from './cleanDatabase.js';
import { AtlasDatabaseCleanSchemaShape } from './types.js';

export const registerAtlasDatabaseCleanTool = (server: McpServer) => {
  registerTool(
    server,
    "atlas_database_clean",
    "Completely resets the database - permanently removes all data from all entity types (projects, tasks, and knowledge)",
    AtlasDatabaseCleanSchemaShape,
    atlasDatabaseClean,
    createToolMetadata({
      examples: [
        createToolExample(
          { acknowledgement: true },
          `{
            "success": true,
            "message": "Database has been completely reset and schema reinitialized",
            "timestamp": "2025-03-23T13:07:55.621Z",
            "details": {
              "schemaInitialized": true
            }
          }`,
          "Reset the entire database and reinitialize the schema"
        )
      ],
      requiredPermission: "database:admin",
      returnSchema: z.object({
        success: z.boolean().describe("Operation success status"),
        message: z.string().describe("Result message"),
        timestamp: z.string().describe("Operation timestamp"),
        details: z.object({
          schemaInitialized: z.boolean().optional().describe("Schema reinitialization status"),
          deletedRelationships: z.number().optional().describe("Number of deleted relationships"),
          deletedNodes: z.number().optional().describe("Number of deleted nodes")
        }).optional().describe("Detailed operation statistics")
      }),
      rateLimit: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 1 // 1 request per hour (since this is a destructive operation)
      }
      // Warning: This operation permanently deletes ALL data from the Atlas database
    })
  );
};
