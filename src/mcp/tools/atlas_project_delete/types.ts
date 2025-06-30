import { z } from "zod";
import { McpToolResponse, ResponseFormat, createResponseFormatEnum } from "../../../types/mcp.js";

// Schema for individual project removal
const SingleProjectSchema = z.object({
  mode: z.literal("single"),
  id: z.string().describe(
    "Project identifier to permanently remove from the system"
  ),
  responseFormat: createResponseFormatEnum().optional().default(ResponseFormat.FORMATTED).describe(
    "Desired response format: 'formatted' (default string) or 'json' (raw object)"
  ),
}).describe(
  "Remove a specific project entity by its unique identifier"
);

// Schema for multi-project cleanup operation
const BulkProjectSchema = z.object({
  mode: z.literal("bulk"),
  projectIds: z.array(z.string()).min(1).describe(
    "Collection of project identifiers to remove in a single operation"
  ),
  responseFormat: createResponseFormatEnum().optional().default(ResponseFormat.FORMATTED).describe(
    "Desired response format: 'formatted' (default string) or 'json' (raw object)"
  ),
}).describe(
  "Batch removal of multiple project entities in a single transaction"
);

// Schema shapes for tool registration
export const AtlasProjectDeleteSchemaShape = {
  mode: z.enum(["single", "bulk"]).describe(
    "Operation strategy - 'single' for individual removal with detailed feedback, 'bulk' for efficient batch operations with aggregated results"
  ),
  id: z.string().optional().describe(
    "Target project identifier for permanent removal including all associated tasks and knowledge (required for mode='single')"
  ),
  projectIds: z.array(z.string()).optional().describe(
    "Collection of project identifiers to permanently remove in a single atomic transaction (required for mode='bulk')"
  ),
  responseFormat: createResponseFormatEnum().optional().describe(
    "Desired response format: 'formatted' (default string) or 'json' (raw object)"
  ),
} as const;

// Schema for validation
export const AtlasProjectDeleteSchema = z.discriminatedUnion("mode", [
  SingleProjectSchema,
  BulkProjectSchema
]);

export type AtlasProjectDeleteInput = z.infer<typeof AtlasProjectDeleteSchema>;
export type AtlasProjectDeleteResponse = McpToolResponse;
