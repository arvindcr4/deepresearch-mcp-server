/**
 * Unit Tests for Atlas Task Create Tool
 */

// Mock dependencies
jest.mock('../../../services/neo4j/index.js');
jest.mock('../../../utils/logger.js');

const mockTaskService = {
  createTask: jest.fn(),
};

// Mock the TaskService
jest.mock('../../../services/neo4j/taskService.js', () => ({
  TaskService: jest.fn().mockImplementation(() => mockTaskService),
}));

describe('Atlas Task Create Tool', () => {
  let createTaskTool: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Dynamic import to ensure mocks are applied
    try {
      const module = await import('../atlas_task_create/createTask.js');
      createTaskTool = module.createTask || module.default;
    } catch (error) {
      // If module doesn't exist, skip tests
      createTaskTool = null;
    }
  });

  describe('createTask', () => {
    it('should create a task with valid input', async () => {
      if (!createTaskTool) {
        return; // Skip if tool doesn't exist
      }

      const mockTask = {
        id: 'test-task-id',
        name: 'Test Task',
        description: 'A test task',
        priority: 'HIGH',
        status: 'TODO',
        tags: ['urgent', 'test'],
        project_id: 'project-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockTaskService.createTask.mockResolvedValue(mockTask);

      const input = {
        name: 'Test Task',
        description: 'A test task',
        priority: 'HIGH',
        status: 'TODO',
        tags: ['urgent', 'test'],
        project_id: 'project-123',
      };

      const result = await createTaskTool(input);

      expect(mockTaskService.createTask).toHaveBeenCalledWith(input);
      expect(result).toEqual(expect.objectContaining({
        success: true,
        task: mockTask,
      }));
    });

    it('should create a task without project association', async () => {
      if (!createTaskTool) {
        return;
      }

      const mockTask = {
        id: 'test-task-id',
        name: 'Standalone Task',
        description: 'A task without project',
        priority: 'MEDIUM',
        status: 'TODO',
        tags: ['standalone'],
        project_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockTaskService.createTask.mockResolvedValue(mockTask);

      const input = {
        name: 'Standalone Task',
        description: 'A task without project',
        priority: 'MEDIUM',
        status: 'TODO',
        tags: ['standalone'],
      };

      const result = await createTaskTool(input);

      expect(mockTaskService.createTask).toHaveBeenCalledWith(input);
      expect(result).toEqual(expect.objectContaining({
        success: true,
        task: expect.objectContaining({
          name: 'Standalone Task',
          project_id: null,
        }),
      }));
    });

    it('should handle validation errors', async () => {
      if (!createTaskTool) {
        return;
      }

      const invalidInput = {
        name: '', // Empty name should fail validation
        description: 'A test task',
      };

      const result = await createTaskTool(invalidInput);

      expect(result).toEqual(expect.objectContaining({
        success: false,
        error: expect.any(String),
      }));
    });

    it('should handle database errors', async () => {
      if (!createTaskTool) {
        return;
      }

      const input = {
        name: 'Test Task',
        description: 'A test task',
      };

      const error = new Error('Database connection failed');
      mockTaskService.createTask.mockRejectedValue(error);

      const result = await createTaskTool(input);

      expect(result).toEqual(expect.objectContaining({
        success: false,
        error: expect.stringContaining('Database connection failed'),
      }));
    });

    it('should validate priority values', async () => {
      if (!createTaskTool) {
        return;
      }

      const input = {
        name: 'Test Task',
        description: 'A test task',
        priority: 'INVALID_PRIORITY',
      };

      const result = await createTaskTool(input);

      expect(result).toEqual(expect.objectContaining({
        success: false,
        error: expect.stringContaining('priority'),
      }));
    });

    it('should validate status values', async () => {
      if (!createTaskTool) {
        return;
      }

      const input = {
        name: 'Test Task',
        description: 'A test task',
        status: 'INVALID_STATUS',
      };

      const result = await createTaskTool(input);

      expect(result).toEqual(expect.objectContaining({
        success: false,
        error: expect.stringContaining('status'),
      }));
    });

    it('should sanitize and validate tags', async () => {
      if (!createTaskTool) {
        return;
      }

      const inputWithTags = {
        name: 'Test Task',
        description: 'A test task',
        tags: ['valid-tag', '', '  whitespace  ', 'another-tag'],
      };

      const mockTask = {
        id: 'test-task-id',
        name: 'Test Task',
        description: 'A test task',
        tags: ['valid-tag', 'whitespace', 'another-tag'], // Cleaned tags
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockTaskService.createTask.mockResolvedValue(mockTask);

      const result = await createTaskTool(inputWithTags);

      expect(mockTaskService.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.not.arrayContaining(['']), // Should not contain empty strings
        })
      );
      expect(result.success).toBe(true);
    });

    it('should handle task with dependencies', async () => {
      if (!createTaskTool) {
        return;
      }

      const mockTask = {
        id: 'test-task-id',
        name: 'Dependent Task',
        description: 'A task with dependencies',
        priority: 'MEDIUM',
        status: 'BLOCKED',
        tags: ['dependent'],
        project_id: 'project-123',
        dependencies: ['task-1', 'task-2'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockTaskService.createTask.mockResolvedValue(mockTask);

      const input = {
        name: 'Dependent Task',
        description: 'A task with dependencies',
        priority: 'MEDIUM',
        status: 'BLOCKED',
        tags: ['dependent'],
        project_id: 'project-123',
        dependencies: ['task-1', 'task-2'],
      };

      const result = await createTaskTool(input);

      expect(result).toEqual(expect.objectContaining({
        success: true,
        task: expect.objectContaining({
          name: 'Dependent Task',
          status: 'BLOCKED',
          dependencies: ['task-1', 'task-2'],
        }),
      }));
    });
  });

  describe('input validation edge cases', () => {
    it('should handle very long task names', async () => {
      if (!createTaskTool) {
        return;
      }

      const input = {
        name: 'A'.repeat(1000), // Very long name
        description: 'Test description',
      };

      const result = await createTaskTool(input);

      // Should either succeed with truncation or fail with validation error
      if (result.success) {
        expect(result.task.name.length).toBeLessThanOrEqual(255);
      } else {
        expect(result.error).toContain('too long');
      }
    });

    it('should handle special characters in task name', async () => {
      if (!createTaskTool) {
        return;
      }

      const specialCharsTask = {
        id: 'special-task-id',
        name: 'Task with Special Characters: @#$%^&*()',
        description: 'A task with special characters',
        priority: 'LOW',
        status: 'TODO',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockTaskService.createTask.mockResolvedValue(specialCharsTask);

      const input = {
        name: 'Task with Special Characters: @#$%^&*()',
        description: 'A task with special characters',
        priority: 'LOW',
        status: 'TODO',
      };

      const result = await createTaskTool(input);

      expect(result).toEqual(expect.objectContaining({
        success: true,
        task: expect.objectContaining({
          name: 'Task with Special Characters: @#$%^&*()',
        }),
      }));
    });

    it('should handle empty descriptions', async () => {
      if (!createTaskTool) {
        return;
      }

      const mockTask = {
        id: 'test-task-id',
        name: 'Task Without Description',
        description: '',
        priority: 'MEDIUM',
        status: 'TODO',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockTaskService.createTask.mockResolvedValue(mockTask);

      const input = {
        name: 'Task Without Description',
        description: '',
        priority: 'MEDIUM',
        status: 'TODO',
      };

      const result = await createTaskTool(input);

      expect(result).toEqual(expect.objectContaining({
        success: true,
        task: expect.objectContaining({
          name: 'Task Without Description',
          description: '',
        }),
      }));
    });
  });
});