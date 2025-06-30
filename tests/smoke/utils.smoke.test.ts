import { logger } from '../../src/utils/logger.js';
import { closeNeo4jConnection } from '../../src/services/neo4j/index.js';

// Import some utility functions to test
import { generateId } from '../../src/services/neo4j/helpers.js';

describe('Utilities smoke test', () => {
  afterAll(async () => {
    await closeNeo4jConnection();
  });

  test('should have working logger', () => {
    expect(logger).toBeDefined();
    
    // Test that logger methods exist and can be called without throwing
    expect(() => logger.info('Test log message')).not.toThrow();
    expect(() => logger.error('Test error message')).not.toThrow();
    expect(() => logger.warn('Test warn message')).not.toThrow();
    expect(() => logger.debug('Test debug message')).not.toThrow();
  });

  test('should generate unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    
    expect(typeof id1).toBe('string');
    expect(typeof id2).toBe('string');
    expect(id1).not.toBe(id2);
    expect(id1.length).toBeGreaterThan(0);
    expect(id2.length).toBeGreaterThan(0);
  });

  test('should generate multiple unique IDs consistently', () => {
    const ids = new Set();
    const count = 10;
    
    for (let i = 0; i < count; i++) {
      ids.add(generateId());
    }
    
    // All generated IDs should be unique
    expect(ids.size).toBe(count);
  });
});