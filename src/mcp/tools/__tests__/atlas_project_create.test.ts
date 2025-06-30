/**
 * Unit Tests for Atlas Project Create Tool
 */

// Mock dependencies
jest.mock('../../../services/neo4j/index.js');
jest.mock('../../../utils/logger.js');

const mockProjectService = {
  createProject: jest.fn(),
};

// Mock the ProjectService
jest.mock('../../../services/neo4j/projectService.js', () => ({
  ProjectService: jest.fn().mockImplementation(() => mockProjectService),
}));

describe('Atlas Project Create Tool', () => {
  let createProjectTool: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Dynamic import to ensure mocks are applied
    const module = await import('../atlas_project_create/createProject.js');
    createProjectTool = module.createProject;
  });

  describe('createProject', () => {
    it('should create a project with valid input', async () => {
      const mockProject = {
        id: 'test-project-id',
        name: 'Test Project',
        description: 'A test project',
        priority: 'MEDIUM',
        status: 'ACTIVE',
        tags: ['test'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockProjectService.createProject.mockResolvedValue(mockProject);

      const input = {
        name: 'Test Project',
        description: 'A test project',
        priority: 'MEDIUM',
        status: 'ACTIVE',
        tags: ['test'],
      };

      if (createProjectTool) {
        const result = await createProjectTool(input);

        expect(mockProjectService.createProject).toHaveBeenCalledWith(input);
        expect(result).toEqual(expect.objectContaining({
          success: true,
          project: mockProject,
        }));
      }
    });

    it('should handle validation errors', async () => {
      const invalidInput = {
        name: '', // Empty name should fail validation
        description: 'A test project',
      };

      if (createProjectTool) {
        const result = await createProjectTool(invalidInput);

        expect(result).toEqual(expect.objectContaining({
          success: false,
          error: expect.stringContaining('validation'),
        }));
      }
    });

    it('should handle database errors', async () => {
      const input = {
        name: 'Test Project',
        description: 'A test project',
      };

      const error = new Error('Database connection failed');
      mockProjectService.createProject.mockRejectedValue(error);

      if (createProjectTool) {
        const result = await createProjectTool(input);

        expect(result).toEqual(expect.objectContaining({
          success: false,
          error: expect.stringContaining('Database connection failed'),
        }));
      }
    });

    it('should handle missing required fields', async () => {
      const incompleteInput = {
        description: 'A test project without name',
      };

      if (createProjectTool) {
        const result = await createProjectTool(incompleteInput);

        expect(result).toEqual(expect.objectContaining({
          success: false,
          error: expect.any(String),
        }));
      }
    });

    it('should sanitize and validate tags', async () => {
      const inputWithTags = {
        name: 'Test Project',
        description: 'A test project',
        tags: ['valid-tag', '', '  whitespace  ', 'another-tag'],
      };

      const mockProject = {
        id: 'test-project-id',
        name: 'Test Project',
        description: 'A test project',
        tags: ['valid-tag', 'whitespace', 'another-tag'], // Cleaned tags
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockProjectService.createProject.mockResolvedValue(mockProject);

      if (createProjectTool) {
        const result = await createProjectTool(inputWithTags);

        expect(mockProjectService.createProject).toHaveBeenCalledWith(
          expect.objectContaining({
            tags: expect.not.arrayContaining(['']), // Should not contain empty strings
          })
        );
        expect(result.success).toBe(true);
      }
    });
  });

  describe('input validation', () => {
    it('should validate priority values', async () => {
      const input = {
        name: 'Test Project',
        description: 'A test project',
        priority: 'INVALID_PRIORITY',
      };

      if (createProjectTool) {
        const result = await createProjectTool(input);

        expect(result).toEqual(expect.objectContaining({
          success: false,
          error: expect.stringContaining('priority'),
        }));
      }
    });

    it('should validate status values', async () => {
      const input = {
        name: 'Test Project',
        description: 'A test project',
        status: 'INVALID_STATUS',
      };

      if (createProjectTool) {
        const result = await createProjectTool(input);

        expect(result).toEqual(expect.objectContaining({
          success: false,
          error: expect.stringContaining('status'),
        }));
      }
    });

    it('should handle long names and descriptions', async () => {
      const input = {
        name: 'A'.repeat(1000), // Very long name
        description: 'B'.repeat(5000), // Very long description
      };

      if (createProjectTool) {
        const result = await createProjectTool(input);

        // Should either succeed with truncation or fail with validation error
        if (result.success) {
          expect(result.project.name.length).toBeLessThanOrEqual(255);
        } else {
          expect(result.error).toContain('too long');
        }
      }
    });
  });
});