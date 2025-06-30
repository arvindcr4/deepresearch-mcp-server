import { ResponseFormatter, createFormattedResponse } from "../../../utils/responseFormatter.js";

/**
 * Interface for single knowledge item deletion response
 */
interface SingleKnowledgeDeleteResponse {
  id: string;
  success: boolean;
  message: string;
}

/**
 * Interface for bulk knowledge deletion response
 */
interface BulkKnowledgeDeleteResponse {
  success: boolean;
  message: string;
  deleted: string[];
  errors: {
    knowledgeId: string;
    error: {
      code: string;
      message: string;
      details?: any;
    };
  }[];
}

/**
 * Formatter for individual knowledge item removal responses
 */
export class SingleKnowledgeDeleteFormatter implements ResponseFormatter<SingleKnowledgeDeleteResponse> {
  format(data: SingleKnowledgeDeleteResponse): string {
    return `Knowledge Item Removal\n\n` +
      `Result: ${data.success ? '✅ Success' : '❌ Failed'}\n` +
      `Knowledge ID: ${data.id}\n` +
      `Message: ${data.message}\n`;
  }
}

/**
 * Formatter for batch knowledge item removal responses
 */
export class BulkKnowledgeDeleteFormatter implements ResponseFormatter<BulkKnowledgeDeleteResponse> {
  format(data: BulkKnowledgeDeleteResponse): string {
    const { success, message, deleted, errors } = data;
    
    // Create a structured operation summary
    const summary = `Knowledge Cleanup Operation\n\n` +
      `Status: ${success ? '✅ Complete Success' : '⚠️ Partial Success'}\n` +
      `Summary: ${message}\n` +
      `Removed: ${deleted.length} knowledge item(s)\n` +
      `Errors: ${errors.length} error(s)\n`;
    
    // List successfully processed entities
    let deletedSection = "";
    if (deleted.length > 0) {
      deletedSection = `Removed Knowledge Items\n\n`;
      deletedSection += `The following knowledge identifiers were successfully removed:\n\n`;
      deletedSection += deleted.map(id => `${id}`).join('\n');
    }
    
    // List operations that encountered errors
    let errorsSection = "";
    if (errors.length > 0) {
      errorsSection = `Operation Errors\n\n`;
      
      errorsSection += errors.map((error, index) => {
        return `${index + 1}. Failed to remove knowledge item ${error.knowledgeId}\n\n` +
          `Error Code: ${error.error.code}\n` +
          `Message: ${error.error.message}\n` +
          (error.error.details ? `Details: ${JSON.stringify(error.error.details)}\n` : "");
      }).join("\n\n");
    }
    
    return `${summary}\n\n${deletedSection}\n\n${errorsSection}`.trim();
  }
}

/**
 * Create a human-readable formatted response for the atlas_knowledge_delete tool
 * 
 * @param data The structured knowledge removal operation results
 * @param isError Whether this response represents an error condition
 * @returns Formatted MCP tool response with appropriate structure
 */
export function formatKnowledgeDeleteResponse(data: any, isError = false): any {
  // Determine if this is a single or bulk knowledge response
  const isBulkResponse = data.hasOwnProperty("deleted") && Array.isArray(data.deleted);
  
  if (isBulkResponse) {
    return createFormattedResponse(data, new BulkKnowledgeDeleteFormatter(), isError);
  } else {
    return createFormattedResponse(data, new SingleKnowledgeDeleteFormatter(), isError);
  }
}
