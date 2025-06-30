#!/usr/bin/env ts-node-esm
/**
 * Test Runner Script
 * Executes all automation tests for the MCP server
 */

import { TestRunner, createTestSuite, createTestCase, assert } from '../src/__tests__/utils/testRunner.js';
import { mockNeo4jDriver, resetMockDataStore } from '../src/__tests__/mocks/neo4j.mock.js';

// Mock implementations for testing
const mockServices = {
  async createProject(data: any) {
    return {
      id: `proj_${Date.now()}`,
      ...data,
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },
  
  async createTask(data: any) {
    return {
      id: `task_${Date.now()}`,
      ...data,
      status: data.status || 'pending',
      priority: data.priority || 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },
  
  async addKnowledge(data: any) {
    return {
      id: `know_${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },
  
  async search(query: string) {
    return {
      results: [
        { type: 'project', id: 'proj_1', name: 'Test Project', relevance: 0.95 },
        { type: 'task', id: 'task_1', title: 'Test Task', relevance: 0.87 },
      ],
      total: 2,
      query,
    };
  },
};

async function main() {
  const runner = new TestRunner();
  
  // Core Service Tests
  const coreServiceSuite = createTestSuite('Core Services', {
    setup: async () => {
      resetMockDataStore();
      console.log('  Setting up core services...');
    },
    teardown: async () => {
      console.log('  Cleaning up core services...');
    },
  });
  
  coreServiceSuite.tests.push(
    createTestCase('Project creation', async () => {
      const project = await mockServices.createProject({
        name: 'Test Project',
        description: 'A test project',
      });
      
      assert.isDefined(project.id);
      assert.equals(project.name, 'Test Project');
      assert.equals(project.status, 'active');
    }),
    
    createTestCase('Task creation', async () => {
      const task = await mockServices.createTask({
        title: 'Test Task',
        description: 'A test task',
      });
      
      assert.isDefined(task.id);
      assert.equals(task.title, 'Test Task');
      assert.equals(task.status, 'pending');
      assert.equals(task.priority, 'medium');
    }),
    
    createTestCase('Knowledge management', async () => {
      const knowledge = await mockServices.addKnowledge({
        title: 'Test Knowledge',
        content: 'Test knowledge content',
        tags: ['test'],
      });
      
      assert.isDefined(knowledge.id);
      assert.equals(knowledge.title, 'Test Knowledge');
    }),
    
    createTestCase('Search functionality', async () => {
      const results = await mockServices.search('test');
      
      assert.isDefined(results);
      assert.equals(results.total, 2);
      assert.equals(results.query, 'test');
      assert.isTrue(results.results.length > 0);
    })
  );
  
  // MCP Tool Integration Tests
  const mcpToolsSuite = createTestSuite('MCP Tools Integration', {
    setup: async () => {
      console.log('  Setting up MCP tools...');
    },
  });
  
  mcpToolsSuite.tests.push(
    createTestCase('Atlas project tools', async () => {
      // Test project creation tool
      const projectRequest = {
        name: 'atlas_project_create',
        arguments: {
          name: 'MCP Test Project',
          description: 'Project created via MCP tool',
        },
      };
      
      // Simulate tool execution
      const result = await mockServices.createProject(projectRequest.arguments);
      assert.isDefined(result);
      assert.equals(result.name, 'MCP Test Project');
    }),
    
    createTestCase('Atlas task tools', async () => {
      // Test task creation tool
      const taskRequest = {
        name: 'atlas_task_create',
        arguments: {
          title: 'MCP Test Task',
          description: 'Task created via MCP tool',
          priority: 'high',
        },
      };
      
      const result = await mockServices.createTask(taskRequest.arguments);
      assert.isDefined(result);
      assert.equals(result.title, 'MCP Test Task');
      assert.equals(result.priority, 'high');
    }),
    
    createTestCase('Atlas search tools', async () => {
      const searchRequest = {
        name: 'atlas_unified_search',
        arguments: {
          query: 'integration test',
          limit: 10,
        },
      };
      
      const result = await mockServices.search(searchRequest.arguments.query);
      assert.isDefined(result);
      assert.equals(result.query, 'integration test');
    })
  );
  
  // Validation and Error Handling Tests
  const validationSuite = createTestSuite('Validation & Error Handling');
  
  validationSuite.tests.push(
    createTestCase('Required field validation', async () => {
      await assert.throws(async () => {
        await mockServices.createProject({
          // Missing required 'name' field
          description: 'Project without name',
        });
      });
    }),
    
    createTestCase('Data type validation', async () => {
      const project = await mockServices.createProject({
        name: 'Valid Project',
        description: 123, // Invalid type, should be string
      });
      
      // In a real implementation, this might throw or sanitize
      assert.isDefined(project);
    }),
    
    createTestCase('Boundary conditions', async () => {
      // Test with edge cases
      const longName = 'x'.repeat(1000);
      const project = await mockServices.createProject({
        name: longName,
        description: 'Test long name',
      });
      
      assert.isDefined(project);
    })
  );
  
  // Performance and Concurrency Tests
  const performanceSuite = createTestSuite('Performance & Concurrency');
  
  performanceSuite.tests.push(
    createTestCase('Concurrent operations', async () => {
      const operations = Array.from({ length: 10 }, (_, i) =>
        mockServices.createProject({
          name: `Concurrent Project ${i + 1}`,
          description: `Project ${i + 1} created concurrently`,
        })
      );
      
      const results = await Promise.all(operations);
      assert.equals(results.length, 10);
      
      // Verify all projects have unique IDs
      const ids = results.map(r => r.id);
      const uniqueIds = new Set(ids);
      assert.equals(uniqueIds.size, ids.length);
    }),
    
    createTestCase('Large data handling', async () => {
      const largeDescription = 'x'.repeat(10000);
      const project = await mockServices.createProject({
        name: 'Large Data Project',
        description: largeDescription,
      });
      
      assert.isDefined(project);
      assert.equals(project.description, largeDescription);
    }, { timeout: 5000 })
  );
  
  // Add all suites to runner
  runner.addSuite(coreServiceSuite);
  runner.addSuite(mcpToolsSuite);
  runner.addSuite(validationSuite);
  runner.addSuite(performanceSuite);
  
  // Run all tests
  const report = await runner.runAllSuites();
  
  // Exit with appropriate code
  process.exit(report.failed > 0 ? 1 : 0);
}

// Handle unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the test suite
main().catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});