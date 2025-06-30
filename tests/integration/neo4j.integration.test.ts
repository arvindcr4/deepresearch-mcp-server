import { describe, test, expect, beforeEach } from '@jest/globals';
import { neo4jDriver, clearNeo4jDatabase, initializeNeo4jSchema } from '../../src/services/neo4j/index.js';
import { ProjectService } from '../../src/services/neo4j/projectService.js';
import { TaskService } from '../../src/services/neo4j/taskService.js';
import { KnowledgeService } from '../../src/services/neo4j/knowledgeService.js';
import { SearchService } from '../../src/services/neo4j/searchService.js';

describe('Neo4j Database Integration Tests', () => {
  beforeEach(async () => {
    await clearNeo4jDatabase();
    await initializeNeo4jSchema();
  });

  describe('Database Connection', () => {
    test('should establish connection to Neo4j', async () => {
      const driver = await neo4jDriver.getDriver();
      expect(driver).toBeDefined();
      
      // Test connectivity
      await expect(driver.verifyConnectivity()).resolves.not.toThrow();
    });

    test('should create and execute read query', async () => {
      const result = await neo4jDriver.executeReadQuery('RETURN 1 as number');
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
    });

    test('should create and execute write query', async () => {
      const result = await neo4jDriver.executeQuery(
        'CREATE (n:TestNode {id: $id}) RETURN n.id as id',
        { id: 'test-123' }
      );
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
    });
  });

  describe('Project Service Integration', () => {
    test('should create and retrieve a project', async () => {
      const projectData = {
        name: 'Integration Test Project',
        description: 'A project for testing database integration',
        status: 'active' as const,
        completionRequirements: 'Complete all integration tests',
        outputFormat: 'Test results',
        taskType: 'testing'
      };

      const createdProject = await ProjectService.createProject(projectData);
      expect(createdProject).toBeDefined();
      expect(createdProject.id).toBeDefined();
      expect(createdProject.name).toBe(projectData.name);

      const retrievedProject = await ProjectService.getProject(createdProject.id);
      expect(retrievedProject).toBeDefined();
      expect(retrievedProject?.name).toBe(projectData.name);
    });

    test('should list all projects', async () => {
      const project1 = await ProjectService.createProject({
        name: 'Project 1',
        description: 'First test project',
        status: 'active' as const,
        completionRequirements: 'Complete project 1',
        outputFormat: 'Results 1',
        taskType: 'testing'
      });

      const project2 = await ProjectService.createProject({
        name: 'Project 2',
        description: 'Second test project',
        status: 'pending' as const,
        completionRequirements: 'Complete project 2',
        outputFormat: 'Results 2',
        taskType: 'analysis'
      });

      const projects = await ProjectService.listProjects();
      expect(projects).toHaveLength(2);
      expect(projects.map(p => p.name)).toContain('Project 1');
      expect(projects.map(p => p.name)).toContain('Project 2');
    });

    test('should update project', async () => {
      const project = await projectService.createProject({
        name: 'Original Project',
        description: 'Original description',
        status: 'active' as const,
        completionRequirements: 'Original requirements',
        outputFormat: 'Original format',
        taskType: 'testing'
      });

      const updatedProject = await projectService.updateProject(project.id, {
        name: 'Updated Project',
        description: 'Updated description',
        status: 'completed' as const
      });

      expect(updatedProject.name).toBe('Updated Project');
      expect(updatedProject.description).toBe('Updated description');
      expect(updatedProject.status).toBe('completed');
    });

    test('should delete project', async () => {
      const project = await projectService.createProject({
        name: 'Project to Delete',
        description: 'This project will be deleted',
        status: 'active' as const,
        completionRequirements: 'To be deleted',
        outputFormat: 'N/A',
        taskType: 'testing'
      });

      await projectService.deleteProject(project.id);
      const deletedProject = await projectService.getProject(project.id);
      expect(deletedProject).toBeNull();
    });
  });

  describe('Task Service Integration', () => {
    let testProjectId: string;

    beforeEach(async () => {
      const project = await projectService.createProject({
        name: 'Task Test Project',
        description: 'Project for testing tasks',
        status: 'active' as const,
        completionRequirements: 'Complete task tests',
        outputFormat: 'Task test results',
        taskType: 'testing'
      });
      testProjectId = project.id;
    });

    test('should create and retrieve a task', async () => {
      const taskData = {
        title: 'Integration Test Task',
        description: 'A task for testing database integration',
        status: 'active' as const,
        priority: 'medium' as const,
        taskType: 'testing',
        projectId: testProjectId,
        completionRequirements: 'Complete task tests'
      };

      const createdTask = await taskService.createTask(taskData);
      expect(createdTask).toBeDefined();
      expect(createdTask.id).toBeDefined();
      expect(createdTask.title).toBe(taskData.title);

      const retrievedTask = await taskService.getTask(createdTask.id);
      expect(retrievedTask).toBeDefined();
      expect(retrievedTask?.title).toBe(taskData.title);
    });

    test('should list tasks by project', async () => {
      await taskService.createTask({
        title: 'Task 1',
        description: 'First task',
        status: 'active' as const,
        priority: 'high' as const,
        taskType: 'testing',
        projectId: testProjectId,
        completionRequirements: 'Complete task 1'
      });

      await taskService.createTask({
        title: 'Task 2',
        description: 'Second task',
        status: 'pending' as const,
        priority: 'low' as const,
        taskType: 'analysis',
        projectId: testProjectId,
        completionRequirements: 'Complete task 2'
      });

      const tasks = await taskService.listTasks({ projectId: testProjectId });
      expect(tasks).toHaveLength(2);
      expect(tasks.map(t => t.title)).toContain('Task 1');
      expect(tasks.map(t => t.title)).toContain('Task 2');
    });
  });

  describe('Knowledge Service Integration', () => {
    test('should create and retrieve knowledge', async () => {
      const knowledgeData = {
        title: 'Integration Test Knowledge',
        description: 'Knowledge for testing database integration',
        content: 'This is test knowledge content for integration testing',
        tags: ['test', 'integration', 'database'],
        metadata: {
          source: 'integration-test',
          confidence: 'high'
        }
      };

      const createdKnowledge = await knowledgeService.addKnowledge(knowledgeData);
      expect(createdKnowledge).toBeDefined();
      expect(createdKnowledge.id).toBeDefined();
      expect(createdKnowledge.title).toBe(knowledgeData.title);

      const retrievedKnowledge = await knowledgeService.getKnowledge(createdKnowledge.id);
      expect(retrievedKnowledge).toBeDefined();
      expect(retrievedKnowledge?.title).toBe(knowledgeData.title);
      expect(retrievedKnowledge?.tags).toEqual(knowledgeData.tags);
    });

    test('should list knowledge items', async () => {
      await knowledgeService.addKnowledge({
        title: 'Knowledge 1',
        description: 'First knowledge item',
        content: 'Content 1',
        tags: ['tag1'],
        metadata: { source: 'test' }
      });

      await knowledgeService.addKnowledge({
        title: 'Knowledge 2',
        description: 'Second knowledge item',
        content: 'Content 2',
        tags: ['tag2'],
        metadata: { source: 'test' }
      });

      const knowledgeItems = await knowledgeService.listKnowledge();
      expect(knowledgeItems).toHaveLength(2);
      expect(knowledgeItems.map(k => k.title)).toContain('Knowledge 1');
      expect(knowledgeItems.map(k => k.title)).toContain('Knowledge 2');
    });
  });

  describe('Search Service Integration', () => {
    beforeEach(async () => {
      // Create test data for search
      const project = await projectService.createProject({
        name: 'Searchable Project',
        description: 'A project with searchable content',
        status: 'active' as const,
        completionRequirements: 'Complete search testing',
        outputFormat: 'Search results',
        taskType: 'testing'
      });

      await taskService.createTask({
        title: 'Searchable Task',
        description: 'A task with searchable content',
        status: 'active' as const,
        priority: 'medium' as const,
        taskType: 'testing',
        projectId: project.id,
        completionRequirements: 'Complete search task'
      });

      await knowledgeService.addKnowledge({
        title: 'Searchable Knowledge',
        description: 'Knowledge with searchable content',
        content: 'This knowledge contains searchable information',
        tags: ['searchable', 'test'],
        metadata: { source: 'test' }
      });
    });

    test('should perform unified search across all entities', async () => {
      const searchResults = await searchService.unifiedSearch({
        query: 'searchable',
        limit: 10
      });

      expect(searchResults).toBeDefined();
      expect(searchResults.length).toBeGreaterThan(0);
      
      // Should find results in projects, tasks, and knowledge
      const resultTypes = searchResults.map(r => r.type);
      expect(resultTypes).toContain('project');
      expect(resultTypes).toContain('task');
      expect(resultTypes).toContain('knowledge');
    });

    test('should search with filters', async () => {
      const projectResults = await searchService.unifiedSearch({
        query: 'searchable',
        filters: { type: 'project' },
        limit: 10
      });

      expect(projectResults).toBeDefined();
      expect(projectResults.every(r => r.type === 'project')).toBe(true);
    });
  });

  describe('Cross-Entity Relationships', () => {
    test('should maintain project-task relationships', async () => {
      const project = await projectService.createProject({
        name: 'Parent Project',
        description: 'Project with child tasks',
        status: 'active' as const,
        completionRequirements: 'Complete all child tasks',
        outputFormat: 'Project completion report',
        taskType: 'integration'
      });

      const task = await taskService.createTask({
        title: 'Child Task',
        description: 'Task belonging to parent project',
        status: 'active' as const,
        priority: 'high' as const,
        taskType: 'implementation',
        projectId: project.id,
        completionRequirements: 'Complete implementation'
      });

      // Verify relationship exists
      const projectTasks = await taskService.listTasks({ projectId: project.id });
      expect(projectTasks).toHaveLength(1);
      expect(projectTasks[0].id).toBe(task.id);
    });

    test('should cascade delete when project is deleted', async () => {
      const project = await projectService.createProject({
        name: 'Project to Cascade Delete',
        description: 'Project that will be deleted with tasks',
        status: 'active' as const,
        completionRequirements: 'Test cascade delete',
        outputFormat: 'Delete confirmation',
        taskType: 'testing'
      });

      await taskService.createTask({
        title: 'Task to be Deleted',
        description: 'Task that should be deleted with project',
        status: 'active' as const,
        priority: 'medium' as const,
        taskType: 'testing',
        projectId: project.id,
        completionRequirements: 'Should be deleted'
      });

      // Delete project
      await projectService.deleteProject(project.id);

      // Verify tasks are also deleted
      const remainingTasks = await taskService.listTasks({ projectId: project.id });
      expect(remainingTasks).toHaveLength(0);
    });
  });
});