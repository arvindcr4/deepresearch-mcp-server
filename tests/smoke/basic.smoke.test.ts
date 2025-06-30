import { config } from '../../src/config/index.js';
import { logger } from '../../src/utils/logger.js';
import { closeNeo4jConnection } from '../../src/services/neo4j/index.js';

describe('Basic smoke test', () => {
  afterAll(async () => {
    await closeNeo4jConnection();
  });

  test('should load core configuration', () => {
    expect(config).toBeDefined();
    expect(config.mcpServerName).toBe('deepresearch-mcp-server');
    expect(config.neo4jUri).toBeDefined();
    expect(config.neo4jUser).toBeDefined();
    expect(config.neo4jPassword).toBeDefined();
  });

  test('should have logger instance', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  test('should handle environment variables', () => {
    // Test that required environment variables are accessible
    expect(process.env.NODE_ENV).toBeDefined();
    
    // Test that config picks up environment or defaults properly
    expect(config.environment).toMatch(/^(development|production|test)$/);
    expect(config.logLevel).toMatch(/^(error|warn|info|debug|verbose|silly)$/);
  });

  test('should have backup configuration', () => {
    expect(config.backup).toBeDefined();
    expect(config.backup.maxBackups).toBeGreaterThan(0);
    expect(config.backup.backupPath).toBeTruthy();
    expect(typeof config.backup.backupPath).toBe('string');
  });

  test('should have security configuration', () => {
    expect(config.security).toBeDefined();
    expect(typeof config.security.authRequired).toBe('boolean');
  });
});