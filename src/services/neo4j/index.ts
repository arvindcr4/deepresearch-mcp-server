/**
 * Neo4j Services Module
 * 
 * This module exports all Neo4j database services to provide a unified API for interacting
 * with the Neo4j graph database. It encapsulates the complexity of Neo4j queries and
 * transactions, providing a clean interface for application code.
 */

// Export core database driver and utilities
// Removed: export { autoExportManager } from './backup_services/autoExportManager.js';
export { neo4jDriver } from './driver.js';
export { databaseEvents, DatabaseEventType } from './events.js';
export * from './helpers.js';
export { Neo4jUtils } from './utils.js';

// Export entity services
// Removed backup_services exports
export { KnowledgeService } from './knowledgeService.js';
export { ProjectService } from './projectService.js';
export { SearchService } from './searchService.js';
export type { SearchResultItem } from './searchService.js';
export { TaskService } from './taskService.js';

// Export common types
export * from './types.js';

/**
 * Initialize the Neo4j database and related services
 * Should be called at application startup
 */
// Removed initializeNeo4jServices function as it relied on backup_services

/**
 * Initialize the Neo4j database schema
 * Should be called at application startup
 */
export async function initializeNeo4jSchema(): Promise<void> {
  const { Neo4jUtils } = await import('./utils.js');
  return Neo4jUtils.initializeSchema();
}

// Removed restoreFromLatestBackup function
// Removed getLatestBackupFile function
// Removed createManualBackup function

/**
 * Clear and reset the Neo4j database
 * WARNING: This permanently deletes all data
 */
export async function clearNeo4jDatabase(): Promise<void> {
  const { Neo4jUtils } = await import('./utils.js');
  return Neo4jUtils.clearDatabase();
}

/**
 * Close the Neo4j database connection
 * Should be called when shutting down the application
 */
export async function closeNeo4jConnection(): Promise<void> {
  const { neo4jDriver } = await import('./driver.js');
  return neo4jDriver.close();
}
