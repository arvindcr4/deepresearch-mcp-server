import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { ProjectStatus, createProjectStatusEnum } from '../../../types/mcp.js';
import { createToolExample, createToolMetadata, registerTool } from '../../../types/tool.js';
import { atlasCreateProject } from './createProject.js';
import { AtlasProjectCreateSchemaShape } from './types.js';

export const registerAtlasProjectCreateTool = (server: McpServer) => {
  registerTool(
    server,
    "atlas_project_create",
    "Creates and initializes new projects within Atlas task management with comprehensive metadata, dependencies, and integration with the knowledge management system",
    AtlasProjectCreateSchemaShape,
    atlasCreateProject,
    createToolMetadata({
      examples: [
        createToolExample(
          {
            mode: "single",
            name: "Microservice Architecture Migration",
            description: "Refactor monolithic application into scalable microservices architecture with distributed data stores and API gateway",
            status: "active",
            urls: [{title: "MCP Server Repository", url: "https://github.com/cyanheads/atlas-mcp-server.git"}, {title: "Technical Spec", url: "file:///Users/username/project_name/docs/atlas-reference.md"}],
            completionRequirements: "All critical services migrated with 100% test coverage, performance metrics meeting SLAs, and zero regressions in core functionality",
            outputFormat: "Containerized services with CI/CD pipelines, comprehensive API documentation, and migration runbook",
            taskType: "integration"
          },
          `{
            "id": "proj_ms_migration",
            "name": "Microservice Architecture Migration",
            "description": "Refactor monolithic application into scalable microservices architecture with distributed data stores and API gateway",
            "status": "active",
            "urls": [{"title": "MCP Server Repository", "url": "https://github.com/cyanheads/atlas-mcp-server.git"}, {"title": "Technical Spec", "url": "file:///Users/username/project_name/docs/atlas-reference.md"}],
            "completionRequirements": "All critical services migrated with 100% test coverage, performance metrics meeting SLAs, and zero regressions in core functionality",
            "outputFormat": "Containerized services with CI/CD pipelines, comprehensive API documentation, and migration runbook",
            "taskType": "integration",
            "createdAt": "2025-03-23T10:11:24.123Z",
            "updatedAt": "2025-03-23T10:11:24.123Z"
          }`,
          "Initialize a high-complexity engineering project with detailed technical specifications and success criteria"
        ),
        createToolExample(
          {
            mode: "bulk",
            projects: [
              {
                name: "GraphQL API Implementation",
                description: "Design and implement GraphQL API layer to replace existing REST endpoints with optimized query capabilities",
                completionRequirements: "API supports all current use cases with n+1 query optimization, proper error handling, and 95% test coverage",
                outputFormat: "TypeScript-based GraphQL schema with resolvers, documentation, and integration tests",
                taskType: "generation"
              },
              {
                name: "Performance Optimization Suite",
                description: "Identify and resolve frontend rendering bottlenecks in React application through profiling and optimization techniques",
                status: "pending",
                completionRequirements: "Core React components meet Web Vitals thresholds with 50% reduction in LCP and TTI metrics",
                outputFormat: "Optimized component library, performance test suite, and technical recommendation document",
                taskType: "analysis"
              }
            ]
          },
          `{
            "success": true,
            "message": "Successfully created 2 projects",
            "created": [
              {
                "id": "proj_graphql",
                "name": "GraphQL API Implementation",
                "description": "Design and implement GraphQL API layer to replace existing REST endpoints with optimized query capabilities",
                "status": "active",
                "urls": [],
                "completionRequirements": "API supports all current use cases with n+1 query optimization, proper error handling, and 95% test coverage",
                "outputFormat": "TypeScript-based GraphQL schema with resolvers, documentation, and integration tests",
                "taskType": "generation",
                "createdAt": "2025-03-23T10:11:24.123Z",
                "updatedAt": "2025-03-23T10:11:24.123Z"
              },
              {
                "id": "proj_perf",
                "name": "Performance Optimization Suite",
                "description": "Identify and resolve frontend rendering bottlenecks in React application through profiling and optimization techniques",
                "status": "pending",
                "urls": [],
                "completionRequirements": "Core React components meet Web Vitals thresholds with 50% reduction in LCP and TTI metrics",
                "outputFormat": "Optimized component library, performance test suite, and technical recommendation document",
                "taskType": "analysis",
                "createdAt": "2025-03-23T10:11:24.456Z",
                "updatedAt": "2025-03-23T10:11:24.456Z"
              }
            ],
            "errors": []
          }`,
          "Batch-initialize multiple specialized engineering projects with distinct technical requirements"
        )
      ],
      requiredPermission: "project:create",
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
        // Bulk creation response
        z.object({
          success: z.boolean().describe("Operation success status"),
          message: z.string().describe("Result message"),
          created: z.array(z.object({
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
          })).describe("Created projects"),
          errors: z.array(z.object({
            index: z.number().describe("Index in the projects array"),
            project: z.any().describe("Original project data"),
            error: z.object({
              code: z.string().describe("Error code"),
              message: z.string().describe("Error message"),
              details: z.any().optional().describe("Additional error details")
            }).describe("Error information")
          })).describe("Creation errors")
        })
      ]),
      rateLimit: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 10 // 10 requests per minute (either single or bulk)
      }
    })
  );
};
