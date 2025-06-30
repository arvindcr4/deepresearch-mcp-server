/**
 * Unit Tests for ProjectService
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

describe('ProjectService', () => {
  let ProjectService: any;
  let projectService: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Dynamic import to ensure mocks are applied
    const module = await import('../projectService.js');
    ProjectService = module.ProjectService;
    projectService = new ProjectService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createProject', () => {
    it('should create a project successfully', async () => {
      const mockProject = global.testUtils.createMockProject();
      const expectedRecord = {
        get: jest.fn((key: string) => {
          const projectData = {
            id: mockProject.id,
            name: mockProject.name,
            description: mockProject.description,
            priority: mockProject.priority,
            status: mockProject.status,
            tags: mockProject.tags,
            created_at: mockProject.created_at,
            updated_at: mockProject.updated_at,
          };
          return projectData[key as keyof typeof projectData] || null;
        }),
      };

      mockTransaction.run.mockResolvedValue({
        records: [expectedRecord],
      });

      const result = await projectService.createProject({
        name: mockProject.name,
        description: mockProject.description,
        priority: mockProject.priority,
        status: mockProject.status,
        tags: mockProject.tags,
      });

      expect(mockSession.beginTransaction).toHaveBeenCalled();
      expect(mockTransaction.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE (p:Project)'),
        expect.objectContaining({
          name: mockProject.name,
          description: mockProject.description,
          priority: mockProject.priority,
          status: mockProject.status,
          tags: mockProject.tags,
        })
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        id: mockProject.id,
        name: mockProject.name,
        description: mockProject.description,
      }));
    });

    it('should handle create project errors', async () => {
      const error = new Error('Database error');
      mockTransaction.run.mockRejectedValue(error);

      await expect(
        projectService.createProject({
          name: 'Test Project',
          description: 'Test Description',
        })
      ).rejects.toThrow('Database error');

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('getProjectById', () => {
    it('should retrieve a project by ID', async () => {
      const mockProject = global.testUtils.createMockProject();
      const expectedRecord = {
        get: jest.fn((key: string) => mockProject[key as keyof typeof mockProject] || null),
      };

      mockSession.executeRead.mockImplementation((callback: Function) =>
        callback({
          run: jest.fn().mockResolvedValue({
            records: [expectedRecord],
          }),
        })
      );

      const result = await projectService.getProjectById(mockProject.id);

      expect(mockSession.executeRead).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        id: mockProject.id,
        name: mockProject.name,
      }));
    });

    it('should return null for non-existent project', async () => {
      mockSession.executeRead.mockImplementation((callback: Function) =>
        callback({
          run: jest.fn().mockResolvedValue({
            records: [],
          }),
        })
      );

      const result = await projectService.getProjectById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateProject', () => {
    it('should update a project successfully', async () => {
      const mockProject = global.testUtils.createMockProject();
      const updates = {
        name: 'Updated Project Name',
        description: 'Updated description',
        priority: 'HIGH' as const,
      };

      const expectedRecord = {
        get: jest.fn((key: string) => {
          const updatedProject = { ...mockProject, ...updates };
          return updatedProject[key as keyof typeof updatedProject] || null;
        }),
      };

      mockTransaction.run.mockResolvedValue({
        records: [expectedRecord],
      });

      const result = await projectService.updateProject(mockProject.id, updates);

      expect(mockSession.beginTransaction).toHaveBeenCalled();
      expect(mockTransaction.run).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (p:Project {id: $id})'),
        expect.objectContaining({
          id: mockProject.id,
          ...updates,
        })
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        id: mockProject.id,
        name: updates.name,
        description: updates.description,
        priority: updates.priority,
      }));
    });
  });

  describe('deleteProject', () => {
    it('should delete a project successfully', async () => {
      const projectId = 'project-to-delete';

      mockTransaction.run.mockResolvedValue({
        summary: { counters: { nodesDeleted: () => 1 } },
      });

      const result = await projectService.deleteProject(projectId);

      expect(mockSession.beginTransaction).toHaveBeenCalled();
      expect(mockTransaction.run).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (p:Project {id: $id})'),
        { id: projectId }
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when project not found', async () => {
      const projectId = 'non-existent-project';

      mockTransaction.run.mockResolvedValue({
        summary: { counters: { nodesDeleted: () => 0 } },
      });

      const result = await projectService.deleteProject(projectId);

      expect(result).toBe(false);
    });
  });

  describe('listProjects', () => {
    it('should list all projects with default options', async () => {
      const mockProjects = [
        global.testUtils.createMockProject({ name: 'Project 1' }),
        global.testUtils.createMockProject({ name: 'Project 2' }),
      ];

      const expectedRecords = mockProjects.map(project => ({
        get: jest.fn((key: string) => project[key as keyof typeof project] || null),
      }));

      mockSession.executeRead.mockImplementation((callback: Function) =>
        callback({
          run: jest.fn().mockResolvedValue({
            records: expectedRecords,
          }),
        })
      );

      const result = await projectService.listProjects();

      expect(mockSession.executeRead).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({
        name: 'Project 1',
      }));
      expect(result[1]).toEqual(expect.objectContaining({
        name: 'Project 2',
      }));
    });

    it('should filter projects by status', async () => {
      const activeProject = global.testUtils.createMockProject({ 
        name: 'Active Project', 
        status: 'ACTIVE' 
      });

      const expectedRecord = {
        get: jest.fn((key: string) => activeProject[key as keyof typeof activeProject] || null),
      };

      mockSession.executeRead.mockImplementation((callback: Function) =>
        callback({
          run: jest.fn().mockResolvedValue({
            records: [expectedRecord],
          }),
        })
      );

      const result = await projectService.listProjects({
        status: 'ACTIVE',
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        name: 'Active Project',
        status: 'ACTIVE',
      }));
    });

    it('should apply limit and skip for pagination', async () => {
      const mockProjects = [global.testUtils.createMockProject()];
      const expectedRecords = mockProjects.map(project => ({
        get: jest.fn((key: string) => project[key as keyof typeof project] || null),
      }));

      mockSession.executeRead.mockImplementation((callback: Function) =>
        callback({
          run: jest.fn().mockResolvedValue({
            records: expectedRecords,
          }),
        })
      );

      const result = await projectService.listProjects({
        limit: 10,
        skip: 5,
      });

      expect(mockSession.executeRead).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });
});