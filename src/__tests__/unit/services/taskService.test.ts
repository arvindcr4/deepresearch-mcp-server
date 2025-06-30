/**
 * TaskService Unit Tests
 * Tests for task management operations
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { TaskService } from '../../../services/neo4j/taskService.js';
import { ProjectService } from '../../../services/neo4j/projectService.js';
import { mockNeo4jDriver, resetMockDataStore } from '../../mocks/neo4j.mock.js';

// Mock the Neo4j driver
jest.mock('../../../services/neo4j/driver.js', () => ({
  neo4jDriver: mockNeo4jDriver,
}));

describe('TaskService', () => {
  let taskService: TaskService;
  let projectService: ProjectService;
  let testProject: any;

  beforeEach(async () => {
    resetMockDataStore();
    taskService = new TaskService();
    projectService = new ProjectService();
    
    // Create a test project for task operations
    testProject = await projectService.createProject({
      name: 'Test Project for Tasks',
      description: 'Project for testing tasks',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    it('should create a new task successfully', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'A test task for unit testing',
        status: 'pending' as const,
        priority: 'high' as const,
        projectId: testProject.id,
      };

      const result = await taskService.createTask(taskData);

      expect(result).toBeDefined();
      expect(result.title).toBe(taskData.title);
      expect(result.description).toBe(taskData.description);
      expect(result.status).toBe(taskData.status);
      expect(result.priority).toBe(taskData.priority);
      expect(result.projectId).toBe(taskData.projectId);
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should create task with default values when not provided', async () => {
      const taskData = {
        title: 'Minimal Task',
        projectId: testProject.id,
      };

      const result = await taskService.createTask(taskData);

      expect(result.title).toBe(taskData.title);
      expect(result.status).toBe('pending');
      expect(result.priority).toBe('medium');
    });

    it('should handle task creation without project association', async () => {
      const taskData = {
        title: 'Independent Task',
        description: 'Task without project',
      };

      const result = await taskService.createTask(taskData);

      expect(result.title).toBe(taskData.title);
      expect(result.projectId).toBeUndefined();
    });
  });

  describe('getTask', () => {
    it('should retrieve a task by ID', async () => {
      // First create a task
      const taskData = {
        title: 'Retrievable Task',
        description: 'Task for retrieval testing',
        projectId: testProject.id,
      };
      const createdTask = await taskService.createTask(taskData);

      // Then retrieve it
      const retrievedTask = await taskService.getTask(createdTask.id);

      expect(retrievedTask).toBeDefined();
      expect(retrievedTask?.id).toBe(createdTask.id);
      expect(retrievedTask?.title).toBe(taskData.title);
    });

    it('should return null for non-existent task', async () => {
      const result = await taskService.getTask('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('listTasks', () => {
    it('should return empty list when no tasks exist', async () => {
      const result = await taskService.listTasks();
      expect(result).toEqual([]);
    });

    it('should return list of tasks', async () => {
      // Create multiple tasks
      const tasks = [
        { title: 'Task 1', description: 'First task', projectId: testProject.id },
        { title: 'Task 2', description: 'Second task', projectId: testProject.id },
        { title: 'Task 3', description: 'Third task', projectId: testProject.id },
      ];

      for (const task of tasks) {
        await taskService.createTask(task);
      }

      const result = await taskService.listTasks();
      expect(result).toHaveLength(3);
      expect(result.map(t => t.title)).toContain('Task 1');
      expect(result.map(t => t.title)).toContain('Task 2');
      expect(result.map(t => t.title)).toContain('Task 3');
    });

    it('should filter tasks by project ID', async () => {
      // Create another project
      const anotherProject = await projectService.createProject({
        name: 'Another Project',
        description: 'Another project for filtering',
      });

      // Create tasks for both projects
      await taskService.createTask({
        title: 'Task for Project 1',
        projectId: testProject.id,
      });
      await taskService.createTask({
        title: 'Task for Project 2',
        projectId: anotherProject.id,
      });

      const result = await taskService.listTasks({ projectId: testProject.id });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Task for Project 1');
    });

    it('should filter tasks by status', async () => {
      // Create tasks with different statuses
      await taskService.createTask({
        title: 'Pending Task',
        status: 'pending',
        projectId: testProject.id,
      });
      await taskService.createTask({
        title: 'In Progress Task',
        status: 'in_progress',
        projectId: testProject.id,
      });
      await taskService.createTask({
        title: 'Completed Task',
        status: 'completed',
        projectId: testProject.id,
      });

      const result = await taskService.listTasks({ status: 'pending' });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Pending Task');
    });
  });

  describe('updateTask', () => {
    it('should update task successfully', async () => {
      // Create a task first
      const originalTask = await taskService.createTask({
        title: 'Original Task',
        description: 'Original description',
        projectId: testProject.id,
      });

      // Update the task
      const updateData = {
        title: 'Updated Task',
        description: 'Updated description',
        status: 'completed' as const,
        priority: 'low' as const,
      };

      const updatedTask = await taskService.updateTask(originalTask.id, updateData);

      expect(updatedTask).toBeDefined();
      expect(updatedTask?.title).toBe(updateData.title);
      expect(updatedTask?.description).toBe(updateData.description);
      expect(updatedTask?.status).toBe(updateData.status);
      expect(updatedTask?.priority).toBe(updateData.priority);
    });

    it('should return null when updating non-existent task', async () => {
      const result = await taskService.updateTask('non-existent-id', {
        title: 'Updated Title',
      });
      expect(result).toBeNull();
    });
  });

  describe('deleteTask', () => {
    it('should delete task successfully', async () => {
      // Create a task first
      const task = await taskService.createTask({
        title: 'Task to Delete',
        description: 'This task will be deleted',
        projectId: testProject.id,
      });

      // Delete the task
      const result = await taskService.deleteTask(task.id);
      expect(result).toBe(true);

      // Verify it's deleted
      const deletedTask = await taskService.getTask(task.id);
      expect(deletedTask).toBeNull();
    });

    it('should return false when deleting non-existent task', async () => {
      const result = await taskService.deleteTask('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('getTaskStats', () => {
    it('should return task statistics', async () => {
      // Create tasks with different statuses and priorities
      await taskService.createTask({
        title: 'Pending High',
        status: 'pending',
        priority: 'high',
        projectId: testProject.id,
      });
      await taskService.createTask({
        title: 'In Progress Medium',
        status: 'in_progress',
        priority: 'medium',
        projectId: testProject.id,
      });
      await taskService.createTask({
        title: 'Completed Low',
        status: 'completed',
        priority: 'low',
        projectId: testProject.id,
      });

      const stats = await taskService.getTaskStats();

      expect(stats).toBeDefined();
      expect(stats.total).toBe(3);
      expect(stats.byStatus).toBeDefined();
      expect(stats.byPriority).toBeDefined();
    });
  });
});