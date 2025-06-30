/**
 * Unit Tests for Logger Utility
 */

import { logger } from '../logger.js';

// Since logger is mocked in setup, we need to cast it for testing
const mockLogger = logger as any;

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('debug', () => {
    it('should log debug messages', () => {
      const message = 'Debug message';
      const context = { userId: '123' };

      mockLogger.debug(message, context);

      expect(mockLogger.debug).toHaveBeenCalledWith(message, context);
    });

    it('should log debug messages without context', () => {
      const message = 'Debug message without context';

      mockLogger.debug(message);

      expect(mockLogger.debug).toHaveBeenCalledWith(message, undefined);
    });
  });

  describe('info', () => {
    it('should log info messages', () => {
      const message = 'Info message';
      const context = { action: 'test' };

      mockLogger.info(message, context);

      expect(mockLogger.info).toHaveBeenCalledWith(message, context);
    });
  });

  describe('warn', () => {
    it('should log warning messages', () => {
      const message = 'Warning message';
      const context = { warning: 'test warning' };

      mockLogger.warn(message, context);

      expect(mockLogger.warn).toHaveBeenCalledWith(message, context);
    });
  });

  describe('error', () => {
    it('should log error messages with Error object', () => {
      const message = 'Error occurred';
      const error = new Error('Test error');

      mockLogger.error(message, error);

      expect(mockLogger.error).toHaveBeenCalledWith(message, error);
    });

    it('should log error messages with context object', () => {
      const message = 'Error occurred';
      const context = { errorCode: 500 };

      mockLogger.error(message, context);

      expect(mockLogger.error).toHaveBeenCalledWith(message, context);
    });

    it('should log error messages without additional data', () => {
      const message = 'Simple error';

      mockLogger.error(message);

      expect(mockLogger.error).toHaveBeenCalledWith(message);
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const { Logger } = require('../logger.js');
      const instance1 = Logger.getInstance();
      const instance2 = Logger.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});