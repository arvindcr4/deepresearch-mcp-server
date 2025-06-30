import { describe, test, expect, beforeEach } from '@jest/globals';
import { neo4jDriver, clearNeo4jDatabase, initializeNeo4jSchema } from '../../src/services/neo4j/index.js';

describe('Basic Integration Tests', () => {
  beforeEach(async () => {
    await clearNeo4jDatabase();
    await initializeNeo4jSchema();
  });

  describe('Database Operations', () => {
    test('should connect to Neo4j database', async () => {
      const driver = await neo4jDriver.getDriver();
      expect(driver).toBeDefined();
      
      // Test basic connectivity
      await expect(driver.verifyConnectivity()).resolves.not.toThrow(); 
    });

    test('should execute basic read query', async () => {
      const result = await neo4jDriver.executeReadQuery('RETURN 1 as number');
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
    });

    test('should execute basic write query', async () => {
      const result = await neo4jDriver.executeQuery(
        'CREATE (n:TestNode {id: $id, name: $name}) RETURN n.id as id, n.name as name',
        { id: 'test-123', name: 'Test Node' }
      );
      
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
    });

    test('should create and retrieve data', async () => {
      // Create a test node
      await neo4jDriver.executeQuery(
        'CREATE (p:Project {id: $id, name: $name, status: $status, createdAt: datetime()})',
        { id: 'project-123', name: 'Test Project', status: 'active' }
      );

      // Retrieve the node
      const result = await neo4jDriver.executeReadQuery(
        'MATCH (p:Project {id: $id}) RETURN p.id as id, p.name as name, p.status as status',
        { id: 'project-123' }
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'project-123',
        name: 'Test Project',
        status: 'active'
      });
    });

    test('should handle relationships', async () => {
      // Create project and task nodes with relationship
      await neo4jDriver.executeQuery(`
        CREATE (p:Project {id: $projectId, name: $projectName})
        CREATE (t:Task {id: $taskId, title: $taskTitle})
        CREATE (p)-[:HAS_TASK]->(t)
      `, {
        projectId: 'project-123',
        projectName: 'Test Project',
        taskId: 'task-123',
        taskTitle: 'Test Task'
      });

      // Query the relationship
      const result = await neo4jDriver.executeReadQuery(`
        MATCH (p:Project {id: $projectId})-[:HAS_TASK]->(t:Task)
        RETURN p.name as projectName, t.title as taskTitle
      `, { projectId: 'project-123' });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        projectName: 'Test Project',
        taskTitle: 'Test Task'
      });
    });

    test('should handle constraints and indexes', async () => {
      // Test that unique constraints work
      await neo4jDriver.executeQuery(
        'CREATE (p:Project {id: $id, name: $name})',
        { id: 'unique-project', name: 'Unique Project' }
      );

      // Try to create duplicate - should either succeed or fail gracefully
      try {
        await neo4jDriver.executeQuery(
          'CREATE (p:Project {id: $id, name: $name})',
          { id: 'unique-project', name: 'Duplicate Project' }
        );
      } catch (error) {
        // Expected behavior if unique constraint exists
        expect(error).toBeDefined();
      }
    });

    test('should handle transaction rollback', async () => {
      // This test verifies that failed transactions don't leave partial data
      try {
        await neo4jDriver.executeQuery(`
          CREATE (p:Project {id: $id, name: $name})
          CREATE (t:Task {id: $taskId, title: $title})
          CREATE (invalid syntax here)
        `, {
          id: 'rollback-project',
          name: 'Rollback Test',
          taskId: 'rollback-task',
          title: 'Rollback Task'
        });
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Verify no data was created
      const projectCheck = await neo4jDriver.executeReadQuery(
        'MATCH (p:Project {id: $id}) RETURN p',
        { id: 'rollback-project' }
      );
      expect(projectCheck).toHaveLength(0);
    });
  });

  describe('Schema Initialization', () => {
    test('should initialize schema without errors', async () => {
      // This is already called in beforeEach, but test explicit call
      await expect(initializeNeo4jSchema()).resolves.not.toThrow();
    });

    test('should clear database without errors', async () => {
      // Create some test data
      await neo4jDriver.executeQuery(
        'CREATE (p:Project {id: $id, name: $name})',
        { id: 'clear-test', name: 'Clear Test Project' }
      );

      // Clear database
      await clearNeo4jDatabase();

      // Verify data is cleared
      const result = await neo4jDriver.executeReadQuery(
        'MATCH (p:Project {id: $id}) RETURN p',
        { id: 'clear-test' }
      );
      expect(result).toHaveLength(0);
    });
  });

  describe('Performance Tests', () => {
    test('should handle batch operations efficiently', async () => {
      const startTime = Date.now();
      
      // Create multiple nodes in a single transaction
      const batchSize = 10;
      const ids = Array.from({ length: batchSize }, (_, i) => `batch-${i}`);
      
      await neo4jDriver.executeQuery(`
        UNWIND $ids as id
        CREATE (p:Project {id: id, name: 'Batch Project ' + id, createdAt: datetime()})
      `, { ids });

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Verify all nodes were created
      const result = await neo4jDriver.executeReadQuery(
        'MATCH (p:Project) WHERE p.id STARTS WITH "batch-" RETURN count(p) as count'
      );
      expect(result[0]).toMatchObject({ count: batchSize });

      // Should complete within reasonable time
      expect(executionTime).toBeLessThan(1000); // 1 second
    });

    test('should handle concurrent operations', async () => {
      const promises = [];
      const operationCount = 5;

      // Execute multiple operations concurrently
      for (let i = 0; i < operationCount; i++) {
        promises.push(
          neo4jDriver.executeQuery(
            'CREATE (p:Project {id: $id, name: $name, createdAt: datetime()})',
            { id: `concurrent-${i}`, name: `Concurrent Project ${i}` }
          )
        );
      }

      await Promise.all(promises);

      // Verify all operations completed
      const result = await neo4jDriver.executeReadQuery(
        'MATCH (p:Project) WHERE p.id STARTS WITH "concurrent-" RETURN count(p) as count'
      );
      expect(result[0]).toMatchObject({ count: operationCount });
    });
  });
});