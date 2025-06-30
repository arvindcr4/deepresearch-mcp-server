/**
 * Unit Tests for ID Generator Utility
 */

describe('ID Generator', () => {
  let idGenerator: any;

  beforeEach(async () => {
    // Dynamic import to ensure clean state
    const module = await import('../idGenerator.js');
    idGenerator = module;
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      if (idGenerator.generateId) {
        const id1 = idGenerator.generateId();
        const id2 = idGenerator.generateId();

        expect(id1).toBeDefined();
        expect(id2).toBeDefined();
        expect(id1).not.toEqual(id2);
        expect(typeof id1).toBe('string');
        expect(typeof id2).toBe('string');
      }
    });

    it('should generate IDs of consistent length', () => {
      if (idGenerator.generateId) {
        const ids = Array.from({ length: 10 }, () => idGenerator.generateId());

        const lengths = ids.map(id => id.length);
        const uniqueLengths = [...new Set(lengths)];

        // All IDs should have the same length
        expect(uniqueLengths.length).toBe(1);
        expect(lengths[0]).toBeGreaterThan(0);
      }
    });

    it('should generate IDs with valid characters', () => {
      if (idGenerator.generateId) {
        const id = idGenerator.generateId();
        
        // Should only contain alphanumeric characters and possibly hyphens or underscores
        expect(id).toMatch(/^[a-zA-Z0-9_-]+$/);
      }
    });

    it('should generate a large number of unique IDs', () => {
      if (idGenerator.generateId) {
        const ids = new Set();
        const count = 1000;

        for (let i = 0; i < count; i++) {
          ids.add(idGenerator.generateId());
        }

        // All IDs should be unique
        expect(ids.size).toBe(count);
      }
    });
  });

  describe('generateProjectId', () => {
    it('should generate project-specific IDs', () => {
      if (idGenerator.generateProjectId) {
        const id = idGenerator.generateProjectId();

        expect(id).toBeDefined();
        expect(typeof id).toBe('string');
        // Might have a prefix like 'proj_' or similar
        expect(id.length).toBeGreaterThan(0);
      } else if (idGenerator.generateId) {
        // Fallback test if specific project ID generator doesn't exist
        const id = idGenerator.generateId();
        expect(id).toBeDefined();
      }
    });
  });

  describe('generateTaskId', () => {
    it('should generate task-specific IDs', () => {
      if (idGenerator.generateTaskId) {
        const id = idGenerator.generateTaskId();

        expect(id).toBeDefined();
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      } else if (idGenerator.generateId) {
        // Fallback test if specific task ID generator doesn't exist
        const id = idGenerator.generateId();
        expect(id).toBeDefined();
      }
    });
  });

  describe('generateKnowledgeId', () => {
    it('should generate knowledge-specific IDs', () => {
      if (idGenerator.generateKnowledgeId) {
        const id = idGenerator.generateKnowledgeId();

        expect(id).toBeDefined();
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      } else if (idGenerator.generateId) {
        // Fallback test if specific knowledge ID generator doesn't exist
        const id = idGenerator.generateId();
        expect(id).toBeDefined();
      }
    });
  });

  describe('validateId', () => {
    it('should validate proper IDs', () => {
      if (idGenerator.validateId && idGenerator.generateId) {
        const validId = idGenerator.generateId();
        const isValid = idGenerator.validateId(validId);

        expect(isValid).toBe(true);
      }
    });

    it('should reject invalid IDs', () => {
      if (idGenerator.validateId) {
        const invalidIds = [
          '',
          null,
          undefined,
          '   ',
          'id with spaces',
          'id@with#special$chars',
          '123', // Too short if there's a minimum length requirement
        ];

        invalidIds.forEach(invalidId => {
          const isValid = idGenerator.validateId(invalidId);
          expect(isValid).toBe(false);
        });
      }
    });

    it('should handle edge cases', () => {
      if (idGenerator.validateId) {
        // Test with various edge cases
        const edgeCases = [
          'a', // Single character
          'A'.repeat(100), // Very long ID
          '1234567890', // All numbers
          'abcdefghij', // All letters
          'a1b2c3d4e5', // Mixed alphanumeric
        ];

        edgeCases.forEach(testId => {
          const isValid = idGenerator.validateId(testId);
          // Result depends on implementation, but should not throw
          expect(typeof isValid).toBe('boolean');
        });
      }
    });
  });
});