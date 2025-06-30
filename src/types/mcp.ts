import { z } from "zod";

// Common response types
export interface McpContent {
  [key: string]: unknown;
  type: "text";
  text: string;
}

export interface McpToolResponse {
  [key: string]: unknown;
  content: McpContent[];
  _meta?: Record<string, unknown>;
  isError?: boolean;
}

// Atlas Platform Enums
export const ProjectStatus = {
  ACTIVE: "active",
  PENDING: "pending",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
  ARCHIVED: "archived"
} as const;

export const TaskStatus = {
  BACKLOG: "backlog",
  TODO: "todo",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed"
} as const;

export const PriorityLevel = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical"
} as const;

export const TaskType = {
  RESEARCH: "research",
  GENERATION: "generation",
  ANALYSIS: "analysis",
  INTEGRATION: "integration"
} as const;

export const KnowledgeDomain = {
  TECHNICAL: "technical",
  BUSINESS: "business",
  SCIENTIFIC: "scientific"
} as const;

// Atlas Platform response types
export interface ProjectResponse {
  id: string;
  name: string;
  description: string;
  status: string;
  urls?: Array<{ title: string, url: string }>;
  completionRequirements: string;
  dependencies?: string[];
  outputFormat: string;
  taskType: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskResponse {
  id: string;
  projectId: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  assignedTo?: string;
  urls?: Array<{ title: string, url: string }>;
  tags?: string[];
  completionRequirements: string;
  dependencies?: string[];
  outputFormat: string;
  taskType: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeResponse {
  id: string;
  projectId: string;
  text: string;
  tags?: string[];
  domain: string;
  citations?: string[];
  createdAt: string;
  updatedAt: string;
}

// Zod enum creators - these functions create Zod enums from our constant objects
export const createProjectStatusEnum = () => {
  return z.enum(Object.values(ProjectStatus) as [string, ...string[]]);
};

export const createTaskStatusEnum = () => {
  return z.enum(Object.values(TaskStatus) as [string, ...string[]]);
};

export const createPriorityLevelEnum = () => {
  return z.enum(Object.values(PriorityLevel) as [string, ...string[]]);
};

export const createTaskTypeEnum = () => {
  return z.enum(Object.values(TaskType) as [string, ...string[]]);
};

export const createKnowledgeDomainEnum = () => {
  return z.enum(Object.values(KnowledgeDomain) as [string, ...string[]]);
};

export enum ResponseFormat {
  FORMATTED = "formatted",
  JSON = "json",
}

export function createResponseFormatEnum() {
  return z.nativeEnum(ResponseFormat);
}

// Project-specific schemas
export const ProjectInputSchema = {
  name: z.string().min(1),
  description: z.string().optional(),
  status: createProjectStatusEnum().default(ProjectStatus.ACTIVE)
} as const;

export const UpdateProjectInputSchema = {
  id: z.string(),
  updates: z.object(ProjectInputSchema).partial()
} as const;

export const ProjectIdInputSchema = {
  projectId: z.string()
} as const;

// Resource response types
export interface ResourceContent {
  [key: string]: unknown;
  uri: string;
  text: string;
  mimeType?: string;
}

export interface ResourceResponse {
  [key: string]: unknown;
  contents: ResourceContent[];
  _meta?: Record<string, unknown>;
}

// Prompt response types
export interface PromptMessageContent {
  [key: string]: unknown;
  type: "text";
  text: string;
}

export interface PromptMessage {
  [key: string]: unknown;
  role: "user" | "assistant";
  content: PromptMessageContent;
}

export interface PromptResponse {
  [key: string]: unknown;
  messages: PromptMessage[];
  _meta?: Record<string, unknown>;
}

// Helper functions
export const createToolResponse = (text: string, isError?: boolean): McpToolResponse => ({
  content: [{
    type: "text",
    text,
    _type: "text"
  }],
  isError,
  _type: "tool_response"
});

export const createResourceResponse = (uri: string, text: string, mimeType?: string): ResourceResponse => ({
  contents: [{
    uri,
    text,
    mimeType,
    _type: "resource_content"
  }],
  _type: "resource_response"
});

export const createPromptResponse = (text: string, role: "user" | "assistant" = "assistant"): PromptResponse => ({
  messages: [{
    role,
    content: {
      type: "text",
      text,
      _type: "prompt_content"
    },
    _type: "prompt_message"
  }],
  _type: "prompt_response"
});
