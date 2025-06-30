import { ResponseFormatter, createFormattedResponse } from "../../../utils/responseFormatter.js";

/**
 * Interface for a single knowledge item response
 */
interface SingleKnowledgeResponse {
  id: string;
  projectId: string;
  text: string;
  tags?: string[];
  domain: string;
  citations?: string[];
  createdAt: string;
  updatedAt: string;
  properties?: any;
  identity?: number;
  labels?: string[];
  elementId?: string;
}

/**
 * Interface for bulk knowledge addition response
 */
interface BulkKnowledgeResponse {
  success: boolean;
  message: string;
  created: (SingleKnowledgeResponse & { properties?: any; identity?: number; labels?: string[]; elementId?: string; })[];
  errors: {
    index: number;
    knowledge: any;
    error: {
      code: string;
      message: string;
      details?: any;
    };
  }[];
}

/**
 * Formatter for single knowledge item addition responses
 */
export class SingleKnowledgeFormatter implements ResponseFormatter<SingleKnowledgeResponse> {
  format(data: SingleKnowledgeResponse): string {
    // Extract knowledge properties from Neo4j structure
    const knowledgeData = data.properties || data;
    const { id, projectId, domain, createdAt } = knowledgeData;
    
    // Create a summary section
    const summary = `Knowledge Item Added Successfully\n\n` +
      `ID: ${id || 'Unknown ID'}\n` +
      `Project ID: ${projectId || 'Unknown Project'}\n` +
      `Domain: ${domain || 'Uncategorized'}\n` +
      `Created: ${createdAt ? new Date(createdAt).toLocaleString() : 'Unknown Date'}\n`;
    
    // Create a comprehensive details section with all knowledge properties
    const fieldLabels = {
      id: "ID",
      projectId: "Project ID",
      text: "Content",
      tags: "Tags",
      domain: "Domain",
      citations: "Citations",
      createdAt: "Created At",
      updatedAt: "Updated At"
    };
    
    let details = `Knowledge Item Details\n\n`;
    
    // Build details as key-value pairs
    Object.entries(fieldLabels).forEach(([key, label]) => {
      if (knowledgeData[key] !== undefined) {
        let value = knowledgeData[key];
        
        // Format arrays
        if (Array.isArray(value)) {
          value = value.length > 0 ? JSON.stringify(value) : "None";
        }
        // Format objects
        else if (typeof value === "object" && value !== null) {
          value = JSON.stringify(value);
        }
        // Format dates more readably if they look like ISO dates
        else if (typeof value === "string" && 
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
          try {
            value = new Date(value).toLocaleString();
          } catch (e) {
            // Keep original if parsing fails
          }
        }
        
        // For text, limit the length in display
        if (key === 'text' && typeof value === 'string' && value.length > 100) {
          value = value.substring(0, 100) + '... (truncated)';
        }
        
        details += `${label}: ${value}\n`;
      }
    });
    
    return `${summary}\n\n${details}`;
  }
}

/**
 * Formatter for bulk knowledge addition responses
 */
export class BulkKnowledgeFormatter implements ResponseFormatter<BulkKnowledgeResponse> {
  format(data: BulkKnowledgeResponse): string {
    const { success, message, created, errors } = data;
    
    // Create a summary section with operation results
    const summary = `${success ? "Knowledge Items Added Successfully" : "Knowledge Addition Completed with Errors"}\n\n` +
      `Status: ${success ? "✅ Success" : "⚠️ Partial Success"}\n` +
      `Summary: ${message}\n` +
      `Added: ${created.length} item(s)\n` +
      `Errors: ${errors.length} error(s)\n`;
    
    // List the successfully created knowledge items
    let createdSection = "";
    if (created.length > 0) {
      createdSection = `Added Knowledge Items\n\n`;
      
      createdSection += created.map((item, index) => {
        // Extract knowledge properties from Neo4j structure
        const itemData = item.properties || item;
        return `${index + 1}. Knowledge Item (${itemData.domain || 'Uncategorized'})\n` +
          `ID: ${itemData.id || 'Unknown ID'}\n` +
          `Project ID: ${itemData.projectId || 'Unknown Project'}\n` +
          `Tags: ${itemData.tags ? JSON.stringify(itemData.tags) : 'None'}\n` +
          `Created: ${itemData.createdAt ? new Date(itemData.createdAt).toLocaleString() : 'Unknown Date'}\n`;
      }).join("\n\n");
    }
    
    // List any errors that occurred
    let errorsSection = "";
    if (errors.length > 0) {
      errorsSection = `Errors\n\n`;
      
      errorsSection += errors.map((error, index) => {
        const itemProject = error.knowledge?.projectId || 'Unknown Project';
        return `${index + 1}. Error in Knowledge Item for Project "${itemProject}"\n\n` +
          `Error Code: ${error.error.code}\n` +
          `Message: ${error.error.message}\n` +
          (error.error.details ? `Details: ${JSON.stringify(error.error.details)}\n` : "");
      }).join("\n\n");
    }
    
    return `${summary}\n\n${createdSection}\n\n${errorsSection}`.trim();
  }
}

/**
 * Create a formatted, human-readable response for the atlas_knowledge_add tool
 * 
 * @param data The raw knowledge addition response data
 * @param isError Whether this response represents an error condition
 * @returns Formatted MCP tool response with appropriate structure
 */
export function formatKnowledgeAddResponse(data: any, isError = false): any {
  // Determine if this is a single or bulk knowledge response
  const isBulkResponse = data.hasOwnProperty("success") && data.hasOwnProperty("created");
  
  if (isBulkResponse) {
    return createFormattedResponse(data, new BulkKnowledgeFormatter(), isError);
  } else {
    return createFormattedResponse(data, new SingleKnowledgeFormatter(), isError);
  }
}
