import { describe, test, expect, beforeEach } from '@jest/globals';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { clearNeo4jDatabase, initializeNeo4jSchema } from '../../src/services/neo4j/index.js';

// Import tool functions
import { atlasCreateProject } from '../../src/mcp/tools/atlas_project_create/createProject.js';
import { atlasListProjects } from '../../src/mcp/tools/atlas_project_list/listProjects.js';
import { atlasUpdateProject } from '../../src/mcp/tools/atlas_project_update/updateProject.js';
import { atlasDeleteProject } from '../../src/mcp/tools/atlas_project_delete/deleteProject.js';
import { atlasCreateTask } from '../../src/mcp/tools/atlas_task_create/createTask.js';
import { atlasListTasks } from '../../src/mcp/tools/atlas_task_list/listTasks.js';
import { atlasUpdateTask } from '../../src/mcp/tools/atlas_task_update/updateTask.js';
import { atlasDeleteTask } from '../../src/mcp/tools/atlas_task_delete/deleteTask.js';
import { atlasAddKnowledge } from '../../src/mcp/tools/atlas_knowledge_add/addKnowledge.js';
import { atlasListKnowledge } from '../../src/mcp/tools/atlas_knowledge_list/listKnowledge.js';
import { atlasDeleteKnowledge } from '../../src/mcp/tools/atlas_knowledge_delete/deleteKnowledge.js';
import { atlasUnifiedSearch } from '../../src/mcp/tools/atlas_unified_search/unifiedSearch.js';

describe('MCP Tools Integration Tests', () => {
  beforeEach(async () => {
    await clearNeo4jDatabase();
    await initializeNeo4jSchema();
  });

  describe('Project Management Tools', () => {
    test('atlas_project_create - should create single project', async () => {
      const input = {
        mode: 'single' as const,
        name: 'MCP Test Project',
        description: 'A project created via MCP tool',
        status: 'active' as const,
        completionRequirements: 'Complete MCP integration tests',
        outputFormat: 'Test results and documentation',
        taskType: 'testing'
      };

      const result = await atlasCreateProject(input);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(input.name);
      expect(result.status).toBe(input.status);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    test('atlas_project_create - should create multiple projects in bulk', async () => {
      const input = {
        mode: 'bulk' as const,
        projects: [
          {
            name: 'Bulk Project 1',
            description: 'First bulk project',
            status: 'active' as const,
            completionRequirements: 'Complete bulk test 1',
            outputFormat: 'Results 1',
            taskType: 'testing'
          },
          {
            name: 'Bulk Project 2',
            description: 'Second bulk project',
            status: 'pending' as const,
            completionRequirements: 'Complete bulk test 2',
            outputFormat: 'Results 2',
            taskType: 'analysis'
          }
        ]
      };

      const result = await atlasCreateProject(input);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.created).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.created[0].name).toBe('Bulk Project 1');
      expect(result.created[1].name).toBe('Bulk Project 2');
    });

    test('atlas_project_list - should list all projects', async () => {
      // Create test projects
      await atlasCreateProject({
        mode: 'single' as const,
        name: 'Project 1',
        description: 'First project',
        status: 'active' as const,
        completionRequirements: 'Complete project 1',
        outputFormat: 'Results 1',
        taskType: 'testing'
      });

      await atlasCreateProject({
        mode: 'single' as const,
        name: 'Project 2',
        description: 'Second project',
        status: 'completed' as const,
        completionRequirements: 'Complete project 2',
        outputFormat: 'Results 2',
        taskType: 'analysis'
      });

      const result = await atlasListProjects({
        mode: 'all' as const,
        responseFormat: 'structured' as const
      });

      expect(result).toBeDefined();
      expect(result.projects).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(result.projects.map(p => p.name)).toContain('Project 1');
      expect(result.projects.map(p => p.name)).toContain('Project 2');
    });

    test('atlas_project_update - should update project', async () => {
      const project = await atlasCreateProject({
        mode: 'single' as const,
        name: 'Original Project',
        description: 'Original description',
        status: 'active' as const,
        completionRequirements: 'Original requirements',
        outputFormat: 'Original format',
        taskType: 'testing'
      });

      const result = await atlasUpdateProject({
        mode: 'single' as const,
        id: project.id,
        updates: {
          name: 'Updated Project',
          description: 'Updated description',
          status: 'completed' as const
        }
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Updated Project');
      expect(result.description).toBe('Updated description');
      expect(result.status).toBe('completed');
    });

    test('atlas_project_delete - should delete project', async () => {
      const project = await atlasCreateProject({
        mode: 'single' as const,
        name: 'Project to Delete',
        description: 'This project will be deleted',
        status: 'active' as const,
        completionRequirements: 'To be deleted',
        outputFormat: 'N/A',
        taskType: 'testing'
      });

      const result = await atlasDeleteProject({
        mode: 'single' as const,
        id: project.id
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted successfully');

      // Verify project is deleted
      const listResult = await atlasListProjects({
        mode: 'all' as const,
        responseFormat: 'structured' as const
      });
      expect(listResult.projects.find(p => p.id === project.id)).toBeUndefined();
    });
  });

  describe('Task Management Tools', () => {
    let testProjectId: string;

    beforeEach(async () => {
      const project = await atlasCreateProject({
        mode: 'single' as const,
        name: 'Task Test Project',
        description: 'Project for testing tasks',
        status: 'active' as const,
        completionRequirements: 'Complete task tests',
        outputFormat: 'Task test results',
        taskType: 'testing'
      });
      testProjectId = project.id;
    });

    test('atlas_task_create - should create single task', async () => {
      const input = {
        mode: 'single' as const,
        title: 'MCP Test Task',
        description: 'A task created via MCP tool',
        status: 'active' as const,
        priority: 'medium' as const,
        taskType: 'testing',
        projectId: testProjectId,
        completionRequirements: 'Complete MCP task tests'
      };

      const result = await atlasCreateTask(input);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.title).toBe(input.title);
      expect(result.projectId).toBe(testProjectId);
      expect(result.createdAt).toBeDefined();
    });

    test('atlas_task_list - should list tasks', async () => {
      // Create test tasks
      await atlasCreateTask({
        mode: 'single' as const,
        title: 'Task 1',
        description: 'First task',
        status: 'active' as const,
        priority: 'high' as const,
        taskType: 'implementation',
        projectId: testProjectId,
        completionRequirements: 'Complete task 1'
      });

      await atlasCreateTask({
        mode: 'single' as const,
        title: 'Task 2',
        description: 'Second task',
        status: 'pending' as const,
        priority: 'low' as const,
        taskType: 'analysis',
        projectId: testProjectId,
        completionRequirements: 'Complete task 2'
      });

      const result = await atlasListTasks({
        mode: 'by-project' as const,
        projectId: testProjectId,
        responseFormat: 'structured' as const
      });

      expect(result).toBeDefined();
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks.map(t => t.title)).toContain('Task 1');
      expect(result.tasks.map(t => t.title)).toContain('Task 2');
    });
  });

  describe('Knowledge Management Tools', () => {
    test('atlas_knowledge_add - should add knowledge', async () => {
      const input = {
        mode: 'single' as const,
        title: 'MCP Test Knowledge',
        description: 'Knowledge added via MCP tool',
        content: 'This is test knowledge content for MCP integration testing',
        tags: ['mcp', 'test', 'integration'],
        metadata: {
          source: 'mcp-integration-test',
          confidence: 'high'
        }
      };

      const result = await atlasAddKnowledge(input);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.title).toBe(input.title);
      expect(result.tags).toEqual(input.tags);
      expect(result.createdAt).toBeDefined();
    });

    test('atlas_knowledge_list - should list knowledge', async () => {
      // Create test knowledge
      await atlasAddKnowledge({
        mode: 'single' as const,
        title: 'Knowledge 1',
        description: 'First knowledge item',
        content: 'Content 1',
        tags: ['tag1'],
        metadata: { source: 'test' }
      });

      await atlasAddKnowledge({
        mode: 'single' as const,
        title: 'Knowledge 2',
        description: 'Second knowledge item',
        content: 'Content 2',
        tags: ['tag2'],
        metadata: { source: 'test' }
      });

      const result = await atlasListKnowledge({
        mode: 'all' as const,
        responseFormat: 'structured' as const
      });

      expect(result).toBeDefined();
      expect(result.knowledge).toHaveLength(2);
      expect(result.knowledge.map(k => k.title)).toContain('Knowledge 1');
      expect(result.knowledge.map(k => k.title)).toContain('Knowledge 2');
    });

    test('atlas_knowledge_delete - should delete knowledge', async () => {
      const knowledge = await atlasAddKnowledge({
        mode: 'single' as const,
        title: 'Knowledge to Delete',
        description: 'This knowledge will be deleted',
        content: 'Content to be deleted',
        tags: ['delete-test'],
        metadata: { source: 'test' }
      });

      const result = await atlasDeleteKnowledge({
        mode: 'single' as const,
        id: knowledge.id
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted successfully');
    });
  });

  describe('Search Tools', () => {
    beforeEach(async () => {
      // Create test data for search
      const project = await atlasCreateProject({
        mode: 'single' as const,
        name: 'Searchable Project Data',
        description: 'A project with unique searchable content',
        status: 'active' as const,
        completionRequirements: 'Complete search testing',
        outputFormat: 'Search results',
        taskType: 'testing'
      });

      await atlasCreateTask({
        mode: 'single' as const,
        title: 'Searchable Task Data',
        description: 'A task with unique searchable content',
        status: 'active' as const,
        priority: 'medium' as const,
        taskType: 'testing',
        projectId: project.id,
        completionRequirements: 'Complete search task'
      });

      await atlasAddKnowledge({
        mode: 'single' as const,
        title: 'Searchable Knowledge Data',
        description: 'Knowledge with unique searchable content',
        content: 'This knowledge contains unique searchable information',
        tags: ['searchable', 'unique', 'test'],
        metadata: { source: 'test' }
      });
    });

    test('atlas_unified_search - should search across all entities', async () => {
      const result = await atlasUnifiedSearch({
        query: 'searchable',
        limit: 10,
        responseFormat: 'structured' as const
      });

      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.totalFound).toBeGreaterThan(0);
      
      // Should find results in projects, tasks, and knowledge
      const resultTypes = result.results.map(r => r.type);
      expect(resultTypes).toContain('project');
      expect(resultTypes).toContain('task');
      expect(resultTypes).toContain('knowledge');
    });

    test('atlas_unified_search - should search with type filter', async () => {
      const result = await atlasUnifiedSearch({
        query: 'searchable',
        filters: { type: 'project' },
        limit: 10,
        responseFormat: 'structured' as const
      });

      expect(result).toBeDefined();
      expect(result.results.every(r => r.type === 'project')).toBe(true);
    });

    test('atlas_unified_search - should handle empty results', async () => {
      const result = await atlasUnifiedSearch({
        query: 'nonexistent-unique-term-12345',
        limit: 10,
        responseFormat: 'structured' as const
      });

      expect(result).toBeDefined();
      expect(result.results).toHaveLength(0);
      expect(result.totalFound).toBe(0);
    });
  });

  describe('Cross-Tool Integration', () => {
    test('should maintain data consistency across tools', async () => {
      // Create project via tool
      const project = await atlasCreateProject({
        mode: 'single' as const,
        name: 'Cross-Tool Project',
        description: 'Project for cross-tool testing',
        status: 'active' as const,
        completionRequirements: 'Complete cross-tool tests',
        outputFormat: 'Cross-tool results',
        taskType: 'integration'
      });

      // Create task via tool
      const task = await atlasCreateTask({
        mode: 'single' as const,
        title: 'Cross-Tool Task',
        description: 'Task for cross-tool testing',
        status: 'active' as const,
        priority: 'high' as const,
        taskType: 'testing',
        projectId: project.id,
        completionRequirements: 'Complete cross-tool task'
      });

      // Add knowledge via tool
      const knowledge = await atlasAddKnowledge({
        mode: 'single' as const,
        title: 'Cross-Tool Knowledge',
        description: 'Knowledge for cross-tool testing',
        content: 'This knowledge is for cross-tool integration testing',
        tags: ['cross-tool', 'integration'],
        metadata: { source: 'cross-tool-test' }
      });

      // Search for created items
      const searchResult = await atlasUnifiedSearch({
        query: 'cross-tool',
        limit: 10,
        responseFormat: 'structured' as const
      });

      expect(searchResult.results).toHaveLength(3);
      expect(searchResult.results.map(r => r.type)).toContain('project');
      expect(searchResult.results.map(r => r.type)).toContain('task');
      expect(searchResult.results.map(r => r.type)).toContain('knowledge');

      // Update project and verify in list
      await atlasUpdateProject({
        mode: 'single' as const,
        id: project.id,
        updates: {
          status: 'completed' as const
        }
      });

      const listResult = await atlasListProjects({
        mode: 'all' as const,
        responseFormat: 'structured' as const
      });

      const updatedProject = listResult.projects.find(p => p.id === project.id);
      expect(updatedProject?.status).toBe('completed');
    });
  });
});