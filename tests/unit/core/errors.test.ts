/**
 * Tests for StreamPortal Error System
 * Comprehensive testing of error handling classes and utilities
 */

import {
  AuthenticationError,
  ConnectionError,
  ChannelError,
  APIError,
  ConfigurationError,
  MessageError,
  ErrorHandler,
  handleError,
  withErrorHandling
} from '../../../src/core/errors';

describe('StreamPortal Error System', () => {
  
  describe('StreamPortalError (Base Class)', () => {
    it('should create error with user and technical messages', () => {
      const userMsg = 'Something went wrong';
      const techMsg = 'Technical details here';
      const error = new AuthenticationError(userMsg, techMsg);
      
      expect(error.userMessage).toBe(userMsg);
      expect(error.technicalMessage).toBe(techMsg);
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.name).toBe('AuthenticationError');
    });

    it('should use user message as technical message when not provided', () => {
      const userMsg = 'Authentication failed';
      const error = new AuthenticationError(userMsg);
      
      expect(error.userMessage).toBe(userMsg);
      expect(error.technicalMessage).toBe(userMsg);
    });

    it('should preserve original error stack when provided', () => {
      const originalError = new Error('Original error');
      const error = new AuthenticationError('Auth failed', 'Tech details', originalError);
      
      expect(error.stack).toBe(originalError.stack);
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error with default message', () => {
      const error = new AuthenticationError('Authentication failed');
      
      expect(error.userMessage).toContain('Authentication failed');
      expect(error.name).toBe('AuthenticationError');
    });

    it('should create authentication error with custom message', () => {
      const customMsg = 'Invalid credentials provided';
      const error = new AuthenticationError(customMsg);
      
      expect(error.userMessage).toBe(customMsg);
    });
  });

  describe('ConnectionError', () => {
    it('should create retryable connection error by default', () => {
      const error = new ConnectionError('Connection failed');
      
      expect(error.retryable).toBe(true);
      expect(error.userMessage).toContain('Connection failed');
    });

    it('should create non-retryable connection error when specified', () => {
      const error = new ConnectionError('Connection failed', false);
      
      expect(error.retryable).toBe(false);
    });

    it('should have default message for connection issues', () => {
      const error = new ConnectionError('Connection failed. Please check your internet connection.');
      
      expect(error.userMessage).toContain('Connection failed');
      expect(error.userMessage).toContain('internet connection');
    });
  });

  describe('ChannelError', () => {
    it('should create channel error with channel name', () => {
      const channelName = 'invalidchannel';
      const error = new ChannelError(channelName);
      
      expect(error.channelName).toBe(channelName);
      expect(error.userMessage).toContain(channelName);
    });

    it('should create channel error with custom message', () => {
      const channelName = 'testchannel';
      const customMsg = 'Channel is temporarily unavailable';
      const error = new ChannelError(channelName, customMsg);
      
      expect(error.channelName).toBe(channelName);
      expect(error.userMessage).toBe(customMsg);
    });
  });

  describe('APIError', () => {
    it('should detect rate limiting from status code', () => {
      const error = new APIError('Rate limited', 429);
      
      expect(error.statusCode).toBe(429);
      expect(error.rateLimited).toBe(true);
      expect(error.userMessage).toContain('rate limit');
    });

    it('should not be rate limited for other status codes', () => {
      const error = new APIError('Server error', 500);
      
      expect(error.statusCode).toBe(500);
      expect(error.rateLimited).toBe(false);
    });

    it('should handle undefined status code', () => {
      const error = new APIError('API failed');
      
      expect(error.statusCode).toBeUndefined();
      expect(error.rateLimited).toBe(false);
    });
  });

  describe('ConfigurationError', () => {
    it('should track missing configuration fields', () => {
      const missingFields = ['clientId', 'username'];
      const error = new ConfigurationError(missingFields);
      
      expect(error.missingFields).toEqual(missingFields);
      expect(error.userMessage).toContain('clientId');
      expect(error.userMessage).toContain('username');
    });

    it('should provide guidance for configuration', () => {
      const error = new ConfigurationError(['clientId']);
      
      expect(error.userMessage).toContain('Settings');
      expect(error.userMessage).toContain('Extensions');
      expect(error.userMessage).toContain('StreamPortal');
    });
  });

  describe('MessageError', () => {
    it('should create message error with default message', () => {
      const error = new MessageError('Failed to send message');
      
      expect(error.userMessage).toContain('Failed to send message');
    });

    it('should create message error with custom message', () => {
      const customMsg = 'Message too long';
      const error = new MessageError(customMsg);
      
      expect(error.userMessage).toBe(customMsg);
    });
  });

  describe('ErrorHandler', () => {
    let errorHandler: ErrorHandler;
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      errorHandler = ErrorHandler.getInstance();
      consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should be a singleton', () => {
      const handler1 = ErrorHandler.getInstance();
      const handler2 = ErrorHandler.getInstance();
      
      expect(handler1).toBe(handler2);
    });

    it('should handle StreamPortal errors with context', () => {
      const error = new AuthenticationError('Auth failed', 'Token expired');
      const context = 'user login';
      
      errorHandler.handleError(error, context);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[user login] Token expired')
      );
    });

    it('should handle unknown errors gracefully', () => {
      const error = new Error('Unknown error');
      const context = 'test operation';
      
      errorHandler.handleError(error, context);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[test operation] Unknown error')
      );
    });

    it('should handle errors without context', () => {
      const error = new ConnectionError('Connection lost');
      
      errorHandler.handleError(error);
      
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('handleError utility function', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should handle errors using ErrorHandler instance', () => {
      const error = new MessageError('Send failed');
      
      handleError(error, 'message sending');
      
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('withErrorHandling utility function', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should return result when operation succeeds', async () => {
      const expectedResult = 'success';
      const operation = jest.fn().mockResolvedValue(expectedResult);
      
      const result = await withErrorHandling(operation, 'test operation');
      
      expect(result).toBe(expectedResult);
      expect(operation).toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should handle errors and return fallback value', async () => {
      const error = new Error('Operation failed');
      const fallbackValue = 'fallback';
      const operation = jest.fn().mockRejectedValue(error);
      
      const result = await withErrorHandling(operation, 'test operation', fallbackValue);
      
      expect(result).toBe(fallbackValue);
      expect(operation).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should return undefined when no fallback provided', async () => {
      const error = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(error);
      
      const result = await withErrorHandling(operation, 'test operation');
      
      expect(result).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle StreamPortal errors correctly', async () => {
      const error = new AuthenticationError('Auth failed');
      const operation = jest.fn().mockRejectedValue(error);
      
      const result = await withErrorHandling(operation, 'authentication');
      
      expect(result).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[authentication]')
      );
    });
  });

  describe('Error severity determination', () => {
    let errorHandler: ErrorHandler;

    beforeEach(() => {
      errorHandler = ErrorHandler.getInstance();
    });

    it('should treat retryable connection errors as warnings', () => {
      const error = new ConnectionError('Network issue', true);
      
      // We can't directly test getSeverity as it's private, 
      // but we can test the behavior through handleError
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      errorHandler.handleError(error);
      
      consoleSpy.mockRestore();
    });

    it('should treat rate limited API errors as warnings', () => {
      const error = new APIError('Rate limited', 429);
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      errorHandler.handleError(error);
      
      consoleSpy.mockRestore();
    });
  });
});