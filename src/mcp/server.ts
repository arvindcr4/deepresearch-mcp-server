#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from "../config/index.js";
import { BaseErrorCode, McpError } from "../types/errors.js";
import { logger } from "../utils/logger.js";
import { configureSecurity } from "../utils/security.js";
import { initializeNeo4jSchema } from "../services/neo4j/index.js"; // Changed import

// Import tool registrations
import { registerAtlasProjectCreateTool } from "./tools/atlas_project_create/index.js";
import { registerAtlasProjectDeleteTool } from "./tools/atlas_project_delete/index.js";
import { registerAtlasProjectListTool } from "./tools/atlas_project_list/index.js";
import { registerAtlasProjectUpdateTool } from "./tools/atlas_project_update/index.js";
import { registerAtlasTaskCreateTool } from "./tools/atlas_task_create/index.js";
import { registerAtlasTaskDeleteTool } from "./tools/atlas_task_delete/index.js";
import { registerAtlasTaskListTool } from "./tools/atlas_task_list/index.js";
import { registerAtlasTaskUpdateTool } from "./tools/atlas_task_update/index.js";
import { registerAtlasDatabaseCleanTool } from "./tools/atlas_database_clean/index.js";
import { registerAtlasKnowledgeAddTool } from "./tools/atlas_knowledge_add/index.js";
import { registerAtlasKnowledgeDeleteTool } from "./tools/atlas_knowledge_delete/index.js";
import { registerAtlasKnowledgeListTool } from "./tools/atlas_knowledge_list/index.js";
import { registerAtlasUnifiedSearchTool } from "./tools/atlas_unified_search/index.js";
import { registerAtlasDeepResearchTool } from "./tools/atlas_deep_research/index.js"; // Import the new tool registration

// Import resource registrations
import { registerMcpResources } from "./resources/index.js";

export const createMcpServer = async () => {
  try {
    // Configure security settings
    configureSecurity({
      authRequired: config.security.authRequired
    });

    // Initialize Neo4j database and services
    logger.info("Initializing Neo4j schema..."); // Updated log message
    await initializeNeo4jSchema(); // Changed function call
    logger.info("Neo4j schema initialized successfully"); // Updated log message

    const server = new McpServer({
      name: config.mcpServerName,
      version: config.mcpServerVersion,
      capabilities: {
        resources: {},
        tools: {
          // Define global tool capabilities
          requestContext: true, // Enable request context for all tools
          rateLimit: {
            windowMs: 60 * 1000, // 1 minute default window
            maxRequests: 100 // 100 requests per minute default
          },
          permissions: {
            required: config.security.authRequired // Make permissions optional based on security config
          }
        }
      }
    });

    // Register tools
    registerAtlasProjectCreateTool(server); // atlas_project_create
    registerAtlasProjectListTool(server); // atlas_project_list
    registerAtlasProjectUpdateTool(server); // atlas_project_update
    registerAtlasProjectDeleteTool(server); // atlas_project_delete
    registerAtlasTaskCreateTool(server); // atlas_task_create
    registerAtlasTaskDeleteTool(server); // atlas_task_delete
    registerAtlasTaskListTool(server); // atlas_task_list
    registerAtlasTaskUpdateTool(server); // atlas_task_update
    registerAtlasDatabaseCleanTool(server); // atlas_database_clean
    registerAtlasKnowledgeAddTool(server); // atlas_knowledge_add
    registerAtlasKnowledgeDeleteTool(server); // atlas_knowledge_delete
    registerAtlasKnowledgeListTool(server); // atlas_knowledge_list
    registerAtlasUnifiedSearchTool(server); // atlas_unified_search
    registerAtlasDeepResearchTool(server); // atlas_deep_research (Register the new tool)

    // Register resources
    registerMcpResources(server);


    // Connect using stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info("ATLAS MCP Server running on stdio", {
      name: config.mcpServerName,
      version: config.mcpServerVersion,
      authRequired: config.security.authRequired
    });

    return server;
  } catch (error) {
    // Handle initialization errors
    logger.error("Failed to initialize MCP server", {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw new McpError(
      BaseErrorCode.INTERNAL_ERROR,
      `Failed to initialize MCP server: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};
