/**
 * Unit Tests for TaskService
 */

// Mock Neo4j driver
const mockTransaction = {
  run: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  close: jest.fn(),
};

const mockSession = {
  beginTransaction: jest.fn(() => mockTransaction),
  close: jest.fn(),
  executeRead: jest.fn(),
  executeWrite: jest.fn(),
};

const mockDriver = {
  session: jest.fn(() => mockSession),
  close: jest.fn(),
};

// Mock the driver module
jest.mock('../driver.js', () => ({
  neo4jDriver: mockDriver,
}));

// Mock logger
jest.mock('../../utils/logger.js', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('TaskService', () => {
  let TaskService: any;
  let taskService: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Dynamic import to ensure mocks are applied
    const module = await import('../taskService.js');
    TaskService = module.TaskService;
    taskService = new TaskService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    it('should create a task successfully', async () => {
      const mockTask = {
        id: 'test-task-id',
        name: 'Test Task',
        description: 'A test task',
        priority: 'HIGH',
        status: 'TODO',
        tags: ['urgent'],
        project_id: 'project-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const expectedRecord = {
        get: jest.fn((key: string) => mockTask[key as keyof typeof mockTask] || null),
      };

      mockTransaction.run.mockResolvedValue({
        records: [expectedRecord],
      });

      const result = await taskService.createTask({
        name: mockTask.name,
        description: mockTask.description,
        priority: mockTask.priority,
        status: mockTask.status,
        tags: mockTask.tags,
        project_id: mockTask.project_id,
      });

      expect(mockSession.beginTransaction).toHaveBeenCalled();
      expect(mockTransaction.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE (t:Task)'),
        expect.objectContaining({
          name: mockTask.name,
          description: mockTask.description,
          priority: mockTask.priority,
          status: mockTask.status,
          tags: mockTask.tags,
          project_id: mockTask.project_id,
        })
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        id: mockTask.id,
        name: mockTask.name,
        description: mockTask.description,
      }));
    });

    it('should create a task without project association', async () => {
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

      const expectedRecord = {
        get: jest.fn((key: string) => mockTask[key as keyof typeof mockTask] || null),
      };

      mockTransaction.run.mockResolvedValue({
        records: [expectedRecord],
      });

      const result = await taskService.createTask({
        name: mockTask.name,
        description: mockTask.description,
        priority: mockTask.priority,
        status: mockTask.status,
        tags: mockTask.tags,
      });

      expect(result).toEqual(expect.objectContaining({
        id: mockTask.id,
        name: mockTask.name,
        project_id: null,
      }));
    });

    it('should handle create task errors', async () => {
      const error = new Error('Database error');
      mockTransaction.run.mockRejectedValue(error);

      await expect(
        taskService.createTask({
          name: 'Test Task',
          description: 'Test Description',
        })
      ).rejects.toThrow('Database error');

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('getTaskById', () => {
    it('should retrieve a task by ID', async () => {
      const mockTask = {
        id: 'test-task-id',
        name: 'Test Task',
        description: 'A test task',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        tags: ['test'],
        project_id: 'project-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const expectedRecord = {
        get: jest.fn((key: string) => mockTask[key as keyof typeof mockTask] || null),
      };

      mockSession.executeRead.mockImplementation((callback: Function) =>
        callback({
          run: jest.fn().mockResolvedValue({
            records: [expectedRecord],
          }),
        })
      );

      const result = await taskService.getTaskById(mockTask.id);

      expect(mockSession.executeRead).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        id: mockTask.id,
        name: mockTask.name,
        status: mockTask.status,
      }));
    });

    it('should return null for non-existent task', async () => {
      mockSession.executeRead.mockImplementation((callback: Function) =>
        callback({
          run: jest.fn().mockResolvedValue({
            records: [],
          }),
        })
      );

      const result = await taskService.getTaskById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateTask', () => {
    it('should update a task successfully', async () => {
      const mockTask = {
        id: 'test-task-id',
        name: 'Test Task',
        description: 'Original description',
        priority: 'MEDIUM',
        status: 'TODO',
        tags: ['test'],
        project_id: 'project-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updates = {
        name: 'Updated Task Name',
        description: 'Updated description',
        status: 'IN_PROGRESS' as const,
        priority: 'HIGH' as const,
      };

      const expectedRecord = {
        get: jest.fn((key: string) => {
          const updatedTask = { ...mockTask, ...updates };
          return updatedTask[key as keyof typeof updatedTask] || null;
        }),
      };

      mockTransaction.run.mockResolvedValue({
        records: [expectedRecord],
      });

      const result = await taskService.updateTask(mockTask.id, updates);

      expect(mockSession.beginTransaction).toHaveBeenCalled();
      expect(mockTransaction.run).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (t:Task {id: $id})'),
        expect.objectContaining({
          id: mockTask.id,
          ...updates,
        })
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        id: mockTask.id,
        name: updates.name,
        description: updates.description,
        status: updates.status,
        priority: updates.priority,
      }));
    });
  });

  describe('deleteTask', () => {
    it('should delete a task successfully', async () => {
      const taskId = 'task-to-delete';

      mockTransaction.run.mockResolvedValue({
        summary: { counters: { nodesDeleted: () => 1 } },
      });

      const result = await taskService.deleteTask(taskId);

      expect(mockSession.beginTransaction).toHaveBeenCalled();
      expect(mockTransaction.run).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (t:Task {id: $id})'),
        { id: taskId }
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when task not found', async () => {
      const taskId = 'non-existent-task';

      mockTransaction.run.mockResolvedValue({
        summary: { counters: { nodesDeleted: () => 0 } },
      });

      const result = await taskService.deleteTask(taskId);

      expect(result).toBe(false);
    });
  });

  describe('listTasks', () => {
    it('should list all tasks with default options', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          name: 'Task 1',
          description: 'First task',
          priority: 'HIGH',
          status: 'TODO',
          tags: ['urgent'],
          project_id: 'project-123',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'task-2',
          name: 'Task 2',
          description: 'Second task',
          priority: 'MEDIUM',
          status: 'IN_PROGRESS',
          tags: ['normal'],
          project_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const expectedRecords = mockTasks.map(task => ({
        get: jest.fn((key: string) => task[key as keyof typeof task] || null),
      }));

      mockSession.executeRead.mockImplementation((callback: Function) =>
        callback({
          run: jest.fn().mockResolvedValue({
            records: expectedRecords,
          }),
        })
      );

      const result = await taskService.listTasks();

      expect(mockSession.executeRead).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({
        name: 'Task 1',
        priority: 'HIGH',
      }));
      expect(result[1]).toEqual(expect.objectContaining({
        name: 'Task 2',
        priority: 'MEDIUM',
      }));
    });

    it('should filter tasks by project', async () => {
      const projectTask = {
        id: 'project-task-1',
        name: 'Project Task',
        description: 'A task associated with a project',
        priority: 'HIGH',
        status: 'TODO',
        tags: ['project-work'],
        project_id: 'project-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const expectedRecord = {
        get: jest.fn((key: string) => projectTask[key as keyof typeof projectTask] || null),
      };

      mockSession.executeRead.mockImplementation((callback: Function) =>
        callback({
          run: jest.fn().mockResolvedValue({
            records: [expectedRecord],
          }),
        })
      );

      const result = await taskService.listTasks({
        project_id: 'project-123',
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        name: 'Project Task',
        project_id: 'project-123',
      }));
    });

    it('should filter tasks by status', async () => {
      const completedTask = {
        id: 'completed-task',
        name: 'Completed Task',
        description: 'A completed task',
        priority: 'MEDIUM',
        status: 'COMPLETED',
        tags: ['done'],
        project_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const expectedRecord = {
        get: jest.fn((key: string) => completedTask[key as keyof typeof completedTask] || null),
      };

      mockSession.executeRead.mockImplementation((callback: Function) =>
        callback({
          run: jest.fn().mockResolvedValue({
            records: [expectedRecord],
          }),
        })
      );

      const result = await taskService.listTasks({
        status: 'COMPLETED',
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        name: 'Completed Task',
        status: 'COMPLETED',
      }));
    });
  });
});