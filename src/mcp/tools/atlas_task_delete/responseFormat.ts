import { ResponseFormatter, createFormattedResponse } from "../../../utils/responseFormatter.js";

/**
 * Interface for single task deletion response
 */
interface SingleTaskDeleteResponse {
  id: string;
  success: boolean;
  message: string;
}

/**
 * Interface for bulk task deletion response
 */
interface BulkTaskDeleteResponse {
  success: boolean;
  message: string;
  deleted: string[];
  errors: {
    taskId: string;
    error: {
      code: string;
      message: string;
      details?: any;
    };
  }[];
}

/**
 * Formatter for individual task removal responses
 */
export class SingleTaskDeleteFormatter implements ResponseFormatter<SingleTaskDeleteResponse> {
  format(data: SingleTaskDeleteResponse): string {
    return `Task Removal\n\n` +
      `Result: ${data.success ? '✅ Success' : '❌ Failed'}\n` +
      `Task ID: ${data.id}\n` +
      `Message: ${data.message}\n`;
  }
}

/**
 * Formatter for batch task removal responses
 */
export class BulkTaskDeleteFormatter implements ResponseFormatter<BulkTaskDeleteResponse> {
  format(data: BulkTaskDeleteResponse): string {
    const { success, message, deleted, errors } = data;
    
    // Create a structured operation summary
    const summary = `Task Cleanup Operation\n\n` +
      `Status: ${success ? '✅ Complete Success' : '⚠️ Partial Success'}\n` +
      `Summary: ${message}\n` +
      `Removed: ${deleted.length} task(s)\n` +
      `Errors: ${errors.length} error(s)\n`;
    
    // List successfully processed entities
    let deletedSection = "";
    if (deleted.length > 0) {
      deletedSection = `Removed Tasks\n\n`;
      deletedSection += `The following task identifiers were successfully removed:\n\n`;
      deletedSection += deleted.map(id => `${id}`).join('\n');
    }
    
    // List operations that encountered errors
    let errorsSection = "";
    if (errors.length > 0) {
      errorsSection = `Operation Errors\n\n`;
      
      errorsSection += errors.map((error, index) => {
        return `${index + 1}. Failed to remove task ${error.taskId}\n\n` +
          `Error Code: ${error.error.code}\n` +
          `Message: ${error.error.message}\n` +
          (error.error.details ? `Details: ${JSON.stringify(error.error.details)}\n` : "");
      }).join("\n\n");
    }
    
    return `${summary}\n\n${deletedSection}\n\n${errorsSection}`.trim();
  }
}

/**
 * Create a human-readable formatted response for the atlas_task_delete tool
 * 
 * @param data The structured task removal operation results
 * @param isError Whether this response represents an error condition
 * @returns Formatted MCP tool response with appropriate structure
 */
export function formatTaskDeleteResponse(data: any, isError = false): any {
  // Determine if this is a single or bulk task response
  const isBulkResponse = data.hasOwnProperty("deleted") && Array.isArray(data.deleted);
  
  if (isBulkResponse) {
    return createFormattedResponse(data, new BulkTaskDeleteFormatter(), isError);
  } else {
    return createFormattedResponse(data, new SingleTaskDeleteFormatter(), isError);
  }
}
