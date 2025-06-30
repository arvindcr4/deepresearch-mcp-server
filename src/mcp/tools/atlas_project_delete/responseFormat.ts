import { ResponseFormatter, createFormattedResponse } from "../../../utils/responseFormatter.js";

/**
 * Interface for single project deletion response
 */
interface SingleProjectDeleteResponse {
  id: string;
  success: boolean;
  message: string;
}

/**
 * Interface for bulk project deletion response
 */
interface BulkProjectDeleteResponse {
  success: boolean;
  message: string;
  deleted: string[];
  errors: {
    projectId: string;
    error: {
      code: string;
      message: string;
      details?: any;
    };
  }[];
}

/**
 * Formatter for individual project removal responses
 */
export class SingleProjectDeleteFormatter implements ResponseFormatter<SingleProjectDeleteResponse> {
  format(data: SingleProjectDeleteResponse): string {
    return `Project Removal\n\n` +
      `Result: ${data.success ? '✅ Success' : '❌ Failed'}\n` +
      `Project ID: ${data.id}\n` +
      `Message: ${data.message}\n`;
  }
}

/**
 * Formatter for batch project removal responses
 */
export class BulkProjectDeleteFormatter implements ResponseFormatter<BulkProjectDeleteResponse> {
  format(data: BulkProjectDeleteResponse): string {
    const { success, message, deleted, errors } = data;
    
    // Create a structured operation summary
    const summary = `Project Cleanup Operation\n\n` +
      `Status: ${success ? '✅ Complete Success' : '⚠️ Partial Success'}\n` +
      `Summary: ${message}\n` +
      `Removed: ${deleted.length} project(s)\n` +
      `Errors: ${errors.length} error(s)\n`;
    
    // List successfully processed entities
    let deletedSection = "";
    if (deleted.length > 0) {
      deletedSection = `Removed Projects\n\n`;
      deletedSection += `The following project identifiers were successfully removed:\n\n`;
      deletedSection += deleted.map(id => `${id}`).join('\n');
    }
    
    // List operations that encountered errors
    let errorsSection = "";
    if (errors.length > 0) {
      errorsSection = `Operation Errors\n\n`;
      
      errorsSection += errors.map((error, index) => {
        return `${index + 1}. Failed to remove project ${error.projectId}\n\n` +
          `Error Code: ${error.error.code}\n` +
          `Message: ${error.error.message}\n` +
          (error.error.details ? `Details: ${JSON.stringify(error.error.details)}\n` : "");
      }).join("\n\n");
    }
    
    return `${summary}\n\n${deletedSection}\n\n${errorsSection}`.trim();
  }
}

/**
 * Create a human-readable formatted response for the atlas_project_delete tool
 * 
 * @param data The structured project removal operation results
 * @param isError Whether this response represents an error condition
 * @returns Formatted MCP tool response with appropriate structure
 */
export function formatProjectDeleteResponse(data: any, isError = false): any {
  // Determine if this is a single or bulk project response
  const isBulkResponse = data.hasOwnProperty("deleted") && Array.isArray(data.deleted);
  
  if (isBulkResponse) {
    return createFormattedResponse(data, new BulkProjectDeleteFormatter(), isError);
  } else {
    return createFormattedResponse(data, new SingleProjectDeleteFormatter(), isError);
  }
}
