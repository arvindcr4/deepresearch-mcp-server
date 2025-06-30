import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import winston from "winston";
import { config } from "../config/index.js";

type LogLevel = "debug" | "info" | "warn" | "error";

// Handle ESM module dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve logs directory relative to project root (2 levels up from utils/)
const projectRoot = path.resolve(__dirname, '..', '..');
const logsDir = path.join(projectRoot, 'logs');

// --- Security Check for Logs Directory ---
// Ensure the resolved logs directory is within the project root.
// This is slightly redundant given how it's calculated, but adds an explicit safety layer.
const resolvedLogsDir = path.resolve(logsDir); // Resolve to be absolutely sure
let isLogsDirSafe = false;
if (resolvedLogsDir.startsWith(projectRoot + path.sep) || resolvedLogsDir === projectRoot) {
    isLogsDirSafe = true;
} else {
    console.error(`FATAL: Calculated logs directory "${resolvedLogsDir}" is outside the project root "${projectRoot}". Logging to files will be disabled.`);
    // Depending on requirements, you might want to exit or log only to console.
    // For now, we'll proceed but file logging might fail or be insecure.
}
// --- End Security Check ---


class Logger {
  private static instance: Logger;
  private logger: winston.Logger;

  private constructor() {
    const logLevel = (config.logLevel as LogLevel) || "info";

    // Ensure logs directory exists only if the path is safe
    if (isLogsDirSafe) {
        try {
            if (!fs.existsSync(resolvedLogsDir)) { // Use resolved path
                fs.mkdirSync(resolvedLogsDir, { recursive: true }); // Use resolved path
                console.log(`Created logs directory: ${resolvedLogsDir}`);
            }
        } catch (error: any) {
            console.error(`Error ensuring logs directory exists at ${resolvedLogsDir}: ${error.message}. File logging might be affected.`);
            isLogsDirSafe = false; // Disable file logging if creation fails
        }
    }

    // Common format for all transports
    const commonFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ timestamp, level, message, context, stack }) => {
        const contextStr = context ? `\n  Context: ${JSON.stringify(context, null, 2)}` : "";
        const stackStr = stack ? `\n  Stack: ${stack}` : "";
        // Ensure message is a string
        const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
        return `[${timestamp}] ${level}: ${messageStr}${contextStr}${stackStr}`;
      })
    );

    // Define transports
    const transports: winston.transport[] = [
        // Always add console transport
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(), // Add colorization for console
                commonFormat
            ),
            level: logLevel // Use configured level for console too
        })
    ];

    // Add file transports only if the logs directory is safe
    if (isLogsDirSafe) {
        transports.push(
            new winston.transports.File({
                filename: path.join(resolvedLogsDir, 'combined.log'), // Use resolved path
                format: commonFormat
            }),
            new winston.transports.File({
                filename: path.join(resolvedLogsDir, 'error.log'), // Use resolved path
                level: 'error',
                format: commonFormat
            }),
            new winston.transports.File({
                filename: path.join(resolvedLogsDir, 'warn.log'), // Use resolved path
                level: 'warn',
                format: commonFormat
            }),
            new winston.transports.File({
                filename: path.join(resolvedLogsDir, 'info.log'), // Use resolved path
                level: 'info',
                format: commonFormat
            }),
            new winston.transports.File({
                filename: path.join(resolvedLogsDir, 'debug.log'), // Use resolved path
                level: 'debug',
                format: commonFormat
            })
        );
    } else {
        console.warn("File logging is disabled due to unsafe or inaccessible logs directory.");
    }


    this.logger = winston.createLogger({
      level: logLevel,
      // format: winston.format.json(), // Format is applied per transport now
      transports: transports,
      exitOnError: false // Prevent Winston from exiting on unhandled exceptions
    });
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  // Add explicit type for context to match winston's expected structure
  public debug(message: string, context?: Record<string, any>) {
    this.logger.debug(message, { context });
  }

  public info(message: string, context?: Record<string, any>) {
    this.logger.info(message, { context });
  }

  public warn(message: string, context?: Record<string, any>) {
    this.logger.warn(message, { context });
  }

  // Allow error object directly or in context
  public error(message: string, error?: Error | Record<string, any>, context?: Record<string, any>) {
      if (error instanceof Error) {
          this.logger.error(message, { error: { message: error.message, stack: error.stack }, context });
      } else {
          // If error is not an Error object, treat it as part of the context
          this.logger.error(message, { context: { ...error, ...context } });
      }
  }
}

export const logger = Logger.getInstance();
