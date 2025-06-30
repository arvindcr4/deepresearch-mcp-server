import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { PriorityLevel, TaskStatus } from '../../../types/mcp.js';
import { createToolExample, createToolMetadata, registerTool } from '../../../types/tool.js';
import { atlasCreateTask } from './createTask.js';
import { AtlasTaskCreateSchemaShape } from './types.js';

export const registerAtlasTaskCreateTool = (server: McpServer) => {
  registerTool(
    server,
    "atlas_task_create",
    "Creates a new task or multiple tasks in the system with detailed specifications, categorization, and dependency tracking",
    AtlasTaskCreateSchemaShape,
    atlasCreateTask,
    createToolMetadata({
      examples: [
        createToolExample(
          {
            mode: "single",
            projectId: "proj_ms_migration",
            title: "Design API Gateway Architecture",
            description: "Create a detailed architecture diagram and specifications for the API gateway that will route requests to appropriate microservices, handle authentication, and implement rate limiting",
            priority: "high",
            status: "todo",
            tags: ["architecture", "api", "gateway"],
            completionRequirements: "Complete architecture diagram with data flow, scaling strategy, and disaster recovery considerations. Implementation specifications must include authentication flow and rate limiting algorithms",
            outputFormat: "Architecture diagram (PDF), Technical specifications document (Markdown), Implementation roadmap",
            taskType: "research"
          },
          `{
            "id": "task_api_gateway",
            "projectId": "proj_ms_migration",
            "title": "Design API Gateway Architecture",
            "description": "Create a detailed architecture diagram and specifications for the API gateway that will route requests to appropriate microservices, handle authentication, and implement rate limiting",
            "priority": "high",
            "status": "todo",
            "assignedTo": null,
            "urls": [],
            "tags": ["architecture", "api", "gateway"],
            "completionRequirements": "Complete architecture diagram with data flow, scaling strategy, and disaster recovery considerations. Implementation specifications must include authentication flow and rate limiting algorithms",
            "outputFormat": "Architecture diagram (PDF), Technical specifications document (Markdown), Implementation roadmap",
            "taskType": "research",
            "createdAt": "2025-03-23T10:11:24.123Z",
            "updatedAt": "2025-03-23T10:11:24.123Z"
          }`,
          "Create a high-priority research task with specific completion criteria under an existing project"
        ),
        createToolExample(
          {
            mode: "bulk",
            tasks: [
              {
                projectId: "proj_graphql",
                title: "Set up GraphQL schema and resolver structure",
                description: "Create the foundation for our GraphQL API by defining the base schema structure, resolver patterns, and integration with existing data sources",
                priority: "high",
                tags: ["graphql", "schema", "foundation"],
                completionRequirements: "Working schema structure with type definitions for core entities. Base resolver pattern implemented with at least one full query path to the database.",
                outputFormat: "TypeScript code implementing the schema and resolvers with documentation",
                taskType: "generation"
              },
              {
                projectId: "proj_graphql",
                title: "Implement authentication and authorization",
                description: "Add authentication and authorization to the GraphQL API using JWT tokens and directive-based permission controls",
                status: "backlog",
                tags: ["auth", "security", "graphql"],
                completionRequirements: "Authentication middleware and directive implemented. All resolvers protected with appropriate permission checks.",
                outputFormat: "TypeScript code with tests demonstrating security controls",
                taskType: "generation"
              }
            ]
          },
          `{
            "success": true,
            "message": "Successfully created 2 tasks",
            "created": [
              {
                "id": "task_graphql_schema",
                "projectId": "proj_graphql",
                "title": "Set up GraphQL schema and resolver structure",
                "description": "Create the foundation for our GraphQL API by defining the base schema structure, resolver patterns, and integration with existing data sources",
                "priority": "high",
                "status": "todo",
                "assignedTo": null,
                "urls": [],
                "tags": ["graphql", "schema", "foundation"],
                "completionRequirements": "Working schema structure with type definitions for core entities. Base resolver pattern implemented with at least one full query path to the database.",
                "outputFormat": "TypeScript code implementing the schema and resolvers with documentation",
                "taskType": "generation",
                "createdAt": "2025-03-23T10:11:24.123Z",
                "updatedAt": "2025-03-23T10:11:24.123Z"
              },
              {
                "id": "task_auth",
                "projectId": "proj_graphql",
                "title": "Implement authentication and authorization",
                "description": "Add authentication and authorization to the GraphQL API using JWT tokens and directive-based permission controls",
                "priority": "medium",
                "status": "backlog",
                "assignedTo": null,
                "urls": [],
                "tags": ["auth", "security", "graphql"],
                "completionRequirements": "Authentication middleware and directive implemented. All resolvers protected with appropriate permission checks.",
                "outputFormat": "TypeScript code with tests demonstrating security controls",
                "taskType": "generation",
                "createdAt": "2025-03-23T10:11:24.456Z",
                "updatedAt": "2025-03-23T10:11:24.456Z"
              }
            ],
            "errors": []
          }`,
          "Batch-initialize multiple specialized tasks with clear dependencies and technical requirements"
        )
      ],
      requiredPermission: "task:create",
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
        // Bulk creation response
        z.object({
          success: z.boolean().describe("Operation success status"),
          message: z.string().describe("Result message"),
          created: z.array(z.object({
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
          })).describe("Created tasks"),
          errors: z.array(z.object({
            index: z.number().describe("Index in the tasks array"),
            task: z.any().describe("Original task data"),
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
        maxRequests: 15 // 15 requests per minute (either single or bulk)
      }
    })
  );
};
