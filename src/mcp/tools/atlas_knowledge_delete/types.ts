import { z } from "zod";
import { McpToolResponse, ResponseFormat, createResponseFormatEnum } from "../../../types/mcp.js";

// Schema for individual knowledge item removal
const SingleKnowledgeSchema = z.object({
  mode: z.literal("single"),
  id: z.string().describe(
    "Knowledge item identifier to remove from the system"
  ),
  responseFormat: createResponseFormatEnum().optional().default(ResponseFormat.FORMATTED).describe(
    "Desired response format: 'formatted' (default string) or 'json' (raw object)"
  ),
}).describe(
  "Remove a specific knowledge item by its unique identifier"
);

// Schema for multi-knowledge cleanup operation
const BulkKnowledgeSchema = z.object({
  mode: z.literal("bulk"),
  knowledgeIds: z.array(z.string()).min(1).describe(
    "Collection of knowledge identifiers to remove in a single operation"
  ),
  responseFormat: createResponseFormatEnum().optional().default(ResponseFormat.FORMATTED).describe(
    "Desired response format: 'formatted' (default string) or 'json' (raw object)"
  ),
}).describe(
  "Batch removal of multiple knowledge items in a single transaction"
);

// Schema shapes for tool registration
export const AtlasKnowledgeDeleteSchemaShape = {
  mode: z.enum(["single", "bulk"]).describe(
    "Operation mode - 'single' for individual removal, 'bulk' for batch operations"
  ),
  id: z.string().optional().describe(
    "Knowledge ID to delete (required for mode='single')"
  ),
  knowledgeIds: z.array(z.string()).optional().describe(
    "Array of knowledge IDs to delete (required for mode='bulk')"
  ),
  responseFormat: createResponseFormatEnum().optional().describe(
    "Desired response format: 'formatted' (default string) or 'json' (raw object)"
  ),
} as const;

// Schema for validation
export const AtlasKnowledgeDeleteSchema = z.discriminatedUnion("mode", [
  SingleKnowledgeSchema,
  BulkKnowledgeSchema
]);

export type AtlasKnowledgeDeleteInput = z.infer<typeof AtlasKnowledgeDeleteSchema>;
export type AtlasKnowledgeDeleteResponse = McpToolResponse;
