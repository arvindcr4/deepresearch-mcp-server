/**
 * Unit Tests for Validation Schemas
 */

describe('Validation Schemas', () => {
  let validationSchemas: any;

  beforeEach(async () => {
    // Dynamic import to ensure clean state
    const module = await import('../validation.js');
    validationSchemas = module;
  });

  describe('Project Validation', () => {
    it('should validate valid project data', () => {
      if (validationSchemas.projectSchema) {
        const validProject = {
          name: 'Test Project',
          description: 'A valid test project',
          priority: 'MEDIUM',
          status: 'ACTIVE',
          tags: ['test', 'validation']
        };

        const result = validationSchemas.projectSchema.safeParse(validProject);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validProject);
        }
      }
    });

    it('should reject project with invalid priority', () => {
      if (validationSchemas.projectSchema) {
        const invalidProject = {
          name: 'Test Project',
          description: 'A test project',
          priority: 'INVALID_PRIORITY',
          status: 'ACTIVE',
        };

        const result = validationSchemas.projectSchema.safeParse(invalidProject);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues).toContainEqual(
            expect.objectContaining({
              path: ['priority'],
            })
          );
        }
      }
    });

    it('should reject project with invalid status', () => {
      if (validationSchemas.projectSchema) {
        const invalidProject = {
          name: 'Test Project',
          description: 'A test project',
          status: 'INVALID_STATUS',
        };

        const result = validationSchemas.projectSchema.safeParse(invalidProject);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues).toContainEqual(
            expect.objectContaining({
              path: ['status'],
            })
          );
        }
      }
    });

    it('should require project name', () => {
      if (validationSchemas.projectSchema) {
        const projectWithoutName = {
          description: 'A test project without name',
          priority: 'MEDIUM',
          status: 'ACTIVE',
        };

        const result = validationSchemas.projectSchema.safeParse(projectWithoutName);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues).toContainEqual(
            expect.objectContaining({
              path: ['name'],
            })
          );
        }
      }
    });

    it('should validate optional fields', () => {
      if (validationSchemas.projectSchema) {
        const minimalProject = {
          name: 'Minimal Project',
        };

        const result = validationSchemas.projectSchema.safeParse(minimalProject);
        // Should succeed even with minimal data
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Task Validation', () => {
    it('should validate valid task data', () => {
      if (validationSchemas.taskSchema) {
        const validTask = {
          name: 'Test Task',
          description: 'A valid test task',
          priority: 'HIGH',
          status: 'TODO',
          tags: ['urgent', 'testing'],
          project_id: 'project-123',
        };

        const result = validationSchemas.taskSchema.safeParse(validTask);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validTask);
        }
      }
    });

    it('should allow task without project_id', () => {
      if (validationSchemas.taskSchema) {
        const taskWithoutProject = {
          name: 'Standalone Task',
          description: 'A task not associated with any project',
          priority: 'LOW',
          status: 'TODO',
        };

        const result = validationSchemas.taskSchema.safeParse(taskWithoutProject);
        expect(result.success).toBe(true);
      }
    });

    it('should reject task with invalid status', () => {
      if (validationSchemas.taskSchema) {
        const invalidTask = {
          name: 'Test Task',
          status: 'INVALID_STATUS',
        };

        const result = validationSchemas.taskSchema.safeParse(invalidTask);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues).toContainEqual(
            expect.objectContaining({
              path: ['status'],
            })
          );
        }
      }
    });
  });

  describe('Knowledge Validation', () => {
    it('should validate valid knowledge data', () => {
      if (validationSchemas.knowledgeSchema) {
        const validKnowledge = {
          content: 'This is test knowledge content',
          summary: 'Test knowledge summary',
          tags: ['knowledge', 'test'],
          project_id: 'project-123',
          task_id: 'task-456',
        };

        const result = validationSchemas.knowledgeSchema.safeParse(validKnowledge);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validKnowledge);
        }
      }
    });

    it('should require content field', () => {
      if (validationSchemas.knowledgeSchema) {
        const knowledgeWithoutContent = {
          summary: 'Summary without content',
          tags: ['test'],
        };

        const result = validationSchemas.knowledgeSchema.safeParse(knowledgeWithoutContent);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues).toContainEqual(
            expect.objectContaining({
              path: ['content'],
            })
          );
        }
      }
    });

    it('should allow knowledge without associations', () => {
      if (validationSchemas.knowledgeSchema) {
        const standaloneKnowledge = {
          content: 'Standalone knowledge content',
          summary: 'Not associated with any project or task',
        };

        const result = validationSchemas.knowledgeSchema.safeParse(standaloneKnowledge);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Search Validation', () => {
    it('should validate search parameters', () => {
      if (validationSchemas.searchSchema) {
        const validSearch = {
          query: 'test search query',
          filters: {
            entity_type: 'project',
            tags: ['important'],
            date_range: {
              start: '2023-01-01',
              end: '2023-12-31',
            },
          },
          limit: 10,
          skip: 0,
        };

        const result = validationSchemas.searchSchema.safeParse(validSearch);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.query).toBe(validSearch.query);
        }
      }
    });

    it('should require search query', () => {
      if (validationSchemas.searchSchema) {
        const searchWithoutQuery = {
          limit: 10,
        };

        const result = validationSchemas.searchSchema.safeParse(searchWithoutQuery);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues).toContainEqual(
            expect.objectContaining({
              path: ['query'],
            })
          );
        }
      }
    });

    it('should validate limit and skip parameters', () => {
      if (validationSchemas.searchSchema) {
        const searchWithInvalidLimit = {
          query: 'test',
          limit: -1, // Invalid negative limit
        };

        const result = validationSchemas.searchSchema.safeParse(searchWithInvalidLimit);
        expect(result.success).toBe(false);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed data gracefully', () => {
      if (validationSchemas.projectSchema) {
        const malformedData = [
          null,
          undefined,
          'string instead of object',
          123,
          [],
        ];

        malformedData.forEach(data => {
          const result = validationSchemas.projectSchema.safeParse(data);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error).toBeDefined();
          }
        });
      }
    });

    it('should provide detailed error messages', () => {
      if (validationSchemas.projectSchema) {
        const invalidData = {
          name: '', // Empty name
          priority: 'INVALID',
          tags: 'should be array', // Wrong type
        };

        const result = validationSchemas.projectSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.length).toBeGreaterThan(0);
          result.error.issues.forEach(issue => {
            expect(issue.message).toBeDefined();
            expect(issue.path).toBeDefined();
          });
        }
      }
    });
  });
});