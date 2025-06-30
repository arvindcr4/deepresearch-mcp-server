import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PriorityLevel, ResponseFormat, TaskStatus, createResponseFormatEnum, createToolResponse } from "../../../types/mcp.js";
import { createToolExample, createToolMetadata, registerTool } from "../../../types/tool.js";
import { atlasListTasks } from "./listTasks.js";
import { formatTaskListResponse } from "./responseFormat.js";
import { TaskListRequestInput } from "./types.js"; // Corrected import

// Schema shapes for tool registration
const TaskListRequestSchemaShape = {
  projectId: z.string().describe(
    "ID of the project to list tasks for (required)"
  ),
  status: z.union([
    z.enum([TaskStatus.BACKLOG, TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED]),
    z.array(z.enum([TaskStatus.BACKLOG, TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED]))
  ]).optional().describe(
    "Filter by task status or array of statuses"
  ),
  assignedTo: z.string().optional().describe(
    "Filter by assignment ID"
  ),
  priority: z.union([
    z.enum([PriorityLevel.LOW, PriorityLevel.MEDIUM, PriorityLevel.HIGH, PriorityLevel.CRITICAL]),
    z.array(z.enum([PriorityLevel.LOW, PriorityLevel.MEDIUM, PriorityLevel.HIGH, PriorityLevel.CRITICAL]))
  ]).optional().describe(
    "Filter by priority level or array of priorities"
  ),
  tags: z.array(z.string()).optional().describe(
    "Array of tags to filter by (tasks matching any tag will be included)"
  ),
  taskType: z.string().optional().describe(
    "Filter by task classification"
  ),
  sortBy: z.enum(['priority', 'createdAt', 'status']).optional().describe(
    "Field to sort results by (Default: createdAt)"
  ),
  sortDirection: z.enum(['asc', 'desc']).optional().describe(
    "Sort order (Default: desc)"
  ),
  page: z.number().optional().describe(
    "Page number for paginated results (Default: 1)"
  ),
  limit: z.number().optional().describe(
    "Number of results per page, maximum 100 (Default: 20)"
  ),
  responseFormat: createResponseFormatEnum().optional().default(ResponseFormat.FORMATTED).describe(
    "Desired response format: 'formatted' (default string) or 'json' (raw object)"
  ),
};

export const registerAtlasTaskListTool = (server: McpServer) => {
  registerTool(
    server,
    "atlas_task_list",
    "Lists tasks according to specified filters with advanced filtering, sorting, and pagination capabilities",
    TaskListRequestSchemaShape,
    async (input, context) => {
      // Parse and process input (assuming validation happens implicitly via registerTool)
      const validatedInput = input as unknown as TaskListRequestInput & { responseFormat?: ResponseFormat }; // Corrected type cast
      const result = await atlasListTasks(validatedInput, context); // Added context argument

      // Conditionally format response
      if (validatedInput.responseFormat === ResponseFormat.JSON) {
        // Stringify the result and wrap it in a standard text response
        // The client will need to parse this stringified JSON
        return createToolResponse(JSON.stringify(result, null, 2));
      } else {
        // Return the formatted string using the formatter for rich display
        return formatTaskListResponse(result, false); // Added second argument
      }
    },
    createToolMetadata({
      examples: [
        createToolExample(
          {
            projectId: "proj_example123",
            status: "in_progress",
            limit: 10
          },
          `{
            "tasks": [
              {
                "id": "task_abcd1234",
                "projectId": "proj_example123",
                "title": "Implement User Authentication",
                "description": "Create secure user authentication system with JWT and refresh tokens",
                "priority": "high",
                "status": "in_progress",
                "assignedTo": "user_5678",
                "tags": ["security", "backend"],
                "completionRequirements": "Authentication endpoints working with proper error handling and tests",
                "outputFormat": "Documented API with test coverage",
                "taskType": "implementation",
                "createdAt": "2025-03-20T14:24:35.123Z",
                "updatedAt": "2025-03-22T09:15:22.456Z"
              }
            ],
            "total": 5,
            "page": 1,
            "limit": 10,
            "totalPages": 1
          }`,
          "List in-progress tasks for a specific project"
        ),
        createToolExample(
          {
            projectId: "proj_frontend42",
            priority: ["high", "critical"],
            tags: ["bug", "urgent"],
            sortBy: "priority",
            sortDirection: "desc"
          },
          `{
            "tasks": [
              {
                "id": "task_ef5678",
                "projectId": "proj_frontend42",
                "title": "Fix Critical UI Rendering Bug",
                "description": "Address the UI rendering issue causing layout problems on mobile devices",
                "priority": "critical",
                "status": "todo",
                "tags": ["bug", "ui", "urgent"],
                "completionRequirements": "UI displays correctly on all supported mobile devices",
                "outputFormat": "Fixed code with browser compatibility tests",
                "taskType": "bugfix",
                "createdAt": "2025-03-21T10:30:15.789Z",
                "updatedAt": "2025-03-21T10:30:15.789Z"
              },
              {
                "id": "task_gh9012",
                "projectId": "proj_frontend42",
                "title": "Optimize Image Loading Performance",
                "description": "Implement lazy loading and optimize image assets to improve page load time",
                "priority": "high",
                "status": "backlog",
                "tags": ["performance", "urgent"],
                "completionRequirements": "Page load time reduced by 40% with Lighthouse score above 90",
                "outputFormat": "Optimized code with performance benchmarks",
                "taskType": "optimization",
                "createdAt": "2025-03-19T16:45:22.123Z",
                "updatedAt": "2025-03-19T16:45:22.123Z"
              }
            ],
            "total": 2,
            "page": 1,
            "limit": 20,
            "totalPages": 1
          }`,
          "List high priority and critical tasks with specific tags, sorted by priority"
        )
      ],
      requiredPermission: "project:read",
      returnSchema: z.object({
        tasks: z.array(z.object({
          id: z.string(),
          projectId: z.string(),
          title: z.string(),
          description: z.string(),
          priority: z.enum([PriorityLevel.LOW, PriorityLevel.MEDIUM, PriorityLevel.HIGH, PriorityLevel.CRITICAL]),
          status: z.enum([TaskStatus.BACKLOG, TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED]),
          assignedTo: z.string().optional(),
          urls: z.array(z.object({
            title: z.string(),
            url: z.string()
          })).optional(),
          tags: z.array(z.string()).optional(),
          completionRequirements: z.string(),
          outputFormat: z.string(),
          taskType: z.string(),
          createdAt: z.string(),
          updatedAt: z.string()
        })),
        total: z.number().int(),
        page: z.number().int(),
        limit: z.number().int(),
        totalPages: z.number().int()
      }),
      rateLimit: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 30 // 30 requests per minute
      }
    })
  );
};
