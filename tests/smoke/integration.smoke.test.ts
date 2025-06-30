import { ProjectService, closeNeo4jConnection } from '../../src/services/neo4j/index.js';
import { listProjects } from '../../src/mcp/tools/atlas_project_list/listProjects.js';

describe('Integration smoke test', () => {
  const testProjectName = `Smoke Test Project ${Date.now()}`;
  let createdProjectId: string | null = null;

  afterAll(async () => {
    // Clean up test project if it was created
    if (createdProjectId) {
      try {
        await ProjectService.deleteProject(createdProjectId);
      } catch (error) {
        console.warn('Failed to clean up test project:', error);
      }
    }
    await closeNeo4jConnection();
  });

  test('should create a project and retrieve it via service', async () => {
    const projectData = {
      name: testProjectName,
      description: 'A test project created during smoke testing',
      status: 'active' as const,
      urls: [],
      completionRequirements: 'Should be created and retrieved successfully',
      outputFormat: 'structured',
      taskType: 'verification'
    };

    // Create project
    const createdProject = await ProjectService.createProject(projectData);
    expect(createdProject).toBeDefined();
    expect(createdProject.id).toBeDefined();
    expect(createdProject.name).toBe(testProjectName);
    
    createdProjectId = createdProject.id;

    // Retrieve project by ID
    const retrievedProject = await ProjectService.getProjectById(createdProject.id);
    expect(retrievedProject).toBeDefined();
    expect(retrievedProject!.id).toBe(createdProject.id);
    expect(retrievedProject!.name).toBe(testProjectName);
  });

  test('should list projects including the created test project', async () => {
    if (!createdProjectId) {
      throw new Error('No test project was created in previous test');
    }

    // List projects using the MCP tool
    const request = {
      mode: 'all' as const,
      responseFormat: 'formatted' as const
    };

    const result = await listProjects(request);
    expect(result).toBeDefined();
    expect(result.projects).toBeDefined();
    expect(Array.isArray(result.projects)).toBe(true);
    
    // Should find our test project
    const testProject = result.projects.find(p => p.id === createdProjectId);
    expect(testProject).toBeDefined();
    expect(testProject!.name).toBe(testProjectName);
  });

  test('should update the test project', async () => {
    if (!createdProjectId) {
      throw new Error('No test project was created in previous test');
    }

    const updates = {
      description: 'Updated description for smoke test',
      status: 'active' as const
    };

    const updatedProject = await ProjectService.updateProject(createdProjectId, updates);
    expect(updatedProject).toBeDefined();
    expect(updatedProject.id).toBe(createdProjectId);
    expect(updatedProject.description).toBe(updates.description);
  });

  test('should clean up by deleting the test project', async () => {
    if (!createdProjectId) {
      throw new Error('No test project was created in previous test');
    }

    const deleted = await ProjectService.deleteProject(createdProjectId);
    expect(deleted).toBe(true);

    // Verify it's gone
    const retrievedProject = await ProjectService.getProjectById(createdProjectId);
    expect(retrievedProject).toBeNull();
    
    // Clear the ID so afterAll doesn't try to delete it again
    createdProjectId = null;
  });
});