import { z } from "zod";
import {
  McpToolResponse,
  PriorityLevel,
  ResponseFormat,
  TaskStatus,
  TaskType,
  createPriorityLevelEnum,
  createResponseFormatEnum,
  createTaskStatusEnum,
  createTaskTypeEnum,
} from "../../../types/mcp.js";

export const TaskSchema = z.object({
  id: z.string().optional().describe(
    "Optional client-generated task ID"
  ),
  projectId: z.string().describe(
    "ID of the parent project this task belongs to"
  ),
  title: z.string().min(5).max(150).describe(
    "Concise task title clearly describing the objective (5-150 characters)"
  ),
  description: z.string().describe(
    "Detailed explanation of the task requirements and context"
  ),
  priority: createPriorityLevelEnum().default(PriorityLevel.MEDIUM).describe(
    "Importance level"
  ),
  status: createTaskStatusEnum().default(TaskStatus.TODO).describe(
    "Current task state"
  ),
  assignedTo: z.string().optional().describe(
    "ID of entity responsible for task completion"
  ),
  urls: z.array(
    z.object({
      title: z.string(),
      url: z.string()
    })
  ).optional().describe(
    "Relevant URLs with descriptive titles for reference materials"
  ),
  tags: z.array(z.string()).optional().describe(
    "Categorical labels for organization and filtering"
  ),
  completionRequirements: z.string().describe(
    "Specific, measurable criteria that indicate task completion"
  ),
  dependencies: z.array(z.string()).optional().describe(
    "Array of existing task IDs that must be completed before this task can begin"
  ),
  outputFormat: z.string().describe(
    "Required format specification for task deliverables"
  ),
  taskType: createTaskTypeEnum().or(z.string()).describe(
    "Classification of task purpose"
  )
});

const SingleTaskSchema = z.object({
  mode: z.literal("single"),
  id: z.string().optional(),
  projectId: z.string(),
  title: z.string().min(5).max(150),
  description: z.string(),
  priority: createPriorityLevelEnum().optional().default(PriorityLevel.MEDIUM),
  status: createTaskStatusEnum().optional().default(TaskStatus.TODO),
  assignedTo: z.string().optional(),
  urls: z.array(
    z.object({
      title: z.string(),
      url: z.string()
    })
  ).optional(),
  tags: z.array(z.string()).optional(),
  completionRequirements: z.string(),
  dependencies: z.array(z.string()).optional(),
  outputFormat: z.string(),
  taskType: createTaskTypeEnum().or(z.string()),
  responseFormat: createResponseFormatEnum().optional().default(ResponseFormat.FORMATTED).describe(
    "Desired response format: 'formatted' (default string) or 'json' (raw object)"
  ),
}).describe(
  "Creates a single task with comprehensive details and metadata"
);

const BulkTaskSchema = z.object({
  mode: z.literal("bulk"),
  tasks: z.array(TaskSchema).min(1).max(100).describe(
    "Collection of task definitions to create in a single operation. Each object must include all fields required for single task creation (projectId, title, description, completionRequirements, outputFormat, taskType)."
  ),
  responseFormat: createResponseFormatEnum().optional().default(ResponseFormat.FORMATTED).describe(
    "Desired response format: 'formatted' (default string) or 'json' (raw object)"
  ),
}).describe("Create multiple related tasks in a single efficient transaction");

// Schema shapes for tool registration
export const AtlasTaskCreateSchemaShape = {
  mode: z.enum(["single", "bulk"]).describe(
    "Operation mode - 'single' for creating one detailed task with full specifications, 'bulk' for efficiently creating multiple related tasks in a single transaction"
  ),
  id: z.string().optional().describe(
    "Optional client-generated task ID for consistent cross-referencing"
  ),
  projectId: z.string().optional().describe(
    "ID of the parent project this task belongs to, establishing the project-task relationship hierarchy (required for mode='single')"
  ),
  title: z.string().min(5).max(150).optional().describe(
    "Concise task title clearly describing the objective (5-150 characters) for display and identification (required for mode='single')"
  ),
  description: z.string().optional().describe(
    "Detailed explanation of the task requirements, context, approach, and implementation details (required for mode='single')"
  ),
  priority: createPriorityLevelEnum().optional().describe(
    "Importance level for task prioritization and resource allocation (Default: medium)"
  ),
  status: createTaskStatusEnum().optional().describe(
    "Current task workflow state for tracking task lifecycle and progress (Default: todo)"
  ),
  assignedTo: z.string().optional().describe(
    "ID of entity responsible for task completion and accountability tracking"
  ),
  urls: z.array(
    z.object({
      title: z.string(),
      url: z.string()
    })
  ).optional().describe(
    "Array of relevant URLs with descriptive titles for reference materials"
  ),
  tags: z.array(z.string()).optional().describe(
    "Array of categorical labels for task organization, filtering, and thematic grouping"
  ),
  completionRequirements: z.string().optional().describe(
    "Specific, measurable criteria that define when the task is considered complete and ready for verification (required for mode='single')"
  ),
  dependencies: z.array(z.string()).optional().describe(
    "Array of existing task IDs that must be completed before this task can begin, creating sequential workflow paths and prerequisites"
  ),
  outputFormat: z.string().optional().describe(
    "Required format and structure specification for the task's deliverables, artifacts, and documentation (required for mode='single')"
  ),
  taskType: createTaskTypeEnum().or(z.string()).optional().describe(
    "Classification of task purpose for workflow organization, filtering, and reporting (required for mode='single')"
  ),
  tasks: z.array(TaskSchema).min(1).max(100).optional().describe(
    "Array of complete task definition objects to create in a single transaction (supports 1-100 tasks, required for mode='bulk'). Each object must include all fields required for single task creation (projectId, title, description, completionRequirements, outputFormat, taskType)."
  ),
  responseFormat: createResponseFormatEnum().optional().describe(
    "Desired response format: 'formatted' (default string) or 'json' (raw object)"
  ),
} as const;

// Schema for validation
export const AtlasTaskCreateSchema = z.discriminatedUnion("mode", [
  SingleTaskSchema,
  BulkTaskSchema
]);

export type AtlasTaskCreateInput = z.infer<typeof AtlasTaskCreateSchema>;
export type TaskInput = z.infer<typeof TaskSchema>;
export type AtlasTaskCreateResponse = McpToolResponse;
