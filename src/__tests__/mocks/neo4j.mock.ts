/**
 * Neo4j Driver Mock
 * Provides mock implementation for Neo4j driver operations
 */

import { jest } from '@jest/globals';

// Mock data store
const mockDataStore = {
  projects: new Map(),
  tasks: new Map(),
  knowledge: new Map(),
  relationships: new Map(),
};

export const mockNeo4jDriver = {
  session: jest.fn(() => ({
    run: jest.fn(async (query: string, params: any = {}) => {
      const normalizedQuery = query.toLowerCase().trim();
      
      // Mock project operations
      if (normalizedQuery.includes('create (p:project)')) {
        const projectId = params.id || `project-${Date.now()}`;
        const project = {
          id: projectId,
          name: params.name || 'Test Project',
          description: params.description || 'Test Description',
          status: params.status || 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        mockDataStore.projects.set(projectId, project);
        
        return {
          records: [{
            get: (key: string) => project[key as keyof typeof project],
            toObject: () => ({ p: project }),
          }],
          summary: { counters: { nodesCreated: 1 } },
        };
      }
      
      // Mock project list
      if (normalizedQuery.includes('match (p:project)') && normalizedQuery.includes('return p')) {
        const projects = Array.from(mockDataStore.projects.values());
        return {
          records: projects.map(project => ({
            get: (key: string) => project[key as keyof typeof project],
            toObject: () => ({ p: project }),
          })),
          summary: { counters: {} },
        };
      }
      
      // Mock task operations
      if (normalizedQuery.includes('create (t:task)')) {
        const taskId = params.id || `task-${Date.now()}`;
        const task = {
          id: taskId,
          title: params.title || 'Test Task',
          description: params.description || 'Test Task Description',
          status: params.status || 'pending',
          priority: params.priority || 'medium',
          projectId: params.projectId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        mockDataStore.tasks.set(taskId, task);
        
        return {
          records: [{
            get: (key: string) => task[key as keyof typeof task],
            toObject: () => ({ t: task }),
          }],
          summary: { counters: { nodesCreated: 1 } },
        };
      }
      
      // Mock knowledge operations
      if (normalizedQuery.includes('create (k:knowledge)')) {
        const knowledgeId = params.id || `knowledge-${Date.now()}`;
        const knowledge = {
          id: knowledgeId,
          title: params.title || 'Test Knowledge',
          content: params.content || 'Test Knowledge Content',
          tags: params.tags || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        mockDataStore.knowledge.set(knowledgeId, knowledge);
        
        return {
          records: [{
            get: (key: string) => knowledge[key as keyof typeof knowledge],
            toObject: () => ({ k: knowledge }),
          }],
          summary: { counters: { nodesCreated: 1 } },
        };
      }
      
      // Mock delete operations
      if (normalizedQuery.includes('delete')) {
        return {
          records: [],
          summary: { counters: { nodesDeleted: 1 } },
        };
      }
      
      // Mock update operations
      if (normalizedQuery.includes('set')) {
        return {
          records: [],
          summary: { counters: { propertiesSet: 1 } },
        };
      }
      
      // Mock search operations
      if (normalizedQuery.includes('where') && normalizedQuery.includes('contains')) {
        const searchTerm = params.searchTerm?.toLowerCase() || '';
        let results: any[] = [];
        
        // Search projects
        const projects = Array.from(mockDataStore.projects.values()).filter(p => 
          p.name.toLowerCase().includes(searchTerm) || 
          p.description.toLowerCase().includes(searchTerm)
        );
        results = results.concat(projects.map(p => ({ type: 'project', ...p })));
        
        // Search tasks
        const tasks = Array.from(mockDataStore.tasks.values()).filter(t => 
          t.title.toLowerCase().includes(searchTerm) || 
          t.description.toLowerCase().includes(searchTerm)
        );
        results = results.concat(tasks.map(t => ({ type: 'task', ...t })));
        
        return {
          records: results.map(item => ({
            get: (key: string) => item[key as keyof typeof item],
            toObject: () => ({ item }),
          })),
          summary: { counters: {} },
        };
      }
      
      // Default empty result
      return {
        records: [],
        summary: { counters: {} },
      };
    }),
    close: jest.fn(),
  })),
  close: jest.fn(),
  verifyConnectivity: jest.fn().mockResolvedValue(true),
};

export const resetMockDataStore = () => {
  mockDataStore.projects.clear();
  mockDataStore.tasks.clear();
  mockDataStore.knowledge.clear();
  mockDataStore.relationships.clear();
};

export const getMockDataStore = () => mockDataStore;