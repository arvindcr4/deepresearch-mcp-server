import { z } from "zod";
import { McpToolResponse, ResponseFormat, createResponseFormatEnum } from "../../../types/mcp.js";

// Schema for individual task deletion
const SingleTaskSchema = z.object({
  mode: z.literal("single"),
  id: z.string().describe(
    "Task identifier to permanently remove from the system"
  ),
  responseFormat: createResponseFormatEnum().optional().default(ResponseFormat.FORMATTED).describe(
    "Desired response format: 'formatted' (default string) or 'json' (raw object)"
  ),
}).describe(
  "Remove a specific task entity by its unique identifier"
);

// Schema for multi-task cleanup operation
const BulkTaskSchema = z.object({
  mode: z.literal("bulk"),
  taskIds: z.array(z.string()).min(1).describe(
    "Collection of task identifiers to remove in a single operation"
  ),
  responseFormat: createResponseFormatEnum().optional().default(ResponseFormat.FORMATTED).describe(
    "Desired response format: 'formatted' (default string) or 'json' (raw object)"
  ),
}).describe(
  "Batch removal of multiple task entities in a single transaction"
);

// Schema shapes for tool registration
export const AtlasTaskDeleteSchemaShape = {
  mode: z.enum(["single", "bulk"]).describe(
    "Operation mode - 'single' for one task, 'bulk' for multiple tasks"
  ),
  id: z.string().optional().describe(
    "Task ID to delete (required for mode='single')"
  ),
  taskIds: z.array(z.string()).optional().describe(
    "Array of task IDs to delete (required for mode='bulk')"
  ),
  responseFormat: createResponseFormatEnum().optional().describe(
    "Desired response format: 'formatted' (default string) or 'json' (raw object)"
  ),
} as const;

// Schema for validation
export const AtlasTaskDeleteSchema = z.discriminatedUnion("mode", [
  SingleTaskSchema,
  BulkTaskSchema
]);

export type AtlasTaskDeleteInput = z.infer<typeof AtlasTaskDeleteSchema>;
export type AtlasTaskDeleteResponse = McpToolResponse;
