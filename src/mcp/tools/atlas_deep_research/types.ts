import { z } from "zod";
import { createKnowledgeDomainEnum, createResponseFormatEnum, ResponseFormat } from "../../../types/mcp.js";

/**
 * Zod schema defining the structure for a single sub-topic provided as input
 * to the deep research tool.
 */
export const DeepResearchSubTopicSchema = z.object({
  /** A focused, well-defined sub-topic or precise question to investigate. */
  question: z.string().min(1).describe("A focused, well-defined sub-topic or precise question to investigate. Effective research requires clear, bounded inquiries rather than overly broad topics."),
  /** Concise, targeted search queries or specific keywords relevant to this sub-topic. */
  initialSearchQueries: z.array(z.string()).optional().describe("Concise, targeted search queries or specific keywords relevant to this sub-topic. Effective deep research relies on precise, focused queries rather than broad terms."),
  /** Optional client-provided ID for the knowledge node representing this sub-topic. */
  nodeId: z.string().optional().describe("Optional client-provided ID for this sub-topic knowledge node. Useful for maintaining consistent cross-referencing across research efforts."),
  /** Strategic priority level for the task created for this sub-topic. */
  priority: z.enum(["low", "medium", "high", "critical"]).optional().describe("Strategic priority level for the task created for this sub-topic. Helps organize the research workflow by importance and urgency."),
  /** Optional assignee ID for the task created for this sub-topic. */
  assignedTo: z.string().optional().describe("Optional assignee ID for the task created for this sub-topic. Enables clear ownership and accountability for specific research areas."),
  /** Workflow status for the task created for this sub-topic. */
  initialStatus: z.enum(["backlog", "todo", "in-progress", "completed"]).optional().default("todo").describe("Workflow status for the task created for this sub-topic (default: todo). Facilitates research progression tracking across multiple inquiry areas.")
});

/**
 * TypeScript type inferred from `DeepResearchSubTopicSchema`. Represents a single sub-topic input.
 */
export type DeepResearchSubTopic = z.infer<typeof DeepResearchSubTopicSchema>;

/**
 * Defines the shape of the input parameters for the `atlas_deep_research` tool.
 * This structure is used to build the final Zod schema.
 */
export const AtlasDeepResearchSchemaShape = {
  /** Organizational parent project ID for contextualizing this research within broader objectives. */
  projectId: z.string().describe(
    "Organizational parent project ID for contextualizing this research within broader objectives (required). Essential for proper knowledge graph relationships."
  ),
  researchTopic: z.string().min(1).describe(
    "The primary, overarching topic or central question driving this deep research initiative (required). Should be substantive yet focused enough to yield actionable insights."
  ),
  /** Clearly articulated objective or specific outcome this research aims to achieve. */
  researchGoal: z.string().min(1).describe(
    "Clearly articulated objective or specific outcome this research aims to achieve (required). Defines what successful research completion looks like."
  ),
  /** Strategic boundary definition clarifying research inclusions and exclusions. */
  scopeDefinition: z.string().optional().describe(
    "Strategic boundary definition clarifying research inclusions and exclusions. Prevents scope creep and maintains research focus on high-value areas."
  ),
  /** Structured decomposition of the main topic into discrete, manageable sub-questions or investigation areas. */
  subTopics: z.array(DeepResearchSubTopicSchema)
    .min(1).describe(
      "Structured decomposition of the main topic into discrete, manageable sub-questions or investigation areas. Effective research requires breaking complex topics into component inquiries."
    ),
  /** Knowledge domain classification for the overall research topic. */
  researchDomain: createKnowledgeDomainEnum().or(z.string()).optional().describe(
    "Knowledge domain classification for the overall research topic (e.g., 'technical', 'business', 'scientific'). Enables better categorization and retrieval within the knowledge management system."
  ),
  /** Semantic categorization tags for improved searchability and relationship identification. */
  initialTags: z.array(z.string()).optional().describe(
    "Semantic categorization tags for improved searchability and relationship identification. Facilitates connecting this research to related knowledge areas."
  ),
  /** Unique identifier for the main research plan knowledge node. */
  planNodeId: z.string().optional().describe("Unique identifier for the main research plan knowledge node. Enables programmatic reference to this research plan in future operations."),
  /** Output format specification for the tool response. */
  responseFormat: createResponseFormatEnum().optional().default(ResponseFormat.FORMATTED).describe(
    "Output format specification for the tool response. Controls whether the response is human-readable ('formatted') or machine-processable ('json')."
  ),
  /** Task generation control flag for research operationalization. */
  createTasks: z.boolean().optional().default(true).describe("Task generation control flag for research operationalization (default: true). When enabled, creates trackable tasks for each sub-topic to facilitate systematic investigation.")
} as const;

/**
 * The complete Zod schema for validating the input arguments of the `atlas_deep_research` tool.
 */
export const AtlasDeepResearchInputSchema = z.object(AtlasDeepResearchSchemaShape);

/**
 * TypeScript type inferred from `AtlasDeepResearchInputSchema`. Represents the validated input object.
 */
export type AtlasDeepResearchInput = z.infer<typeof AtlasDeepResearchInputSchema>;

/**
 * Zod schema defining the structure for representing a created sub-topic knowledge node
 * in the tool's output.
 */
export const DeepResearchSubTopicNodeResultSchema = z.object({
  /** The formulated sub-topic question representing a discrete research inquiry. */
  question: z.string().describe("The formulated sub-topic question representing a discrete research inquiry. Forms the foundation for focused knowledge gathering."),
  /** Unique identifier for the knowledge node containing insights related to this sub-topic. */
  nodeId: z.string().describe("Unique identifier for the knowledge node containing insights related to this sub-topic. Essential for cross-referencing and knowledge relationship mapping."),
  /** Reference to the actionable task entity created to investigate this sub-topic. */
  taskId: z.string().optional().describe("Reference to the actionable task entity created to investigate this sub-topic, if applicable. Links knowledge goals with operational workflow."),
  /** Precision-targeted search queries used to initiate investigation of this sub-topic. */
  initialSearchQueries: z.array(z.string()).optional().describe("Precision-targeted search queries used to initiate investigation of this sub-topic. Effective deep research begins with carefully crafted, specific queries.")
});

/**
 * TypeScript type inferred from `DeepResearchSubTopicNodeResultSchema`. Represents a single sub-topic node result.
 */
export type DeepResearchSubTopicNodeResult = z.infer<typeof DeepResearchSubTopicNodeResultSchema>;

/**
 * Interface defining the expected output structure returned by the core `deepResearch` function.
 */
export interface DeepResearchResult {
  /** Execution status indicator for the overall research plan creation operation. */
  success: boolean;
  /** Comprehensive summary of the research plan creation outcome with relevant details. */
  message: string;
  /** Unique reference identifier for the root knowledge node containing the complete research plan. */
  planNodeId: string;
  /** Semantic categorization markers applied to the root research plan for improved discoverability. */
  initialTags?: string[];
  /** Structured collection of created knowledge nodes and associated tasks representing discrete research areas. */
  subTopicNodes: DeepResearchSubTopicNodeResult[];
  /** Operational workflow status indicating whether actionable tasks were created for research execution. */
  tasksCreated: boolean;
}

/**
 * Zod schema defining the structure of the output returned by the `atlas_deep_research` tool handler.
 * This is used for potential validation or type checking of the final tool response content.
 */
export const AtlasDeepResearchOutputSchema = z.object({
  /** Status indicator reflecting whether the research plan creation completed successfully. */
  success: z.boolean().describe("Status indicator reflecting whether the research plan creation completed successfully. Critical for error handling and flow control."),
  /** Informative summary describing the research plan creation outcome with actionable details. */
  message: z.string().describe("Informative summary describing the research plan creation outcome with actionable details. Provides context for next steps."),
  /** Unique reference ID for the core knowledge node containing the comprehensive research plan. */
  planNodeId: z.string().describe("Unique reference ID for the core knowledge node containing the comprehensive research plan. Essential for future references to this research initiative."),
  /** Semantic classification markers applied to the research plan for improved categorical organization. */
  initialTags: z.array(z.string()).optional().describe("Semantic classification markers applied to the research plan for improved categorical organization. Facilitates knowledge discovery and relationship mapping."),
  /** Structured collection of generated knowledge nodes and workflow tasks for each research sub-area. */
  subTopicNodes: z.array(DeepResearchSubTopicNodeResultSchema)
    .describe("Structured collection of generated knowledge nodes and workflow tasks for each research sub-area. Provides the complete map of the created research knowledge structure."),
  /** Task creation status indicating whether operational workflow items were generated. */
  tasksCreated: z.boolean().describe("Task creation status indicating whether operational workflow items were generated. Confirms proper integration with the task management system.")
});

/**
 * TypeScript type inferred from `AtlasDeepResearchOutputSchema`. Represents the structured output of the tool.
 */
export type AtlasDeepResearchOutput = z.infer<typeof AtlasDeepResearchOutputSchema>;
