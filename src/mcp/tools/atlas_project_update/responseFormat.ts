import { ProjectResponse } from "../../../types/mcp.js";
import { ResponseFormatter, createFormattedResponse } from "../../../utils/responseFormatter.js";

/**
 * Extends the ProjectResponse to include Neo4j properties structure 
 */
interface SingleProjectResponse extends ProjectResponse {
  properties?: any;
  identity?: number;
  labels?: string[];
  elementId?: string;
}

/**
 * Interface for bulk project update response
 */
interface BulkProjectResponse {
  success: boolean;
  message: string;
  updated: (ProjectResponse & { properties?: any; identity?: number; labels?: string[]; elementId?: string; })[];
  errors: {
    index: number;
    project: {
      id: string;
      updates: any;
    };
    error: {
      code: string;
      message: string;
      details?: any;
    };
  }[];
}

/**
 * Formatter for individual project modification responses
 */
export class SingleProjectUpdateFormatter implements ResponseFormatter<SingleProjectResponse> {
  format(data: SingleProjectResponse): string {
    // Extract project properties from Neo4j structure
    const projectData = data.properties || data;
    const { name, id, status, taskType, updatedAt } = projectData;
    
    // Create a structured summary section
    const summary = `Project Modified Successfully\n\n` +
      `Project: ${name || 'Unnamed Project'}\n` +
      `ID: ${id || 'Unknown ID'}\n` +
      `Status: ${status || 'Unknown Status'}\n` +
      `Type: ${taskType || 'Unknown Type'}\n` +
      `Updated: ${updatedAt ? new Date(updatedAt).toLocaleString() : 'Unknown Date'}\n`;
    
    // Create a comprehensive details section with all project attributes
    let details = `Project Details\n\n`;
    
    // Add each property with proper formatting
    if (projectData.id) details += `ID: ${projectData.id}\n`;
    if (projectData.name) details += `Name: ${projectData.name}\n`;
    if (projectData.description) details += `Description: ${projectData.description}\n`;
    if (projectData.status) details += `Status: ${projectData.status}\n`;
    
    // Format URLs array
    if (projectData.urls) {
      const urlsValue = Array.isArray(projectData.urls) && projectData.urls.length > 0 
        ? JSON.stringify(projectData.urls) 
        : "None";
      details += `URLs: ${urlsValue}\n`;
    }
    
    if (projectData.completionRequirements) details += `Completion Requirements: ${projectData.completionRequirements}\n`;
    if (projectData.outputFormat) details += `Output Format: ${projectData.outputFormat}\n`;
    if (projectData.taskType) details += `Task Type: ${projectData.taskType}\n`;
    
    // Format dates
    if (projectData.createdAt) {
      const createdDate = typeof projectData.createdAt === 'string' && 
                        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(projectData.createdAt)
        ? new Date(projectData.createdAt).toLocaleString()
        : projectData.createdAt;
      details += `Created At: ${createdDate}\n`;
    }
    
    if (projectData.updatedAt) {
      const updatedDate = typeof projectData.updatedAt === 'string' && 
                        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(projectData.updatedAt)
        ? new Date(projectData.updatedAt).toLocaleString()
        : projectData.updatedAt;
      details += `Updated At: ${updatedDate}\n`;
    }
    
    return `${summary}\n\n${details}`;
  }
}

/**
 * Formatter for bulk project update responses
 */
export class BulkProjectUpdateFormatter implements ResponseFormatter<BulkProjectResponse> {
  format(data: BulkProjectResponse): string {
    const { success, message, updated, errors } = data;
    
    // Create a summary section
    const summary = `${success ? "Projects Updated Successfully" : "Project Updates Completed with Errors"}\n\n` +
      `Status: ${success ? "✅ Success" : "⚠️ Partial Success"}\n` +
      `Summary: ${message}\n` +
      `Updated: ${updated.length} project(s)\n` +
      `Errors: ${errors.length} error(s)\n`;
    
    // List all successfully modified projects
    let updatedSection = "";
    if (updated.length > 0) {
      updatedSection = `Modified Projects\n\n`;
      
      updatedSection += updated.map((project, index) => {
        // Extract project properties from Neo4j structure
        const projectData = project.properties || project;
        return `${index + 1}. ${projectData.name || 'Unnamed Project'}\n\n` +
          `ID: ${projectData.id || 'Unknown ID'}\n` +
          `Type: ${projectData.taskType || 'Unknown Type'}\n` +
          `Status: ${projectData.status || 'Unknown Status'}\n` +
          `Updated: ${projectData.updatedAt ? new Date(projectData.updatedAt).toLocaleString() : 'Unknown Date'}\n`;
      }).join("\n\n");
    }
    
    // List any errors that occurred
    let errorsSection = "";
    if (errors.length > 0) {
      errorsSection = `Errors\n\n`;
      
      errorsSection += errors.map((error, index) => {
        return `${index + 1}. Error updating Project ID: "${error.project.id}"\n\n` +
          `Error Code: ${error.error.code}\n` +
          `Message: ${error.error.message}\n` +
          (error.error.details ? `Details: ${JSON.stringify(error.error.details)}\n` : "");
      }).join("\n\n");
    }
    
    return `${summary}\n\n${updatedSection}\n\n${errorsSection}`.trim();
  }
}

/**
 * Create a formatted, human-readable response for the atlas_project_update tool
 * 
 * @param data The raw project modification response
 * @param isError Whether this response represents an error condition
 * @returns Formatted MCP tool response with appropriate structure
 */
export function formatProjectUpdateResponse(data: any, isError = false): any {
  // Determine if this is a single or bulk project response
  const isBulkResponse = data.hasOwnProperty("success") && data.hasOwnProperty("updated");
  
  if (isBulkResponse) {
    return createFormattedResponse(data, new BulkProjectUpdateFormatter(), isError);
  } else {
    return createFormattedResponse(data, new SingleProjectUpdateFormatter(), isError);
  }
}
