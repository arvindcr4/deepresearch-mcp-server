import { TaskResponse } from "../../../types/mcp.js";
import { ResponseFormatter, createFormattedResponse } from "../../../utils/responseFormatter.js";

/**
 * Extends the TaskResponse to include Neo4j properties structure 
 */
interface SingleTaskResponse extends TaskResponse {
  properties?: any;
  identity?: number;
  labels?: string[];
  elementId?: string;
}

/**
 * Interface for bulk task creation response
 */
interface BulkTaskResponse {
  success: boolean;
  message: string;
  created: (TaskResponse & { properties?: any; identity?: number; labels?: string[]; elementId?: string; })[];
  errors: {
    index: number;
    task: any;
    error: {
      code: string;
      message: string;
      details?: any;
    };
  }[];
}

/**
 * Formatter for single task creation responses
 */
export class SingleTaskFormatter implements ResponseFormatter<SingleTaskResponse> {
  format(data: SingleTaskResponse): string {
    // Extract task properties from Neo4j structure
    const taskData = data.properties || data;
    const { title, id, projectId, status, priority, taskType, createdAt } = taskData;
    
    // Create a summary section
    const summary = `Task Created Successfully\n\n` +
      `Task: ${title || 'Unnamed Task'}\n` +
      `ID: ${id || 'Unknown ID'}\n` +
      `Project ID: ${projectId || 'Unknown Project'}\n` +
      `Status: ${status || 'Unknown Status'}\n` +
      `Priority: ${priority || 'Unknown Priority'}\n` +
      `Type: ${taskType || 'Unknown Type'}\n` +
      `Created: ${createdAt ? new Date(createdAt).toLocaleString() : 'Unknown Date'}\n`;
    
    // Create a comprehensive details section with all task properties
    const fieldLabels = {
      id: "ID",
      projectId: "Project ID",
      title: "Title",
      description: "Description",
      priority: "Priority",
      status: "Status",
      assignedTo: "Assigned To",
      urls: "URLs",
      tags: "Tags",
      completionRequirements: "Completion Requirements",
      dependencies: "Dependencies",
      outputFormat: "Output Format",
      taskType: "Task Type",
      createdAt: "Created At",
      updatedAt: "Updated At"
    };
    
    let details = `Task Details\n\n`;
    
    // Build details as key-value pairs
    Object.entries(fieldLabels).forEach(([key, label]) => {
      if (taskData[key] !== undefined) {
        let value = taskData[key];
        
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
        
        details += `${label}: ${value}\n`;
      }
    });
    
    return `${summary}\n\n${details}`;
  }
}

/**
 * Formatter for bulk task creation responses
 */
export class BulkTaskFormatter implements ResponseFormatter<BulkTaskResponse> {
  format(data: BulkTaskResponse): string {
    const { success, message, created, errors } = data;
    
    // Create a summary section with operation results
    const summary = `${success ? "Tasks Created Successfully" : "Task Creation Completed with Errors"}\n\n` +
      `Status: ${success ? "✅ Success" : "⚠️ Partial Success"}\n` +
      `Summary: ${message}\n` +
      `Created: ${created.length} task(s)\n` +
      `Errors: ${errors.length} error(s)\n`;
    
    // List the successfully created tasks
    let createdSection = "";
    if (created.length > 0) {
      createdSection = `Created Tasks\n\n`;
      
      createdSection += created.map((task, index) => {
        // Extract task properties from Neo4j structure
        const taskData = task.properties || task;
        return `${index + 1}. ${taskData.title || 'Unnamed Task'}\n\n` +
          `ID: ${taskData.id || 'Unknown ID'}\n` +
          `Project ID: ${taskData.projectId || 'Unknown Project'}\n` +
          `Type: ${taskData.taskType || 'Unknown Type'}\n` +
          `Priority: ${taskData.priority || 'Unknown Priority'}\n` +
          `Status: ${taskData.status || 'Unknown Status'}\n` +
          `Created: ${taskData.createdAt ? new Date(taskData.createdAt).toLocaleString() : 'Unknown Date'}\n`;
      }).join("\n\n");
    }
    
    // List any errors that occurred
    let errorsSection = "";
    if (errors.length > 0) {
      errorsSection = `Errors\n\n`;
      
      errorsSection += errors.map((error, index) => {
        const taskTitle = error.task?.title || `Task at index ${error.index}`;
        return `${index + 1}. Error in "${taskTitle}"\n\n` +
          `Error Code: ${error.error.code}\n` +
          `Message: ${error.error.message}\n` +
          (error.error.details ? `Details: ${JSON.stringify(error.error.details)}\n` : "");
      }).join("\n\n");
    }
    
    return `${summary}\n\n${createdSection}\n\n${errorsSection}`.trim();
  }
}

/**
 * Create a formatted, human-readable response for the atlas_task_create tool
 * 
 * @param data The raw task creation response data
 * @param isError Whether this response represents an error condition
 * @returns Formatted MCP tool response with appropriate structure
 */
export function formatTaskCreateResponse(data: any, isError = false): any {
  // Determine if this is a single or bulk task response
  const isBulkResponse = data.hasOwnProperty("success") && data.hasOwnProperty("created");
  
  if (isBulkResponse) {
    return createFormattedResponse(data, new BulkTaskFormatter(), isError);
  } else {
    return createFormattedResponse(data, new SingleTaskFormatter(), isError);
  }
}
