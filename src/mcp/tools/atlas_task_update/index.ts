import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { PriorityLevel, TaskStatus } from '../../../types/mcp.js';
import { createToolExample, createToolMetadata, registerTool } from '../../../types/tool.js';
import { atlasUpdateTask } from './updateTask.js';
import { AtlasTaskUpdateSchemaShape } from './types.js';

export const registerAtlasTaskUpdateTool = (server: McpServer) => {
  registerTool(
    server,
    "atlas_task_update",
    "Updates existing task(s) in the system with support for both individual task modifications and efficient batch updates across multiple tasks",
    AtlasTaskUpdateSchemaShape,
    atlasUpdateTask,
    createToolMetadata({
      examples: [
        createToolExample(
          {
            mode: "single",
            id: "task_api_gateway",
            updates: {
              status: "in_progress",
              description: "Enhanced API Gateway design with additional focus on OAuth 2.0 integration and microservice security boundaries",
              priority: "critical"
            }
          },
          `{
            "id": "task_api_gateway",
            "projectId": "proj_ms_migration",
            "title": "Design API Gateway Architecture",
            "description": "Enhanced API Gateway design with additional focus on OAuth 2.0 integration and microservice security boundaries",
            "priority": "critical",
            "status": "in_progress",
            "assignedTo": null,
            "urls": [],
            "tags": ["architecture", "api", "gateway", "security"],
            "completionRequirements": "Complete architecture diagram with data flow, scaling strategy, and disaster recovery considerations. Implementation specifications must include authentication flow and rate limiting algorithms",
            "outputFormat": "Architecture diagram (PDF), Technical specifications document (Markdown), Implementation roadmap",
            "taskType": "research",
            "createdAt": "2025-03-23T10:11:24.123Z",
            "updatedAt": "2025-03-23T10:14:51.456Z"
          }`,
          "Update task priority and add security details to an existing architecture design task"
        ),
        createToolExample(
          {
            mode: "bulk",
            tasks: [
              {
                id: "task_graphql_schema",
                updates: {
                  status: "in_progress",
                  assignedTo: "user_developer1",
                  tags: ["graphql", "schema", "foundation", "priority"]
                }
              },
              {
                id: "task_auth",
                updates: {
                  priority: "high",
                  description: "Implement JWT-based authentication with refresh token rotation and resource-based authorization for GraphQL resolvers"
                }
              }
            ]
          },
          `{
            "success": true,
            "message": "Successfully updated 2 tasks",
            "updated": [
              {
                "id": "task_graphql_schema",
                "projectId": "proj_graphql",
                "title": "Set up GraphQL schema and resolver structure",
                "description": "Create the foundation for our GraphQL API by defining the base schema structure, resolver patterns, and integration with existing data sources",
                "priority": "high",
                "status": "in_progress",
                "assignedTo": "user_developer1",
                "urls": [],
                "tags": ["graphql", "schema", "foundation", "priority"],
                "completionRequirements": "Working schema structure with type definitions for core entities. Base resolver pattern implemented with at least one full query path to the database.",
                "outputFormat": "TypeScript code implementing the schema and resolvers with documentation",
                "taskType": "generation",
                "createdAt": "2025-03-23T10:11:24.123Z",
                "updatedAt": "2025-03-23T10:14:51.456Z"
              },
              {
                "id": "task_auth",
                "projectId": "proj_graphql",
                "title": "Implement authentication and authorization",
                "description": "Implement JWT-based authentication with refresh token rotation and resource-based authorization for GraphQL resolvers",
                "priority": "high",
                "status": "backlog",
                "assignedTo": null,
                "urls": [],
                "tags": ["auth", "security", "graphql"],
                "completionRequirements": "Authentication middleware and directive implemented. All resolvers protected with appropriate permission checks.",
                "outputFormat": "TypeScript code with tests demonstrating security controls",
                "taskType": "generation",
                "createdAt": "2025-03-23T10:11:24.456Z",
                "updatedAt": "2025-03-23T10:14:51.789Z"
              }
            ],
            "errors": []
          }`,
          "Assign a task to a developer and update the priority of a related dependency task"
        )
      ],
      requiredPermission: "task:update",
      returnSchema: z.union([
        // Single task response
        z.object({
          id: z.string().describe("Task ID"),
          projectId: z.string().describe("Parent project ID"),
          title: z.string().describe("Task title"),
          description: z.string().describe("Task description"),
          priority: z.enum([PriorityLevel.LOW, PriorityLevel.MEDIUM, PriorityLevel.HIGH, PriorityLevel.CRITICAL]).describe("Importance level"),
          status: z.enum([TaskStatus.BACKLOG, TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED]).describe("Task status"),
          assignedTo: z.string().nullable().describe("ID of entity responsible for completion"),
          urls: z.array(z.object({
            title: z.string(),
            url: z.string()
          })).describe("Reference materials"),
          tags: z.array(z.string()).describe("Organizational labels"),
          completionRequirements: z.string().describe("Completion criteria"),
          outputFormat: z.string().describe("Deliverable format"),
          taskType: z.string().describe("Task classification"),
          createdAt: z.string().describe("Creation timestamp"),
          updatedAt: z.string().describe("Last update timestamp")
        }),
        // Bulk update response
        z.object({
          success: z.boolean().describe("Operation success status"),
          message: z.string().describe("Result message"),
          updated: z.array(z.object({
            id: z.string().describe("Task ID"),
            projectId: z.string().describe("Parent project ID"),
            title: z.string().describe("Task title"),
            description: z.string().describe("Task description"),
            priority: z.enum([PriorityLevel.LOW, PriorityLevel.MEDIUM, PriorityLevel.HIGH, PriorityLevel.CRITICAL]).describe("Importance level"),
            status: z.enum([TaskStatus.BACKLOG, TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED]).describe("Task status"),
            assignedTo: z.string().nullable().describe("ID of entity responsible for completion"),
            urls: z.array(z.object({
              title: z.string(),
              url: z.string()
            })).describe("Reference materials"),
            tags: z.array(z.string()).describe("Organizational labels"),
            completionRequirements: z.string().describe("Completion criteria"),
            outputFormat: z.string().describe("Deliverable format"),
            taskType: z.string().describe("Task classification"),
            createdAt: z.string().describe("Creation timestamp"),
            updatedAt: z.string().describe("Last update timestamp")
          })).describe("Updated tasks"),
          errors: z.array(z.object({
            index: z.number().describe("Index in the tasks array"),
            task: z.any().describe("Original task update data"),
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
