import { z } from "zod";
import {
  McpToolResponse,
  ProjectStatus,
  ResponseFormat,
  TaskType,
  createResponseFormatEnum,
} from "../../../types/mcp.js";

export const ProjectUpdateSchema = z.object({
  id: z.string().describe("Identifier of the existing project to be modified"),
  updates: z.object({
    name: z.string().min(1).max(100).optional().describe(
      "Modified project name following naming conventions (1-100 characters)"
    ),
    description: z.string().optional().describe(
      "Revised project scope, goals, and implementation details"
    ),
    status: z.enum([ProjectStatus.ACTIVE, ProjectStatus.PENDING, ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETED, ProjectStatus.ARCHIVED]).optional().describe(
      "Updated lifecycle state reflecting current project progress"
    ),
    urls: z.array(
      z.object({
        title: z.string(),
        url: z.string()
      })
    ).optional().describe(
      "Modified documentation links, specifications, and technical resources"
    ),
    completionRequirements: z.string().optional().describe(
      "Revised definition of done with updated success criteria and metrics"
    ),
    outputFormat: z.string().optional().describe(
      "Modified deliverable specification for project artifacts"
    ),
    taskType: z.enum([TaskType.RESEARCH, TaskType.GENERATION, TaskType.ANALYSIS, TaskType.INTEGRATION]).optional().describe(
      "Revised classification for project categorization and workflow"
    )
  }).describe(
    "Partial update object containing only fields that need modification"
  ),
});

const SingleProjectUpdateSchema = z.object({
  mode: z.literal("single"),
  id: z.string(),
  updates: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    status: z.enum([ProjectStatus.ACTIVE, ProjectStatus.PENDING, ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETED, ProjectStatus.ARCHIVED]).optional(),
    urls: z.array(
      z.object({
        title: z.string(),
        url: z.string()
      })
    ).optional(),
    completionRequirements: z.string().optional(),
    outputFormat: z.string().optional(),
    taskType: z.enum([TaskType.RESEARCH, TaskType.GENERATION, TaskType.ANALYSIS, TaskType.INTEGRATION]).optional(),
  }),
  responseFormat: createResponseFormatEnum().optional().default(ResponseFormat.FORMATTED).describe(
    "Desired response format: 'formatted' (default string) or 'json' (raw object)"
  ),
}).describe(
  "Atomically update a single project with selective field modifications"
);

const BulkProjectUpdateSchema = z.object({
  mode: z.literal("bulk"),
  projects: z.array(
    z.object({
      id: z.string().describe("Identifier of the project to update"),
      updates: z.object({
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        status: z.enum([ProjectStatus.ACTIVE, ProjectStatus.PENDING, ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETED, ProjectStatus.ARCHIVED]).optional(),
        urls: z.array(
          z.object({
            title: z.string(),
            url: z.string()
          })
        ).optional(),
        completionRequirements: z.string().optional(),
        outputFormat: z.string().optional(),
        taskType: z.enum([TaskType.RESEARCH, TaskType.GENERATION, TaskType.ANALYSIS, TaskType.INTEGRATION]).optional()
      })
    })
  ).min(1).max(100).describe(
    "Collection of project updates to be applied in a single transaction"
  ),
  responseFormat: createResponseFormatEnum().optional().default(ResponseFormat.FORMATTED).describe(
    "Desired response format: 'formatted' (default string) or 'json' (raw object)"
  ),
}).describe("Update multiple related projects in a single efficient transaction");

// Schema shapes for tool registration
export const AtlasProjectUpdateSchemaShape = {
  mode: z.enum(["single", "bulk"]).describe(
    "Operation mode - 'single' for individual update, 'bulk' for updating multiple projects"
  ),
  id: z.string().optional().describe(
    "Project identifier for the update operation (required for mode='single')"
  ),
  updates: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    status: z.enum([ProjectStatus.ACTIVE, ProjectStatus.PENDING, ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETED, ProjectStatus.ARCHIVED]).optional(),
    urls: z.array(
      z.object({
        title: z.string(),
        url: z.string()
      })
    ).optional(),
    completionRequirements: z.string().optional(),
    outputFormat: z.string().optional(),
    taskType: z.enum([TaskType.RESEARCH, TaskType.GENERATION, TaskType.ANALYSIS, TaskType.INTEGRATION]).optional()
  }).optional().describe(
    "Partial update specifying only the fields to be modified (required for mode='single')"
  ),
  projects: z.array(
    z.object({
      id: z.string(),
      updates: z.object({
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        status: z.enum([ProjectStatus.ACTIVE, ProjectStatus.PENDING, ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETED, ProjectStatus.ARCHIVED]).optional(),
        urls: z.array(
          z.object({
            title: z.string(),
            url: z.string()
          })
        ).optional(),
        completionRequirements: z.string().optional(),
        outputFormat: z.string().optional(),
        taskType: z.enum([TaskType.RESEARCH, TaskType.GENERATION, TaskType.ANALYSIS, TaskType.INTEGRATION]).optional()
      })
    })
  ).optional().describe(
    "Collection of project modifications to apply in a single transaction (required for mode='bulk')"
  ),
  responseFormat: createResponseFormatEnum().optional().describe(
    "Desired response format: 'formatted' (default string) or 'json' (raw object)"
  ),
} as const;

// Schema for validation
export const AtlasProjectUpdateSchema = z.discriminatedUnion("mode", [
  SingleProjectUpdateSchema,
  BulkProjectUpdateSchema
]);

export type AtlasProjectUpdateInput = z.infer<typeof AtlasProjectUpdateSchema>;
export type ProjectUpdateInput = z.infer<typeof ProjectUpdateSchema>;
export type AtlasProjectUpdateResponse = McpToolResponse;
