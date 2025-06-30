import { logger } from './logger.js';
import { McpError, BaseErrorCode } from '../types/errors.js';
import { ToolContext } from './security.js';

interface ErrorHandlerOptions {
  context: ToolContext;
  operation: string;
  input?: unknown;
}

export const handleOperationError = (error: unknown, options: ErrorHandlerOptions): never => {
  const { context, operation, input } = options;

  // If it's already an McpError, just rethrow it
  if (error instanceof McpError) {
    throw error;
  }

  // Log the error with consistent format
  logger.error(`Error ${operation}`, {
    error,
    input,
    requestId: context.requestContext?.requestId
  });

  // Convert to McpError with standardized message format
  throw new McpError(
    BaseErrorCode.INTERNAL_ERROR,
    `Error ${operation}: ${error instanceof Error ? error.message : 'Unknown error'}`
  );
};

export const handleDatabaseError = (error: unknown, errorMap: Record<string, () => McpError>): never => {
  // If it's already an McpError, rethrow it
  if (error instanceof McpError) {
    throw error;
  }

  const errorMessage = error instanceof Error ? error.message : '';

  // Check each error pattern and throw corresponding McpError
  for (const [pattern, errorFactory] of Object.entries(errorMap)) {
    if (errorMessage.includes(pattern)) {
      throw errorFactory();
    }
  }

  // If no specific error pattern matches, rethrow the original error
  throw error;
};