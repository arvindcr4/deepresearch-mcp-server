import { config } from '../../src/config/index.js';

describe('Configuration smoke test', () => {
  test('should load configuration successfully', () => {
    expect(config).toBeDefined();
    expect(config.mcpServerName).toBeDefined();
    expect(config.mcpServerVersion).toBeDefined();
    expect(config.neo4jUri).toBeDefined();
    expect(config.neo4jUser).toBeDefined();
    expect(config.neo4jPassword).toBeDefined();
  });

  test('should have valid neo4j configuration', () => {
    expect(config.neo4jUri).toMatch(/^bolt:\/\//);
    expect(config.neo4jUser).toBeTruthy();
    expect(config.neo4jPassword).toBeTruthy();
  });

  test('should have valid backup configuration', () => {
    expect(config.backup).toBeDefined();
    expect(config.backup.maxBackups).toBeGreaterThan(0);
    expect(config.backup.backupPath).toBeTruthy();
  });

  test('should have valid security configuration', () => {
    expect(config.security).toBeDefined();
    expect(typeof config.security.authRequired).toBe('boolean');
  });

  test('should have valid log level', () => {
    const validLogLevels = ['error', 'warn', 'info', 'debug', 'verbose', 'silly'];
    expect(validLogLevels).toContain(config.logLevel);
  });

  test('should have valid environment setting', () => {
    const validEnvironments = ['development', 'production', 'test'];
    expect(validEnvironments).toContain(config.environment);
  });
});