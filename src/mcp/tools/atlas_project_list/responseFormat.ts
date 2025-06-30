import { ResponseFormatter, createFormattedResponse } from "../../../utils/responseFormatter.js";
import { Project, ProjectListResponse } from "./types.js";

/**
 * Formatter for structured project query responses
 */
export class ProjectListFormatter implements ResponseFormatter<ProjectListResponse> {
  /**
   * Get an emoji indicator for the task status
   */
  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'backlog': return '📋';
      case 'todo': return '📝';
      case 'in_progress': return '🔄';
      case 'completed': return '✅';
      default: return '❓';
    }
  }
  
  /**
   * Get a visual indicator for the priority level
   */
  private getPriorityIndicator(priority: string): string {
    switch (priority) {
      case 'critical': return '[!!!]';
      case 'high': return '[!!]';
      case 'medium': return '[!]';
      case 'low': return '[-]';
      default: return '[?]';
    }
  }
  format(data: ProjectListResponse): string {
    const { projects, total, page, limit, totalPages } = data;
    
    // Generate result summary section
    const summary = `Project Portfolio\n\n` +
      `Total Entities: ${total}\n` +
      `Page: ${page} of ${totalPages}\n` +
      `Displaying: ${Math.min(limit, projects.length)} project(s) per page\n`;
    
    if (projects.length === 0) {
      return `${summary}\n\nNo project entities matched the specified criteria`;
    }
    
    // Format each project
    const projectsSections = projects.map((project, index) => {
      // Access properties directly from the project object
      const { name, id, status, taskType, createdAt } = project; 
      
      let projectSection = `${index + 1}. ${name || 'Unnamed Project'}\n\n` +
        `ID: ${id || 'Unknown ID'}\n` +
        `Status: ${status || 'Unknown Status'}\n` +
        `Type: ${taskType || 'Unknown Type'}\n` +
        `Created: ${createdAt ? new Date(createdAt).toLocaleString() : 'Unknown Date'}\n`;
      
      // Add project details in plain text format
      projectSection += `\nProject Details\n\n`;
      
      // Add each property with proper formatting, accessing directly from 'project'
      if (project.id) projectSection += `ID: ${project.id}\n`;
      if (project.name) projectSection += `Name: ${project.name}\n`;
      if (project.description) projectSection += `Description: ${project.description}\n`;
      if (project.status) projectSection += `Status: ${project.status}\n`;
      
      // Format URLs array
      if (project.urls) {
        const urlsValue = Array.isArray(project.urls) && project.urls.length > 0 
          ? JSON.stringify(project.urls) 
          : "None";
        projectSection += `URLs: ${urlsValue}\n`;
      }
      
      if (project.completionRequirements) projectSection += `Completion Requirements: ${project.completionRequirements}\n`;
      if (project.outputFormat) projectSection += `Output Format: ${project.outputFormat}\n`;
      if (project.taskType) projectSection += `Task Type: ${project.taskType}\n`;
      
      // Format dates
      if (project.createdAt) {
        const createdDate = typeof project.createdAt === 'string' && 
                           /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(project.createdAt)
          ? new Date(project.createdAt).toLocaleString()
          : project.createdAt;
        projectSection += `Created At: ${createdDate}\n`;
      }
      
      if (project.updatedAt) {
        const updatedDate = typeof project.updatedAt === 'string' && 
                           /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(project.updatedAt)
          ? new Date(project.updatedAt).toLocaleString()
          : project.updatedAt;
        projectSection += `Updated At: ${updatedDate}\n`;
      }
      
      // Add tasks if included
      if (project.tasks && project.tasks.length > 0) {
        projectSection += `\nTasks (${project.tasks.length})\n\n`;
        
        projectSection += project.tasks.map((task, taskIndex) => {
          // Ensure we're accessing the task properties correctly
          const taskTitle = task.title || 'Unnamed Task';
          const taskId = task.id || 'Unknown ID';
          const taskStatus = task.status || 'Unknown Status';
          const taskPriority = task.priority || 'Unknown Priority';
          const taskCreatedAt = task.createdAt ? new Date(task.createdAt).toLocaleString() : 'Unknown Date';
          
          // Get status emoji for the task
          const statusEmoji = this.getStatusEmoji(taskStatus);
          // Get priority indicator for the task
          const priorityIndicator = this.getPriorityIndicator(taskPriority);
          
          return `Task ${taskIndex + 1}. ${statusEmoji} ${priorityIndicator} ${taskTitle}\n\n` +
            `ID: ${taskId}\n` +
            `Status: ${taskStatus}\n` +
            `Priority: ${taskPriority}\n` +
            `Created: ${taskCreatedAt}\n`;
        }).join("\n\n");
      }
      
      // Add knowledge if included
      if (project.knowledge && project.knowledge.length > 0) {
        projectSection += `\nKnowledge Items (${project.knowledge.length})\n\n`;
        
        projectSection += project.knowledge.map((item, itemIndex) => {
          // Access item fields directly since they're already extracted in listProjects.ts
          return `Knowledge ${itemIndex + 1}. ${item.domain || 'Uncategorized'} Knowledge\n\n` +
            `ID: ${item.id || 'Unknown ID'}\n` +
            `Domain: ${item.domain || 'Uncategorized'}\n` +
            `${item.tags && item.tags.length > 0 ? `Tags: ${item.tags.join(", ")}\n` : ""}` +
            `Created: ${item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Unknown Date'}\n\n` +
            "Content:\n" + (item.text || 'No content available');
        }).join("\n\n");
      }
      
      return projectSection;
    }).join("\n\n----------\n\n");
    
    // Append pagination metadata for multi-page results
    let paginationInfo = "";
    if (totalPages > 1) {
      paginationInfo = `\n\nPagination Controls\n\n` +
        `Viewing page ${page} of ${totalPages}.\n` +
        `${page < totalPages ? "Use 'page' parameter to navigate to additional results." : ""}`;
    }
    
    return `${summary}\n\n${projectsSections}${paginationInfo}`;
  }
}

/**
 * Create a human-readable formatted response for the atlas_project_list tool
 * 
 * @param data The structured project query response data
 * @param isError Whether this response represents an error condition
 * @returns Formatted MCP tool response with appropriate structure
 */
export function formatProjectListResponse(data: any, isError = false): any {
  return createFormattedResponse(data, new ProjectListFormatter(), isError);
}
