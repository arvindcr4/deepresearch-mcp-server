import { closeNeo4jConnection } from '../../src/services/neo4j/index.js';
import { listProjects } from '../../src/mcp/tools/atlas_project_list/listProjects.js';

describe('MCP Tools smoke test', () => {
  afterAll(async () => {
    await closeNeo4jConnection();
  });

  test('should load project list tool', () => {
    expect(listProjects).toBeDefined();
    expect(typeof listProjects).toBe('function');
  });

  test('should execute project list tool with basic request', async () => {
    const request = {
      mode: 'all' as const,
      responseFormat: 'formatted' as const
    };

    const result = await listProjects(request);
    expect(result).toBeDefined();
    expect(result.projects).toBeDefined();
    expect(Array.isArray(result.projects)).toBe(true);
    expect(typeof result.total).toBe('number');
    expect(typeof result.page).toBe('number');
    expect(typeof result.limit).toBe('number');
    expect(typeof result.totalPages).toBe('number');
  });

  test('should handle empty project list gracefully', async () => {
    const request = {
      mode: 'all' as const,
      responseFormat: 'formatted' as const,
      page: 1,
      limit: 5
    };

    const result = await listProjects(request);
    expect(result).toBeDefined();
    expect(result.projects).toBeDefined();
    expect(Array.isArray(result.projects)).toBe(true);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(5);
  });
});