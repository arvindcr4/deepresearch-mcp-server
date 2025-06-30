import { McpToolResponse } from "../types/mcp.js";

/**
 * Base interface for formatting MCP tool responses into rich display formats
 */
export interface ResponseFormatter<T> {
  /**
   * Format a raw response into a well-structured display format
   * @param data The parsed data from the tool response
   * @returns Formatted string (typically markdown) for rich display
   */
  format(data: T): string;
}

/**
 * Creates an MCP tool response with both JSON and formatted display views
 * 
 * @param data The raw data object to format
 * @param formatter The formatter to use for rich display
 * @param isError Whether this response represents an error
 * @returns An MCP tool response with original JSON and formatted display
 */
export function createFormattedResponse<T>(
  data: T, 
  formatter: ResponseFormatter<T>,
  isError = false
): McpToolResponse {
  // Format the data using the formatter
  const formattedDisplay = formatter.format(data);
  
  // Return a tool response with just the formatted display
  return {
    content: [
      {
        type: "text",
        text: formattedDisplay
      }
    ],
    isError,
    _meta: {
      format: "markdown"
    }
  };
}

/**
 * Utility function to generate a markdown table from an object
 * 
 * @param obj Object to convert to a table
 * @param headers Optional custom headers (defaults to keys)
 * @returns Markdown table string
 */
export function objectToMarkdownTable(
  obj: Record<string, any>,
  headers?: Record<string, string>
): string {
  const keys = Object.keys(obj);
  if (keys.length === 0) return "";
  
  const tableHeaders = headers || keys.reduce((acc, key) => {
    acc[key] = key.charAt(0).toUpperCase() + key.slice(1);
    return acc;
  }, {} as Record<string, string>);
  
  // Build the table header
  let table = "| ";
  keys.forEach(key => {
    if (tableHeaders[key]) {
      table += `${tableHeaders[key]} | `;
    }
  });
  table += "\n|";
  
  // Add the separator row
  keys.forEach(() => {
    table += " --- |";
  });
  table += "\n| ";
  
  // Add the value row
  keys.forEach(key => {
    let value = obj[key];
    // Format arrays
    if (Array.isArray(value)) {
      value = value.length > 0 ? value.join(", ") : "-";
    }
    // Format objects
    else if (typeof value === "object" && value !== null) {
      value = JSON.stringify(value);
    }
    // Handle undefined/null
    else if (value === undefined || value === null) {
      value = "-";
    }
    table += `${value} | `;
  });
  
  return table;
}

/**
 * Utility function to generate markdown tables from an array of objects
 * 
 * @param data Array of objects to convert to tables
 * @param headers Optional custom headers (defaults to keys)
 * @returns Markdown tables string
 */
export function arrayToMarkdownTables(
  data: Record<string, any>[],
  headers?: Record<string, string>
): string {
  if (data.length === 0) return "*No data available*";
  
  // Get all unique keys from all objects
  const allKeys = new Set<string>();
  data.forEach(item => {
    Object.keys(item).forEach(key => allKeys.add(key));
  });
  
  // Use consistent headers for all tables based on all keys
  const tableHeaders = headers || Array.from(allKeys).reduce((acc, key) => {
    acc[key] = key.charAt(0).toUpperCase() + key.slice(1);
    return acc;
  }, {} as Record<string, string>);
  
  // Generate tables for each item
  return data.map((item, index) => {
    return `**Item ${index + 1}**\n\n${objectToMarkdownTable(item, tableHeaders)}`;
  }).join("\n\n");
}
