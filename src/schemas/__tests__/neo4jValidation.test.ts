import { describe, it, expect } from '@jest/globals'
import {
  safeJsonParse,
  safeJsonParseArray,
  validateData,
  projectDataSchema,
  taskDataSchema,
  knowledgeDataSchema,
  urlObjectSchema,
  fullExportSchema,
  relationshipDataSchema,
} from '../neo4jValidation.js'

describe('Neo4j Validation', () => {
  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      const json = '{"name": "Test Project", "status": "active"}'
      const schema = projectDataSchema.pick({ name: true, status: true })
      const result = safeJsonParse(json, schema, 'test')
      expect(result).toEqual({ name: 'Test Project', status: 'active' })
    })

    it('should throw on invalid JSON syntax', () => {
      const json = '{"name": "Test Project", invalid}'
      const schema = projectDataSchema
      expect(() => safeJsonParse(json, schema, 'test')).toThrow(
        'Invalid JSON in test'
      )
    })

    it('should throw on schema validation failure', () => {
      const json = '{"name": "", "status": "invalid-status"}'
      const schema = projectDataSchema.pick({ name: true, status: true })
      expect(() => safeJsonParse(json, schema, 'test')).toThrow(
        'Validation failed in test'
      )
    })

    it('should prevent injection attacks', () => {
      const maliciousJson =
        '{"name": "Test<script>alert(1)</script>", "status": "active"}'
      const schema = projectDataSchema.pick({ name: true, status: true })
      // Should parse but the content is just a string, not executed
      const result = safeJsonParse(maliciousJson, schema, 'test')
      expect(result.name).toBe('Test<script>alert(1)</script>')
    })
  })

  describe('safeJsonParseArray', () => {
    it('should parse valid URL array', () => {
      const json = '[{"title": "Google", "url": "https://google.com"}]'
      const result = safeJsonParseArray(json, urlObjectSchema, 'urls')
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({ title: 'Google', url: 'https://google.com' })
    })

    it('should return empty array on null/undefined', () => {
      expect(safeJsonParseArray(null, urlObjectSchema, 'urls')).toEqual([])
      expect(safeJsonParseArray(undefined, urlObjectSchema, 'urls')).toEqual([])
      expect(safeJsonParseArray('', urlObjectSchema, 'urls')).toEqual([])
    })

    it('should return empty array on parse error', () => {
      const invalidJson = '[{invalid}]'
      const result = safeJsonParseArray(invalidJson, urlObjectSchema, 'urls')
      expect(result).toEqual([])
    })

    it('should validate array items', () => {
      const json = '[{"title": "", "url": "not-a-url"}]'
      const result = safeJsonParseArray(json, urlObjectSchema, 'urls')
      expect(result).toEqual([]) // Returns empty on validation failure
    })
  })

  describe('Project validation', () => {
    it('should validate complete project data', () => {
      const projectData = {
        name: 'Test Project',
        description: 'A test project',
        status: 'active' as const,
        urls: [{ title: 'Docs', url: 'https://example.com' }],
        completionRequirements: 'Complete all tasks',
        outputFormat: 'JSON',
        taskType: 'development',
      }
      const result = validateData(projectData, projectDataSchema, 'project')
      expect(result).toMatchObject(projectData)
    })

    it('should reject invalid status', () => {
      const projectData = {
        name: 'Test',
        description: 'Test',
        status: 'invalid-status',
        urls: [],
        completionRequirements: '',
        outputFormat: '',
        taskType: '',
      }
      expect(() =>
        validateData(projectData, projectDataSchema, 'project')
      ).toThrow()
    })

    it('should enforce URL limit', () => {
      const urls = Array(51).fill({ title: 'Test', url: 'https://example.com' })
      const projectData = {
        name: 'Test',
        description: 'Test',
        status: 'active' as const,
        urls,
        completionRequirements: '',
        outputFormat: '',
        taskType: '',
      }
      expect(() =>
        validateData(projectData, projectDataSchema, 'project')
      ).toThrow('Cannot have more than 50 URLs')
    })
  })

  describe('Task validation', () => {
    it('should validate task with assignedTo', () => {
      const taskData = {
        projectId: 'proj_123',
        title: 'Test Task',
        description: 'A test task',
        priority: 'medium' as const,
        status: 'todo' as const,
        assignedTo: 'user_456',
        urls: [],
        tags: ['test', 'validation'],
        completionRequirements: 'Pass all tests',
        outputFormat: 'Report',
        taskType: 'testing',
      }
      const result = validateData(taskData, taskDataSchema, 'task')
      expect(result).toMatchObject(taskData)
    })

    it('should allow null assignedTo', () => {
      const taskData = {
        projectId: 'proj_123',
        title: 'Test Task',
        description: 'A test task',
        priority: 'medium' as const,
        status: 'todo' as const,
        assignedTo: null,
        urls: [],
        tags: [],
        completionRequirements: '',
        outputFormat: '',
        taskType: '',
      }
      const result = validateData(taskData, taskDataSchema, 'task')
      expect(result.assignedTo).toBeNull()
    })

    it('should validate tag format', () => {
      const taskData = {
        projectId: 'proj_123',
        title: 'Test',
        description: 'Test',
        priority: 'low' as const,
        status: 'backlog' as const,
        urls: [],
        tags: ['valid-tag', 'another_tag', 'tag123'],
        completionRequirements: '',
        outputFormat: '',
        taskType: '',
      }
      const result = validateData(taskData, taskDataSchema, 'task')
      expect(result.tags).toHaveLength(3)
    })

    it('should reject invalid tags', () => {
      const taskData = {
        projectId: 'proj_123',
        title: 'Test',
        description: 'Test',
        priority: 'low' as const,
        status: 'backlog' as const,
        urls: [],
        tags: ['invalid tag with spaces'],
        completionRequirements: '',
        outputFormat: '',
        taskType: '',
      }
      expect(() => validateData(taskData, taskDataSchema, 'task')).toThrow()
    })
  })

  describe('Knowledge validation', () => {
    it('should validate knowledge with domain and citations', () => {
      const knowledgeData = {
        projectId: 'proj_123',
        text: 'This is important knowledge',
        tags: ['important', 'knowledge'],
        domain: 'Technology',
        citations: ['https://source1.com', 'https://source2.com'],
      }
      const result = validateData(
        knowledgeData,
        knowledgeDataSchema,
        'knowledge'
      )
      expect(result).toMatchObject(knowledgeData)
    })

    it('should enforce text length limit', () => {
      const knowledgeData = {
        projectId: 'proj_123',
        text: 'x'.repeat(50001), // Exceeds 50000 character limit
        tags: [],
        domain: 'Test',
      }
      expect(() =>
        validateData(knowledgeData, knowledgeDataSchema, 'knowledge')
      ).toThrow('cannot exceed 50000 characters')
    })
  })

  describe('Relationship validation', () => {
    it('should validate relationship data', () => {
      const relationshipData = {
        startNodeId: 'proj_123',
        endNodeId: 'proj_456',
        type: 'DEPENDS_ON',
        properties: { description: 'Test dependency' },
      }
      const result = validateData(
        relationshipData,
        relationshipDataSchema,
        'relationship'
      )
      expect(result).toMatchObject(relationshipData)
    })
  })

  describe('Full export validation', () => {
    it('should validate full export structure', () => {
      const exportData = {
        nodes: {
          Project: [{ id: 'proj_1', name: 'Test' }],
          Task: [{ id: 'task_1', title: 'Test Task' }],
        },
        relationships: [
          {
            startNodeId: 'proj_1',
            endNodeId: 'task_1',
            type: 'CONTAINS_TASK',
            properties: {},
          },
        ],
      }
      const result = validateData(exportData, fullExportSchema, 'export')
      expect(result).toMatchObject(exportData)
    })
  })

  describe('Security tests', () => {
    it('should sanitize malicious ID patterns', () => {
      const maliciousData = {
        projectId: 'proj_123; DROP TABLE Projects;--',
        title: 'Test',
        description: 'Test',
        priority: 'low' as const,
        status: 'todo' as const,
        urls: [],
        tags: [],
        completionRequirements: '',
        outputFormat: '',
        taskType: '',
      }
      expect(() =>
        validateData(maliciousData, taskDataSchema, 'task')
      ).toThrow()
    })

    it('should prevent prototype pollution', () => {
      const maliciousJson =
        '{"__proto__": {"isAdmin": true}, "name": "Test", "status": "active"}'
      const schema = projectDataSchema.pick({ name: true, status: true })
      const result = safeJsonParse(maliciousJson, schema, 'test')
      expect((Object.prototype as any).isAdmin).toBeUndefined()
    })
  })
})
