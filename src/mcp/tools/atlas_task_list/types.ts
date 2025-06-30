import { z } from "zod";
import {
  McpToolResponse,
  PriorityLevel,
  TaskStatus
} from '../../../types/mcp.js';
import { Neo4jTask } from "../../../services/neo4j/types.js";

// Schema for the tool input
export const TaskListRequestSchema = z.object({
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
  sortBy: z.enum(['priority', 'createdAt', 'status']).optional().default('createdAt').describe(
    "Field to sort results by (Default: createdAt)"
  ),
  sortDirection: z.enum(['asc', 'desc']).optional().default('desc').describe(
    "Sort order (Default: desc)"
  ),
  page: z.number().int().positive().optional().default(1).describe(
    "Page number for paginated results (Default: 1)"
  ),
  limit: z.number().int().positive().max(100).optional().default(20).describe(
    "Number of results per page, maximum 100 (Default: 20)"
  )
});

export type TaskListRequestInput = z.infer<typeof TaskListRequestSchema>;

export interface TaskListResponse {
  tasks: Neo4jTask[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
