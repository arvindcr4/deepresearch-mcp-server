import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { ProjectStatus, createProjectStatusEnum } from '../../../types/mcp.js';
import { createToolExample, createToolMetadata, registerTool } from '../../../types/tool.js';
import { atlasUpdateProject } from './updateProject.js';
import { AtlasProjectUpdateSchemaShape } from './types.js';

export const registerAtlasProjectUpdateTool = (server: McpServer) => {
  registerTool(
    server,
    "atlas_project_update",
    "Modifies attributes of existing project entities within the system with support for both targeted single updates and efficient bulk modifications",
    AtlasProjectUpdateSchemaShape,
    atlasUpdateProject,
    createToolMetadata({
      examples: [
        createToolExample(
          {
            mode: "single",
            id: "proj_ms_migration",
            updates: {
              name: "Microservice Architecture Migration - Phase 2",
              description: "Extended refactoring to include data migration layer and enhanced service discovery through etcd integration",
              status: "in-progress"
            }
          },
          `{
            "id": "proj_ms_migration",
            "name": "Microservice Architecture Migration - Phase 2",
            "description": "Extended refactoring to include data migration layer and enhanced service discovery through etcd integration",
            "status": "in-progress",
            "urls": [
              {"title": "MCP Server Repository", "url": "https://github.com/cyanheads/atlas-mcp-server.git"},
              {"title": "Technical Spec", "url": "file:///Users/username/project_name/docs/atlas-reference.md"},
              {"title": "MCP Docs", "url": "https://modelcontextprotocol.io/"}
            ],
            "completionRequirements": "All critical services migrated with 100% test coverage, performance metrics meeting SLAs, and zero regressions in core functionality",
            "outputFormat": "Containerized services with CI/CD pipelines, comprehensive API documentation, and migration runbook",
            "taskType": "integration",
            "createdAt": "2025-03-23T10:11:24.123Z",
            "updatedAt": "2025-03-23T10:12:34.456Z"
          }`,
          "Update project scope and phase for an ongoing engineering initiative"
        ),
        createToolExample(
          {
            mode: "bulk",
            projects: [
              {
                id: "proj_graphql",
                updates: {
                  status: "completed",
                  completionRequirements: "API supports all current use cases with n+1 query optimization, proper error handling, and 95% test coverage with performance benchmarks showing 30% reduction in API request times"
                }
              },
              {
                id: "proj_perf",
                updates: {
                  status: "in-progress",
                  description: "Extended performance analysis to include bundle size optimization, lazy-loading routes, and server-side rendering for critical pages",
                  urls: [
                    {"title": "Lighthouse CI Results", "url": "https://lighthouse-ci.app/dashboard?project=frontend-perf"},
                    {"title": "Web Vitals Tracking", "url": "https://analytics.google.com/web-vitals"}
                  ]
                }
              }
            ]
          },
          `{
            "success": true,
            "message": "Successfully updated 2 projects",
            "updated": [
              {
                "id": "proj_graphql",
                "name": "GraphQL API Implementation",
                "description": "Design and implement GraphQL API layer to replace existing REST endpoints with optimized query capabilities",
                "status": "completed",
                "urls": [],
                "completionRequirements": "API supports all current use cases with n+1 query optimization, proper error handling, and 95% test coverage with performance benchmarks showing 30% reduction in API request times",
                "outputFormat": "TypeScript-based GraphQL schema with resolvers, documentation, and integration tests",
                "taskType": "generation",
                "createdAt": "2025-03-23T10:11:24.123Z",
                "updatedAt": "2025-03-23T10:12:34.456Z"
              },
              {
                "id": "proj_perf",
                "name": "Performance Optimization Suite",
                "description": "Extended performance analysis to include bundle size optimization, lazy-loading routes, and server-side rendering for critical pages",
                "status": "in-progress",
                "urls": [
                  {"title": "Lighthouse CI Results", "url": "https://lighthouse-ci.app/dashboard?project=frontend-perf"},
                  {"title": "Web Vitals Tracking", "url": "https://analytics.google.com/web-vitals"}
                ],
                "completionRequirements": "Core React components meet Web Vitals thresholds with 50% reduction in LCP and TTI metrics",
                "outputFormat": "Optimized component library, performance test suite, and technical recommendation document",
                "taskType": "analysis",
                "createdAt": "2025-03-23T10:11:24.456Z",
                "updatedAt": "2025-03-23T10:12:34.789Z"
              }
            ],
            "errors": []
          }`,
          "Synchronize project statuses across dependent engineering initiatives"
        )
      ],
      requiredPermission: "project:update",
      returnSchema: z.union([
        // Single project response
        z.object({
          id: z.string().describe("Project ID"),
          name: z.string().describe("Project name"),
          description: z.string().describe("Project description"),
          status: createProjectStatusEnum().describe("Project status"),
          urls: z.array(z.object({
            title: z.string(),
            url: z.string()
          })).describe("Reference materials"),
          completionRequirements: z.string().describe("Completion criteria"),
          outputFormat: z.string().describe("Deliverable format"),
          taskType: z.string().describe("Project classification"),
          createdAt: z.string().describe("Creation timestamp"),
          updatedAt: z.string().describe("Last update timestamp")
        }),
        // Bulk update response
        z.object({
          success: z.boolean().describe("Operation success status"),
          message: z.string().describe("Result message"),
          updated: z.array(z.object({
            id: z.string().describe("Project ID"),
            name: z.string().describe("Project name"),
            description: z.string().describe("Project description"),
            status: createProjectStatusEnum().describe("Project status"),
            urls: z.array(z.object({
              title: z.string(),
              url: z.string()
            })).describe("Reference materials"),
            completionRequirements: z.string().describe("Completion criteria"),
            outputFormat: z.string().describe("Deliverable format"),
            taskType: z.string().describe("Project classification"),
            createdAt: z.string().describe("Creation timestamp"),
            updatedAt: z.string().describe("Last update timestamp")
          })).describe("Updated projects"),
          errors: z.array(z.object({
            index: z.number().describe("Index in the projects array"),
            project: z.any().describe("Original project update data"),
            error: z.object({
              code: z.string().describe("Error code"),
              message: z.string().describe("Error message"),
              details: z.any().optional().describe("Additional error details")
            }).describe("Error information")
          })).describe("Update errors")
        })
      ]),
      rateLimit: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 15 // 15 requests per minute (either single or bulk)
      }
    })
  );
};
