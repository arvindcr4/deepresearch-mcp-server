import { z } from "zod";
import { McpToolResponse, McpContent } from "./mcp.js";

// Base error codes that all tools can use
export enum BaseErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  RATE_LIMITED = 'RATE_LIMITED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED'  // Added permission denied error
}

// Project-specific error codes
export enum ProjectErrorCode {
  DUPLICATE_NAME = 'DUPLICATE_NAME',
  INVALID_STATUS = 'INVALID_STATUS',
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  DEPENDENCY_CYCLE = 'DEPENDENCY_CYCLE',
  INVALID_DEPENDENCY = 'INVALID_DEPENDENCY'
}

// Task-specific error codes
export enum TaskErrorCode {
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',
  INVALID_STATUS = 'INVALID_STATUS',
  INVALID_PRIORITY = 'INVALID_PRIORITY',
  INVALID_DEPENDENCY = 'INVALID_DEPENDENCY',
  DEPENDENCY_CYCLE = 'DEPENDENCY_CYCLE'
}

// Note-specific error codes
export enum NoteErrorCode {
  INVALID_TAGS = 'INVALID_TAGS',
  NOTE_NOT_FOUND = 'NOTE_NOT_FOUND'
}

// Link-specific error codes
export enum LinkErrorCode {
  INVALID_URL = 'INVALID_URL',
  LINK_NOT_FOUND = 'LINK_NOT_FOUND',
  DUPLICATE_URL = 'DUPLICATE_URL'
}

// Member-specific error codes
export enum MemberErrorCode {
  INVALID_ROLE = 'INVALID_ROLE',
  MEMBER_NOT_FOUND = 'MEMBER_NOT_FOUND',
  DUPLICATE_MEMBER = 'DUPLICATE_MEMBER'
}

// Skill-specific error codes
export enum SkillErrorCode {
  SKILL_NOT_FOUND = 'SKILL_NOT_FOUND',
  DEPENDENCY_NOT_FOUND = 'DEPENDENCY_NOT_FOUND',
  MISSING_PARAMETER = 'MISSING_PARAMETER',
  CIRCULAR_DEPENDENCY = 'CIRCULAR_DEPENDENCY',
  SKILL_EXECUTION_ERROR = 'SKILL_EXECUTION_ERROR'
}

// Database export/import error codes
export enum DatabaseExportImportErrorCode {
  EXPORT_ERROR = 'EXPORT_ERROR',
  IMPORT_ERROR = 'IMPORT_ERROR',
  FILE_ACCESS_ERROR = 'FILE_ACCESS_ERROR',
  INVALID_EXPORT_FORMAT = 'INVALID_EXPORT_FORMAT',
  RESET_FAILED = 'RESET_FAILED',
  INVALID_CONFIRMATION_CODE = 'INVALID_CONFIRMATION_CODE',
  PERMISSION_DENIED = 'PERMISSION_DENIED'
}

// Base MCP error class
export class McpError extends Error {
  constructor(
    public code: BaseErrorCode | ProjectErrorCode | TaskErrorCode | NoteErrorCode | LinkErrorCode | MemberErrorCode | SkillErrorCode | DatabaseExportImportErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'McpError';
  }

  toResponse(): McpToolResponse {
    const content: McpContent = {
      type: "text",
      text: `Error [${this.code}]: ${this.message}${
        this.details ? `\nDetails: ${JSON.stringify(this.details, null, 2)}` : ''
      }`
    };

    return {
      content: [content],
      isError: true,
      _type: "tool_response"
    };
  }
}

// Error schema for validation
export const ErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional()
});

export type ErrorResponse = z.infer<typeof ErrorSchema>;
