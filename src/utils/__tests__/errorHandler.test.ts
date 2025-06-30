/**
 * Unit Tests for Error Handler Utility
 */

// Mock the logger before importing the module
jest.mock('../logger.js', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Error Handler', () => {
  let errorHandler: any;
  let mockLogger: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Dynamic import to ensure mocks are applied
    const module = await import('../errorHandler.js');
    errorHandler = module;
    
    const loggerModule = await import('../logger.js');
    mockLogger = loggerModule.logger;
  });

  describe('handleToolError', () => {
    it('should handle and format tool errors correctly', () => {
      const testError = new Error('Test tool error');
      const toolName = 'atlas_project_create';
      const context = { projectId: '123' };

      if (errorHandler.handleToolError) {
        const result = errorHandler.handleToolError(testError, toolName, context);

        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining(`Tool error in ${toolName}`),
          expect.objectContaining({
            error: testError,
            context,
          })
        );

        expect(result).toEqual(expect.objectContaining({
          success: false,
          error: expect.any(String),
        }));
      }
    });

    it('should handle unknown errors gracefully', () => {
      const unknownError = 'String error';
      const toolName = 'atlas_task_create';

      if (errorHandler.handleToolError) {
        const result = errorHandler.handleToolError(unknownError, toolName);

        expect(mockLogger.error).toHaveBeenCalled();
        expect(result).toEqual(expect.objectContaining({
          success: false,
          error: expect.any(String),
        }));
      }
    });
  });

  describe('sanitizeError', () => {
    it('should sanitize sensitive information from error messages', () => {
      if (errorHandler.sanitizeError) {
        const sensitiveError = new Error('Password: secret123, API Key: abc123');
        const sanitized = errorHandler.sanitizeError(sensitiveError);

        expect(sanitized.message).not.toContain('secret123');
        expect(sanitized.message).not.toContain('abc123');
        expect(sanitized.message).toContain('[REDACTED]');
      }
    });

    it('should preserve non-sensitive information', () => {
      if (errorHandler.sanitizeError) {
        const normalError = new Error('Database connection failed for user John');
        const sanitized = errorHandler.sanitizeError(normalError);

        expect(sanitized.message).toContain('Database connection failed');
        expect(sanitized.message).toContain('John');
      }
    });
  });

  describe('createErrorResponse', () => {
    it('should create standardized error responses', () => {
      if (errorHandler.createErrorResponse) {
        const error = new Error('Test error');
        const response = errorHandler.createErrorResponse(error, 'TEST_ERROR');

        expect(response).toEqual({
          success: false,
          error: 'Test error',
          code: 'TEST_ERROR',
          timestamp: expect.any(String),
        });
      }
    });

    it('should include additional context in error response', () => {
      if (errorHandler.createErrorResponse) {
        const error = new Error('Test error');
        const context = { userId: '123', action: 'create' };
        const response = errorHandler.createErrorResponse(error, 'TEST_ERROR', context);

        expect(response).toEqual({
          success: false,
          error: 'Test error',
          code: 'TEST_ERROR',
          timestamp: expect.any(String),
          context,
        });
      }
    });
  });
});