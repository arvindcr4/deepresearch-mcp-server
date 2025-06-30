import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerProjectResources } from "./projects/projectResources.js";
import { registerTaskResources } from "./tasks/taskResources.js";
import { registerKnowledgeResources } from "./knowledge/knowledgeResources.js";

/**
 * Register all Atlas MCP resources
 * 
 * This function registers all resources available in the Atlas MCP server:
 * - Projects
 * - Tasks
 * - Knowledge
 * 
 * @param server The MCP server instance
 */
export function registerMcpResources(server: McpServer) {
  // Register project resources
  registerProjectResources(server);
  
  // Register task resources
  registerTaskResources(server);
  
  // Register knowledge resources
  registerKnowledgeResources(server);
}
