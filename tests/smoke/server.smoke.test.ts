import { createMcpServer } from '../../src/mcp/server.js';
import { closeNeo4jConnection } from '../../src/services/neo4j/index.js';

describe('MCP Server smoke test', () => {
  let server: Awaited<ReturnType<typeof createMcpServer>> | undefined;

  afterAll(async () => {
    if (server) {
      await server.close();
    }
    await closeNeo4jConnection();
  });

  test('should create MCP server instance', async () => {
    server = await createMcpServer();
    expect(server).toBeDefined();
  }, 15000);

  test('should have proper server capabilities', async () => {
    if (!server) {
      server = await createMcpServer();
    }
    
    // Test that server is properly configured
    expect(server).toHaveProperty('name');
    expect(server).toHaveProperty('version');
  });

  test('should handle server shutdown gracefully', async () => {
    if (!server) {
      server = await createMcpServer();
    }

    // This should not throw an error
    await expect(server.close()).resolves.not.toThrow();
    server = undefined;
  });
});