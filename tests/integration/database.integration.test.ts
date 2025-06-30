import { describe, test, expect, beforeEach, afterAll } from '@jest/globals';
import { neo4jDriver, clearNeo4jDatabase, initializeNeo4jSchema, closeNeo4jConnection } from '../../src/services/neo4j/index.js';

describe('Database Integration Tests', () => {
  beforeEach(async () => {
    await clearNeo4jDatabase();
    await initializeNeo4jSchema();
  });

  afterAll(async () => {
    await closeNeo4jConnection();
  });

  describe('Database Connection', () => {
    test('should connect to Neo4j database', async () => {
      const driver = await neo4jDriver.getDriver();
      expect(driver).toBeDefined();
      
      // Test basic connectivity
      await expect(driver.verifyConnectivity()).resolves.not.toThrow(); 
    });

    test('should execute read query', async () => {
      const result = await neo4jDriver.executeReadQuery('RETURN 1 as number');
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
    });

    test('should execute write query', async () => {
      const result = await neo4jDriver.executeQuery(
        'CREATE (n:TestNode {id: $id, name: $name}) RETURN n.id as id, n.name as name',
        { id: 'test-123', name: 'Test Node' }
      );
      
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
    });
  });

  describe('Database Operations', () => {
    test('should create and retrieve project data', async () => {
      // Create a test project
      const createResult = await neo4jDriver.executeQuery(
        'CREATE (p:Project {id: $id, name: $name, status: $status, createdAt: datetime()}) RETURN p',
        { id: 'project-123', name: 'Test Project', status: 'active' }
      );

      expect(createResult).toHaveLength(1);

      // Retrieve the project
      const retrieveResult = await neo4jDriver.executeReadQuery(
        'MATCH (p:Project {id: $id}) RETURN p.id as id, p.name as name, p.status as status',
        { id: 'project-123' }
      );

      expect(retrieveResult).toHaveLength(1);
      expect(retrieveResult[0]).toMatchObject({
        id: 'project-123',
        name: 'Test Project',
        status: 'active'
      });
    });

    test('should handle project-task relationships', async () => {
      // Create project and task with relationship
      await neo4jDriver.executeQuery(`
        CREATE (p:Project {id: $projectId, name: $projectName, status: 'active', createdAt: datetime()})
        CREATE (t:Task {id: $taskId, title: $taskTitle, status: 'active', createdAt: datetime()})
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
        RETURN p.name as projectName, t.title as taskTitle, count(t) as taskCount
      `, { projectId: 'project-123' });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        projectName: 'Test Project',
        taskTitle: 'Test Task',
        taskCount: 1
      });
    });

    test('should handle knowledge data', async () => {
      // Create knowledge node
      await neo4jDriver.executeQuery(`
        CREATE (k:Knowledge {
          id: $id, 
          title: $title, 
          description: $description,
          content: $content,
          tags: $tags,
          createdAt: datetime()
        })
      `, {
        id: 'knowledge-123',
        title: 'Test Knowledge',
        description: 'Knowledge for testing',
        content: 'This is test knowledge content',
        tags: ['test', 'integration']
      });

      // Retrieve knowledge
      const result = await neo4jDriver.executeReadQuery(`
        MATCH (k:Knowledge {id: $id}) 
        RETURN k.id as id, k.title as title, k.tags as tags
      `, { id: 'knowledge-123' });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'knowledge-123',
        title: 'Test Knowledge',
        tags: ['test', 'integration']
      });
    });
  });

  describe('Schema and Constraints', () => {
    test('should initialize schema successfully', async () => {
      await expect(initializeNeo4jSchema()).resolves.not.toThrow();
    });

    test('should clear database successfully', async () => {
      // Create some test data
      await neo4jDriver.executeQuery(
        'CREATE (p:Project {id: $id, name: $name})',
        { id: 'clear-test', name: 'Clear Test Project' }
      );

      // Clear database
      await clearNeo4jDatabase();

      // Verify data is cleared
      const result = await neo4jDriver.executeReadQuery('MATCH (n) RETURN count(n) as count');
      expect(result[0]).toMatchObject({ count: 0 });
    });
  });

  describe('Performance', () => {
    test('should handle batch operations', async () => {
      const batchSize = 5;
      const projectIds = Array.from({ length: batchSize }, (_, i) => `batch-project-${i}`);
      
      // Create multiple projects in one query
      await neo4jDriver.executeQuery(`
        UNWIND $projectIds as projectId
        CREATE (p:Project {
          id: projectId, 
          name: 'Batch Project ' + projectId,
          status: 'active',
          createdAt: datetime()
        })
      `, { projectIds });

      // Verify all projects were created
      const result = await neo4jDriver.executeReadQuery(`
        MATCH (p:Project) 
        WHERE p.id STARTS WITH 'batch-project-'
        RETURN count(p) as count
      `);

      expect(result[0]).toMatchObject({ count: batchSize });
    });

    test('should handle concurrent operations', async () => {
      const promises = [];
      const operationCount = 3;

      // Execute multiple operations concurrently
      for (let i = 0; i < operationCount; i++) {
        promises.push(
          neo4jDriver.executeQuery(
            'CREATE (p:Project {id: $id, name: $name, status: $status, createdAt: datetime()})',
            { 
              id: `concurrent-${i}`, 
              name: `Concurrent Project ${i}`,
              status: 'active'
            }
          )
        );
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(operationCount);

      // Verify all operations completed
      const countResult = await neo4jDriver.executeReadQuery(`
        MATCH (p:Project) 
        WHERE p.id STARTS WITH 'concurrent-'
        RETURN count(p) as count
      `);
      
      expect(countResult[0]).toMatchObject({ count: operationCount });
    });
  });
});