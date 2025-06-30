/**
 * ProjectService Unit Tests
 * Tests for project management operations
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ProjectService } from '../../../services/neo4j/projectService.js';
import { mockNeo4jDriver, resetMockDataStore } from '../../mocks/neo4j.mock.js';

// Mock the Neo4j driver
jest.mock('../../../services/neo4j/driver.js', () => ({
  neo4jDriver: mockNeo4jDriver,
}));

describe('ProjectService', () => {
  let projectService: ProjectService;

  beforeEach(() => {
    resetMockDataStore();
    projectService = new ProjectService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createProject', () => {
    it('should create a new project successfully', async () => {
      const projectData = {
        name: 'Test Project',
        description: 'A test project for unit testing',
        status: 'active' as const,
      };

      const result = await projectService.createProject(projectData);

      expect(result).toBeDefined();
      expect(result.name).toBe(projectData.name);
      expect(result.description).toBe(projectData.description);
      expect(result.status).toBe(projectData.status);
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should create project with default status when not provided', async () => {
      const projectData = {
        name: 'Test Project',
        description: 'A test project',
      };

      const result = await projectService.createProject(projectData);

      expect(result.status).toBe('active');
    });

    it('should handle project creation with minimal data', async () => {
      const projectData = {
        name: 'Minimal Project',
      };

      const result = await projectService.createProject(projectData);

      expect(result.name).toBe(projectData.name);
      expect(result.id).toBeDefined();
    });
  });

  describe('getProject', () => {
    it('should retrieve a project by ID', async () => {
      // First create a project
      const projectData = {
        name: 'Retrievable Project',
        description: 'Project for retrieval testing',
      };
      const createdProject = await projectService.createProject(projectData);

      // Then retrieve it
      const retrievedProject = await projectService.getProject(createdProject.id);

      expect(retrievedProject).toBeDefined();
      expect(retrievedProject?.id).toBe(createdProject.id);
      expect(retrievedProject?.name).toBe(projectData.name);
    });

    it('should return null for non-existent project', async () => {
      const result = await projectService.getProject('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('listProjects', () => {
    it('should return empty list when no projects exist', async () => {
      const result = await projectService.listProjects();
      expect(result).toEqual([]);
    });

    it('should return list of projects', async () => {
      // Create multiple projects
      const projects = [
        { name: 'Project 1', description: 'First project' },
        { name: 'Project 2', description: 'Second project' },
        { name: 'Project 3', description: 'Third project' },
      ];

      for (const project of projects) {
        await projectService.createProject(project);
      }

      const result = await projectService.listProjects();
      expect(result).toHaveLength(3);
      expect(result.map(p => p.name)).toContain('Project 1');
      expect(result.map(p => p.name)).toContain('Project 2');
      expect(result.map(p => p.name)).toContain('Project 3');
    });

    it('should handle pagination', async () => {
      // Create multiple projects
      for (let i = 1; i <= 5; i++) {
        await projectService.createProject({
          name: `Project ${i}`,
          description: `Project ${i} description`,
        });
      }

      const result = await projectService.listProjects({ limit: 3, offset: 0 });
      expect(result).toHaveLength(3);
    });
  });

  describe('updateProject', () => {
    it('should update project successfully', async () => {
      // Create a project first
      const originalProject = await projectService.createProject({
        name: 'Original Project',
        description: 'Original description',
      });

      // Update the project
      const updateData = {
        name: 'Updated Project',
        description: 'Updated description',
        status: 'completed' as const,
      };

      const updatedProject = await projectService.updateProject(originalProject.id, updateData);

      expect(updatedProject).toBeDefined();
      expect(updatedProject?.name).toBe(updateData.name);
      expect(updatedProject?.description).toBe(updateData.description);
      expect(updatedProject?.status).toBe(updateData.status);
    });

    it('should return null when updating non-existent project', async () => {
      const result = await projectService.updateProject('non-existent-id', {
        name: 'Updated Name',
      });
      expect(result).toBeNull();
    });
  });

  describe('deleteProject', () => {
    it('should delete project successfully', async () => {
      // Create a project first
      const project = await projectService.createProject({
        name: 'Project to Delete',
        description: 'This project will be deleted',
      });

      // Delete the project
      const result = await projectService.deleteProject(project.id);
      expect(result).toBe(true);

      // Verify it's deleted
      const deletedProject = await projectService.getProject(project.id);
      expect(deletedProject).toBeNull();
    });

    it('should return false when deleting non-existent project', async () => {
      const result = await projectService.deleteProject('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('getProjectStats', () => {
    it('should return project statistics', async () => {
      // Create projects with different statuses
      await projectService.createProject({ name: 'Active 1', status: 'active' });
      await projectService.createProject({ name: 'Active 2', status: 'active' });
      await projectService.createProject({ name: 'Completed 1', status: 'completed' });
      await projectService.createProject({ name: 'On Hold 1', status: 'on_hold' });

      const stats = await projectService.getProjectStats();

      expect(stats).toBeDefined();
      expect(stats.total).toBe(4);
      expect(stats.byStatus).toBeDefined();
    });
  });
});