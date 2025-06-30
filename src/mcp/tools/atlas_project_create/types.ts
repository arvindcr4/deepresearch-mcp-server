import { z } from "zod";
import {
  McpToolResponse,
  ProjectStatus,
  ResponseFormat,
  TaskType,
  createProjectStatusEnum,
  createResponseFormatEnum,
  createTaskTypeEnum,
} from "../../../types/mcp.js";

export const ProjectSchema = z.object({
  id: z.string().optional().describe(
    "Optional client-generated project ID or identifier"
  ),
  name: z.string().min(1).max(100).describe(
    "Clear, descriptive project name (1-100 characters)"
  ),
  description: z.string().describe(
    "Comprehensive project overview with scope, goals, and implementation details"
  ),
  status: createProjectStatusEnum().default(ProjectStatus.ACTIVE).describe(
    "Current project state for tracking progress (Default: active)"
  ),
  urls: z.array(
    z.object({
      title: z.string(),
      url: z.string()
    })
  ).optional().describe(
    "Links to relevant documentation, specifications, and resources (e.g., 'https://example.com' or 'file://path/to/index.ts')"
  ),
  completionRequirements: z.string().describe(
    "Clear definition of done with measurable success criteria"
  ),
  dependencies: z.array(z.string()).optional().describe(
    "Project IDs that must be completed before this project can begin"
  ),
  outputFormat: z.string().describe(
    "Required format and structure for project deliverables"
  ),
  taskType: createTaskTypeEnum().or(z.string()).describe(
    "Classification of project purpose for organization and workflow"
  )
});

const SingleProjectSchema = z.object({
  mode: z.literal("single"),
  id: z.string().optional(),
  name: z.string().min(1).max(100),
  description: z.string(),
  status: createProjectStatusEnum().optional().default(ProjectStatus.ACTIVE),
  urls: z.array(
    z.object({
      title: z.string(),
      url: z.string()
    })
  ).optional(),
  completionRequirements: z.string(),
  dependencies: z.array(z.string()).optional(),
  outputFormat: z.string(),
  taskType: createTaskTypeEnum().or(z.string()),
  responseFormat: createResponseFormatEnum().optional().default(ResponseFormat.FORMATTED).describe(
    "Desired response format: 'formatted' (default string) or 'json' (raw object)"
  )
}).describe(
  "Creates a single project with comprehensive details and metadata"
);

const BulkProjectSchema = z.object({
  mode: z.literal("bulk"),
  projects: z.array(ProjectSchema).min(1).max(100).describe(
    "Collection of project definitions to create in a single operation"
  ),
  responseFormat: createResponseFormatEnum().optional().default(ResponseFormat.FORMATTED).describe(
    "Desired response format: 'formatted' (default string) or 'json' (raw object)"
  )
}).describe("Create multiple related projects in a single efficient transaction");

// Schema shapes for tool registration
export const AtlasProjectCreateSchemaShape = {
  mode: z.enum(["single", "bulk"]).describe(
    "Operation mode - 'single' for creating one detailed project with full metadata, 'bulk' for efficiently initializing multiple related projects in a single transaction"
  ),
  id: z.string().optional().describe(
    "Client-generated unique project identifier for consistent cross-referencing (recommended for mode='single', system will generate if not provided)"
  ),
  name: z.string().min(1).max(100).optional().describe(
    "Clear, descriptive project name for display and identification (1-100 characters) (required for mode='single')"
  ),
  description: z.string().optional().describe(
    "Comprehensive project overview detailing scope, objectives, approach, and implementation details (required for mode='single')"
  ),
  status: createProjectStatusEnum().optional().describe(
    "Project lifecycle state for tracking progress and filtering (Default: active)"
  ),
  urls: z.array(
    z.object({
      title: z.string(),
      url: z.string()
    })
  ).optional().describe(
    "Array of titled links to relevant documentation, specifications, code repositories, and external resources (supports web URLs and file paths)"
  ),
  completionRequirements: z.string().optional().describe(
    "Quantifiable success criteria and acceptance requirements that define when the project is considered complete (required for mode='single')"
  ),
  dependencies: z.array(z.string()).optional().describe(
    "Array of project IDs that must be completed before this project can begin, establishing workflow prerequisites and sequencing"
  ),
  outputFormat: z.string().optional().describe(
    "Expected format and structure specification for the project's final deliverables and artifacts (required for mode='single')"
  ),
  taskType: createTaskTypeEnum().or(z.string()).optional().describe(
    "Project type classification for workflow organization, filtering, and reporting (options: research, generation, analysis, integration, or custom type) (required for mode='single')"
  ),
  projects: z.array(ProjectSchema).min(1).max(100).optional().describe(
    "Array of complete project definition objects to create in a single transaction (supports 1-100 projects, required for mode='bulk')"
  ),
  responseFormat: createResponseFormatEnum().optional().describe(
    "Desired response format: 'formatted' (default string) or 'json' (raw object)"
  )
} as const;

// Schema for validation
export const AtlasProjectCreateSchema = z.discriminatedUnion("mode", [
  SingleProjectSchema,
  BulkProjectSchema
]);

export type AtlasProjectCreateInput = z.infer<typeof AtlasProjectCreateSchema>;
export type ProjectInput = z.infer<typeof ProjectSchema>;
export type AtlasProjectCreateResponse = McpToolResponse;
