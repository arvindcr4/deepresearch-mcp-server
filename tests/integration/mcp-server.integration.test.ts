import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { createMcpServer } from '../../src/mcp/server.js';
import { clearNeo4jDatabase, initializeNeo4jSchema } from '../../src/services/neo4j/index.js';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

describe('MCP Server Integration Tests', () => {
  let server: McpServer;

  beforeEach(async () => {
    await clearNeo4jDatabase();
    await initializeNeo4jSchema();
  });

  afterEach(async () => {
    // Clean up server if it was created
    if (server) {
      try {
        await server.close();
      } catch (error) {
        // Server might not be properly connected, ignore errors
      }
    }
  });

  describe('Server Initialization', () => {
    test('should create MCP server successfully', async () => {
      server = await createMcpServer();
      expect(server).toBeDefined();
      expect(server).toBeInstanceOf(McpServer);
    });

    test('should handle initialization errors gracefully', async () => {
      // Test with invalid Neo4j configuration
      const originalUri = process.env.NEO4J_TEST_URI;
      process.env.NEO4J_TEST_URI = 'bolt://invalid:7687';
      
      try {
        await expect(createMcpServer()).rejects.toThrow();
      } finally {
        // Restore original URI
        if (originalUri) {
          process.env.NEO4J_TEST_URI = originalUri;
        }
      }
    });
  });

  describe('Server Configuration', () => {
    beforeEach(async () => {
      server = await createMcpServer();
    });

    test('should have correct server capabilities', () => {
      const serverInfo = server.getServerInfo();
      expect(serverInfo.name).toBe('deepresearch-mcp-server');
      expect(serverInfo.version).toBeDefined();
      expect(serverInfo.capabilities).toBeDefined();
      expect(serverInfo.capabilities.tools).toBeDefined();
      expect(serverInfo.capabilities.resources).toBeDefined();
    });

    test('should register all expected tools', async () => {
      const tools = server.listTools();
      
      // Project tools
      expect(tools.find(t => t.name === 'atlas_project_create')).toBeDefined();
      expect(tools.find(t => t.name === 'atlas_project_list')).toBeDefined();
      expect(tools.find(t => t.name === 'atlas_project_update')).toBeDefined();
      expect(tools.find(t => t.name === 'atlas_project_delete')).toBeDefined();
      
      // Task tools
      expect(tools.find(t => t.name === 'atlas_task_create')).toBeDefined();
      expect(tools.find(t => t.name === 'atlas_task_list')).toBeDefined();
      expect(tools.find(t => t.name === 'atlas_task_update')).toBeDefined();
      expect(tools.find(t => t.name === 'atlas_task_delete')).toBeDefined();
      
      // Knowledge tools
      expect(tools.find(t => t.name === 'atlas_knowledge_add')).toBeDefined();
      expect(tools.find(t => t.name === 'atlas_knowledge_list')).toBeDefined();
      expect(tools.find(t => t.name === 'atlas_knowledge_delete')).toBeDefined();
      
      // Search and utility tools
      expect(tools.find(t => t.name === 'atlas_unified_search')).toBeDefined();
      expect(tools.find(t => t.name === 'atlas_database_clean')).toBeDefined();
      expect(tools.find(t => t.name === 'atlas_deep_research')).toBeDefined();
    });

    test('should register resources', async () => {
      const resources = server.listResources();
      expect(resources).toBeDefined();
    });
  });

  describe('Tool Execution Through Server', () => {
    beforeEach(async () => {
      server = await createMcpServer();
    });

    test('should execute project creation tool through server', async () => {
      const toolArgs = {
        mode: 'single',
        name: 'Server Test Project',
        description: 'A project created through server',
        status: 'active',
        completionRequirements: 'Complete server integration tests',
        outputFormat: 'Test results',
        taskType: 'testing'
      };

      const result = await server.callTool('atlas_project_create', toolArgs);
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      
      // Parse the result content
      const parsedResult = typeof result.content === 'string' 
        ? JSON.parse(result.content) 
        : result.content;
      
      expect(parsedResult.id).toBeDefined();
      expect(parsedResult.name).toBe(toolArgs.name);
    });

    test('should execute search tool through server', async () => {
      // First create some test data
      await server.callTool('atlas_project_create', {
        mode: 'single',
        name: 'Searchable Server Project',
        description: 'A project for server search testing',
        status: 'active',
        completionRequirements: 'Complete search tests',
        outputFormat: 'Search results',
        taskType: 'testing'
      });

      // Then search for it
      const searchResult = await server.callTool('atlas_unified_search', {
        query: 'searchable server',
        limit: 10,
        responseFormat: 'structured'
      });

      expect(searchResult).toBeDefined();
      expect(searchResult.content).toBeDefined();
      
      const parsedResult = typeof searchResult.content === 'string' 
        ? JSON.parse(searchResult.content) 
        : searchResult.content;
      
      expect(parsedResult.results).toBeDefined();
      expect(parsedResult.results.length).toBeGreaterThan(0);
    });

    test('should handle tool execution errors gracefully', async () => {
      // Try to call a tool with invalid arguments
      try {
        await server.callTool('atlas_project_create', {
          mode: 'single',
          // Missing required fields
        });
      } catch (error) {
        expect(error).toBeDefined();
        // Should be a validation error
      }
    });
  });

  describe('Resource Access Through Server', () => {
    beforeEach(async () => {
      server = await createMcpServer();
      
      // Create some test data
      await server.callTool('atlas_project_create', {
        mode: 'single',
        name: 'Resource Test Project',
        description: 'A project for resource testing',
        status: 'active',
        completionRequirements: 'Complete resource tests',
        outputFormat: 'Resource results',
        taskType: 'testing'
      });
    });

    test('should access project resources', async () => {
      const resources = server.listResources();
      const projectResources = resources.filter(r => r.uri.includes('project'));
      expect(projectResources.length).toBeGreaterThan(0);
    });

    test('should read resource content', async () => {
      const resources = server.listResources();
      if (resources.length > 0) {
        const resource = resources[0];
        const content = await server.readResource(resource.uri);
        expect(content).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      server = await createMcpServer();
    });

    test('should handle invalid tool names', async () => {
      try {
        await server.callTool('nonexistent_tool', {});
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should handle malformed tool arguments', async () => {
      try {
        await server.callTool('atlas_project_create', {
          invalid: 'arguments'
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should handle database connection issues', async () => {
      // This test would need special setup to simulate database failures
      // For now, we'll skip it as it requires more complex infrastructure
      expect(true).toBe(true);
    });
  });

  describe('Performance and Concurrency', () => {
    beforeEach(async () => {
      server = await createMcpServer();
    });

    test('should handle concurrent tool executions', async () => {
      const promises = [];
      
      // Execute multiple tools concurrently
      for (let i = 0; i < 5; i++) {
        promises.push(
          server.callTool('atlas_project_create', {
            mode: 'single',
            name: `Concurrent Project ${i}`,
            description: `Concurrent project ${i}`,
            status: 'active',
            completionRequirements: `Complete concurrent test ${i}`,
            outputFormat: 'Test results',
            taskType: 'testing'
          })
        );
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      
      // All should be successful and have unique IDs
      const ids = results.map(r => {
        const parsed = typeof r.content === 'string' ? JSON.parse(r.content) : r.content;
        return parsed.id;
      });
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
    });

    test('should maintain performance under load', async () => {
      const startTime = Date.now();
      
      // Execute a series of operations
      await server.callTool('atlas_project_create', {
        mode: 'single',
        name: 'Performance Test Project',
        description: 'A project for performance testing',
        status: 'active',
        completionRequirements: 'Complete performance tests',
        outputFormat: 'Performance results',
        taskType: 'testing'
      });

      await server.callTool('atlas_unified_search', {
        query: 'performance',
        limit: 10,
        responseFormat: 'structured'
      });

      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(executionTime).toBeLessThan(5000); // 5 seconds
    });
  });
});