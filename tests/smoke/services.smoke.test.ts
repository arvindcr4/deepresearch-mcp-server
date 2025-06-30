import { ProjectService, closeNeo4jConnection } from '../../src/services/neo4j/index.js';

describe('Services smoke test', () => {
  afterAll(async () => {
    await closeNeo4jConnection();
  });

  test('should have ProjectService static methods', () => {
    expect(ProjectService).toBeDefined();
    expect(typeof ProjectService.getProjects).toBe('function');
    expect(typeof ProjectService.getProjectById).toBe('function');
    expect(typeof ProjectService.createProject).toBe('function');
    expect(typeof ProjectService.updateProject).toBe('function');
    expect(typeof ProjectService.deleteProject).toBe('function');
  });

  test('should execute basic project service operations', async () => {
    // This should not throw and should return a paginated result
    const projects = await ProjectService.getProjects();
    expect(projects).toBeDefined();
    expect(projects.data).toBeDefined();
    expect(Array.isArray(projects.data)).toBe(true);
    expect(typeof projects.total).toBe('number');
    expect(typeof projects.page).toBe('number');
    expect(typeof projects.limit).toBe('number');
    expect(typeof projects.totalPages).toBe('number');
  });

  test('should handle project service pagination', async () => {
    const options = { page: 1, limit: 5 };
    const projects = await ProjectService.getProjects(options);
    
    expect(projects.page).toBe(1);
    expect(projects.limit).toBe(5);
    expect(projects.data.length).toBeLessThanOrEqual(5);
  });

  test('should handle project by id lookup for non-existent project', async () => {
    const project = await ProjectService.getProjectById('non-existent-id');
    expect(project).toBeNull();
  });
});