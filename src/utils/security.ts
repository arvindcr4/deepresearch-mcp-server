import { McpError, BaseErrorCode } from '../types/errors.js';
import { logger } from './logger.js';

// Rate limiting implementation
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry>;

  constructor(private config: RateLimitConfig) {
    this.limits = new Map();
  }

  check(key: string): void {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now >= entry.resetTime) {
      // Reset or create new entry
      this.limits.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs
      });
      return;
    }

    if (entry.count >= this.config.maxRequests) {
      const waitTime = Math.ceil((entry.resetTime - now) / 1000);
      throw new McpError(
        BaseErrorCode.RATE_LIMITED,
        `Rate limit exceeded. Please try again in ${waitTime} seconds.`,
        { waitTime }
      );
    }

    entry.count++;
  }
}

// Create default rate limiter instance
export const rateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100 // 100 requests per window
});

// Security configuration
interface SecurityConfig {
  authRequired: boolean;
}

let securityConfig: SecurityConfig = {
  authRequired: false // Default to optional authentication
};

export const configureSecurity = (config: Partial<SecurityConfig>) => {
  securityConfig = {
    ...securityConfig,
    ...config
  };
};

// Permission checking
interface UserContext {
  id?: string;
  roles?: string[];
  permissions?: string[];
}

// Request context for tracking and logging
export interface RequestContext {
  requestId: string;
  timestamp: string;
}

export interface ToolContext {
  user?: UserContext;
  requestContext?: RequestContext;
  [key: string]: unknown;
}

export const checkPermission = (
  context: ToolContext = {},
  requiredPermission: string
): void => {
  // Skip authentication check if not required
  if (!securityConfig.authRequired) {
    return;
  }

  const user = context.user;
  
  if (!user?.id) {
    throw new McpError(
      BaseErrorCode.UNAUTHORIZED,
      'Authentication required',
      { requiredPermission }
    );
  }

  if (!user.permissions?.includes(requiredPermission)) {
    throw new McpError(
      BaseErrorCode.UNAUTHORIZED,
      `Missing required permission: ${requiredPermission}`,
      { requiredPermission }
    );
  }
};

// Input sanitization utilities
export const sanitizeInput = {
  // Remove potentially dangerous characters from strings
  string: (input: string): string => {
    return input.replace(/[<>]/g, '');
  },

  // Sanitize URLs
  url: (input: string): string => {
    try {
      const url = new URL(input);
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol');
      }
      return url.toString();
    } catch (error) {
      throw new McpError(
        BaseErrorCode.VALIDATION_ERROR,
        'Invalid URL format',
        { input }
      );
    }
  },

  // Sanitize file paths
  path: (input: string): string => {
    // Remove path traversal attempts
    return input.replace(/\.\./g, '');
  }
};

// Request tracing
export const createRequestContext = (): RequestContext => {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  return {
    requestId,
    timestamp
  };
};

// Middleware creator for tools
export const createToolMiddleware = (toolName: string) => {
  return async (
    handler: (input: unknown, context: ToolContext) => Promise<unknown>,
    input: unknown,
    context: ToolContext = {}
  ) => {
    const requestContext = createRequestContext();
    const contextWithRequest = {
      ...context,
      requestContext
    };
    
    try {
      // Rate limiting
      rateLimiter.check(`${toolName}:${context.user?.id || 'anonymous'}`);
      
      logger.info(`Tool execution started: ${toolName}`, {
        requestId: requestContext.requestId,
        timestamp: requestContext.timestamp,
        input
      });

      const result = await handler(input, contextWithRequest);

      logger.info(`Tool execution completed: ${toolName}`, {
        requestId: requestContext.requestId,
        timestamp: requestContext.timestamp
      });

      return result;

    } catch (error) {
      logger.error(`Tool execution failed: ${toolName}`, {
        requestId: requestContext.requestId,
        timestamp: requestContext.timestamp,
        error
      });

      if (error instanceof McpError) {
        return error.toResponse();
      }

      // Handle unknown errors
      const unknownError = error as Error;
      return new McpError(
        BaseErrorCode.INTERNAL_ERROR,
        'An unexpected error occurred',
        { message: unknownError.message || String(error) }
      ).toResponse();
    }
  };
};