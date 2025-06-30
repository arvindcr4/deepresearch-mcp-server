import { neo4jDriver, closeNeo4jConnection } from '../../src/services/neo4j/index.js';

describe('Database smoke test', () => {
  afterAll(async () => {
    await closeNeo4jConnection();
  });

  test('should create neo4j driver instance', async () => {
    const driver = await neo4jDriver.getDriver();
    expect(driver).toBeDefined();
  });

  test('should connect to neo4j database', async () => {
    const driver = await neo4jDriver.getDriver();
    const isConnected = await driver.verifyConnectivity();
    expect(isConnected).toBeUndefined(); // verifyConnectivity returns void on success
  }, 10000);

  test('should execute basic query successfully', async () => {
    const result = await neo4jDriver.executeReadQuery('RETURN 1 as test');
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  test('should handle database node count queries', async () => {
    try {
      // Test that we can query node count (should not throw)
      const result = await neo4jDriver.executeReadQuery('MATCH (n) RETURN count(n) as nodeCount');
      expect(result).toBeDefined();
    } catch (error) {
      // This should not fail for a basic query
      throw error;
    }
  });
});