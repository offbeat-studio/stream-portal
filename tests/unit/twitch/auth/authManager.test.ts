/**
 * Tests for AuthManager
 * Comprehensive testing of authentication, token management, and configuration validation
 */

import { AuthManager } from '../../../../src/twitch/auth/authManager';
import { testData } from '../../../fixtures/test-data';
import * as vscode from 'vscode';

// Mock the HTTP requests
jest.mock('https', () => ({
  request: jest.fn()
}));

// Mock the express and open modules
jest.mock('express', () => {
  return jest.fn(() => ({
    get: jest.fn(),
    listen: jest.fn((port, callback) => callback()),
    close: jest.fn()
  }));
});

jest.mock('open', () => ({
  default: jest.fn()
}));

describe('AuthManager', () => {
  let authManager: AuthManager;
  let mockContext: vscode.ExtensionContext;
  let mockHttpRequest: jest.Mock;

  beforeEach(() => {
    // Create mock context
    mockContext = {
      subscriptions: [],
      workspaceState: {
        get: jest.fn(),
        update: jest.fn(),
        keys: jest.fn()
      },
      globalState: {
        get: jest.fn(),
        update: jest.fn(),
        keys: jest.fn(),
        setKeysForSync: jest.fn()
      },
      extensionUri: { toString: () => 'test://extension' } as any,
      extensionPath: '/test/path',
      environmentVariableCollection: {} as any,
      asAbsolutePath: jest.fn(),
      storageUri: { toString: () => 'test://storage' } as any,
      storagePath: '/test/storage',
      globalStorageUri: { toString: () => 'test://global-storage' } as any,
      globalStoragePath: '/test/global-storage',
      logUri: { toString: () => 'test://log' } as any,
      logPath: '/test/log',
      extensionMode: 1 as any,
      extension: {} as any,
      secrets: {} as any,
      languageModelAccessInformation: {} as any
    };

    // Mock HTTP request
    const https = require('https');
    mockHttpRequest = https.request as jest.Mock;

    // Create auth manager instance
    authManager = new AuthManager(mockContext);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration Validation', () => {
    beforeEach(() => {
      // Mock workspace configuration
      global.testUtils.mockVSCode.workspace.getConfiguration.mockReturnValue({
        get: jest.fn((key: string) => {
          const config = testData.configurations.valid as any;
          return config[key];
        })
      });
    });

    it('should validate complete configuration', () => {
      const result = authManager.validateConfig();

      expect(result.isValid).toBe(true);
      expect(result.missingFields).toEqual([]);
    });

    it('should detect missing username', () => {
      global.testUtils.mockVSCode.workspace.getConfiguration.mockReturnValue({
        get: jest.fn((key: string) => {
          const config = testData.configurations.missingUsername as any;
          return config[key];
        })
      });

      const result = authManager.validateConfig();

      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('username');
    });

    it('should detect missing clientId', () => {
      global.testUtils.mockVSCode.workspace.getConfiguration.mockReturnValue({
        get: jest.fn((key: string) => {
          const config = testData.configurations.missingClientId as any;
          return config[key];
        })
      });

      const result = authManager.validateConfig();

      expect(result.isValid).toBe(false);  
      expect(result.missingFields).toContain('clientId');
    });

    it('should detect all missing fields', () => {
      global.testUtils.mockVSCode.workspace.getConfiguration.mockReturnValue({
        get: jest.fn(() => undefined)
      });

      const result = authManager.validateConfig();

      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('username');
      expect(result.missingFields).toContain('clientId');
      expect(result.missingFields).toContain('clientSecret');
      expect(result.missingFields).toContain('redirectUri');
    });
  });

  describe('Authentication Flow', () => {
    beforeEach(() => {
      // Setup valid configuration
      global.testUtils.mockVSCode.workspace.getConfiguration.mockReturnValue({
        get: jest.fn((key: string) => {
          const config = testData.configurations.valid as any;
          return config[key];
        })
      });
    });

    it('should authenticate successfully with valid credentials', async () => {
      // Mock successful HTTP response
      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback(JSON.stringify(testData.authResponses.success));
          } else if (event === 'end') {
            callback();
          }
        })
      };

      const mockRequest = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };

      mockHttpRequest.mockImplementation((options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const result = await authManager.authenticate();

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.token?.access_token).toBe(testData.authResponses.success.access_token);
    });

    it('should handle authentication failure gracefully', async () => {
      // Mock failed HTTP response
      const mockResponse = {
        statusCode: 400,
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback(JSON.stringify(testData.authResponses.failure));
          } else if (event === 'end') {
            callback();
          }
        })
      };

      const mockRequest = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };

      mockHttpRequest.mockImplementation((options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const result = await authManager.authenticate();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle network errors during authentication', async () => {
      const mockRequest = {
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            callback(testData.errorScenarios.networkError);
          }
        }),
        write: jest.fn(),
        end: jest.fn()
      };

      mockHttpRequest.mockReturnValue(mockRequest);

      const result = await authManager.authenticate();

      expect(result.success).toBe(false);
      expect(result.error).toContain('network');
    });
  });

  describe('Token Management', () => {
    beforeEach(() => {
      // Mock stored token data
      mockContext.globalState.get = jest.fn((key: string) => {
        if (key === 'twitchToken') {
          return testData.authResponses.success;
        }
        return undefined;
      });
    });

    it('should detect authenticated state with valid token', () => {
      const isAuth = authManager.isAuthenticated();

      expect(isAuth).toBe(true);
    });

    it('should detect unauthenticated state without token', () => {
      mockContext.globalState.get = jest.fn(() => undefined);

      const isAuth = authManager.isAuthenticated();

      expect(isAuth).toBe(false);
    });

    it('should return access token when available', () => {
      const token = authManager.getAccessToken();

      expect(token).toBe(testData.authResponses.success.access_token);
    });

    it('should return null when no access token available', () => {
      mockContext.globalState.get = jest.fn(() => undefined);

      const token = authManager.getAccessToken();

      expect(token).toBeNull();
    });

    it('should validate current token successfully', async () => {
      // Mock successful token validation response
      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback(JSON.stringify({ client_id: 'test-client-id', user_id: '123' }));
          } else if (event === 'end') {
            callback();
          }
        })
      };

      const mockRequest = {
        on: jest.fn(),
        end: jest.fn()
      };

      mockHttpRequest.mockImplementation((options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const isValid = await authManager.validateCurrentToken();

      expect(isValid).toBe(true);
    });

    it('should detect invalid token', async () => {
      // Mock failed token validation response
      const mockResponse = {
        statusCode: 401,
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback(JSON.stringify({ error: 'invalid token' }));
          } else if (event === 'end') {
            callback();
          }
        })
      };

      const mockRequest = {
        on: jest.fn(),
        end: jest.fn()
      };

      mockHttpRequest.mockImplementation((options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const isValid = await authManager.validateCurrentToken();

      expect(isValid).toBe(false);
    });
  });

  describe('Token Refresh', () => {
    beforeEach(() => {
      // Mock stored token with refresh token
      mockContext.globalState.get = jest.fn((key: string) => {
        if (key === 'twitchToken') {
          return testData.authResponses.success;
        }
        return undefined;
      });

      // Setup valid configuration
      global.testUtils.mockVSCode.workspace.getConfiguration.mockReturnValue({
        get: jest.fn((key: string) => {
          const config = testData.configurations.valid as any;
          return config[key];
        })
      });
    });

    it('should refresh token successfully', async () => {
      // Mock successful refresh response
      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback(JSON.stringify(testData.authResponses.refreshSuccess));
          } else if (event === 'end') {
            callback();
          }
        })
      };

      const mockRequest = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };

      mockHttpRequest.mockImplementation((options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      await authManager.refreshToken();

      // Verify new token was stored
      expect(mockContext.globalState.update).toHaveBeenCalledWith(
        'twitchToken',
        testData.authResponses.refreshSuccess
      );
    });

    it('should handle refresh failure', async () => {
      // Mock failed refresh response
      const mockResponse = {
        statusCode: 400,
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback(JSON.stringify({ error: 'invalid_grant' }));
          } else if (event === 'end') {
            callback();
          }
        })
      };

      const mockRequest = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };

      mockHttpRequest.mockImplementation((options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      await expect(authManager.refreshToken()).rejects.toThrow();
    });

    it('should handle missing refresh token', async () => {
      // Mock token without refresh token
      mockContext.globalState.get = jest.fn((key: string) => {
        if (key === 'twitchToken') {
          return { access_token: 'test', expires_in: 3600 };
        }
        return undefined;
      });

      await expect(authManager.refreshToken()).rejects.toThrow('No refresh token available');
    });
  });

  describe('Logout', () => {
    it('should clear stored tokens on logout', async () => {
      await authManager.logout();

      expect(mockContext.globalState.update).toHaveBeenCalledWith('twitchToken', undefined);
    });

    it('should handle logout when not authenticated', async () => {
      mockContext.globalState.get = jest.fn(() => undefined);

      await expect(authManager.logout()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed responses gracefully', async () => {
      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback('invalid json');
          } else if (event === 'end') {
            callback();
          }
        })
      };

      const mockRequest = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };

      mockHttpRequest.mockImplementation((options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const result = await authManager.authenticate();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle timeout errors', async () => {
      const mockRequest = {
        on: jest.fn((event, callback) => {
          if (event === 'timeout') {
            callback();
          }
        }),
        write: jest.fn(),
        end: jest.fn(),
        setTimeout: jest.fn()
      };

      mockHttpRequest.mockReturnValue(mockRequest);

      const result = await authManager.authenticate();

      expect(result.success).toBe(false);
    });
  });

  describe('Configuration Updates', () => {
    it('should react to configuration changes', () => {
      const newConfig = {
        username: 'newuser',
        clientId: 'new-client-id',
        clientSecret: 'new-secret',
        redirectUri: 'http://localhost:8888/callback'
      };

      global.testUtils.mockVSCode.workspace.getConfiguration.mockReturnValue({
        get: jest.fn((key: string) => (newConfig as any)[key])
      });

      const result = authManager.validateConfig();

      expect(result.isValid).toBe(true);
      expect(result.missingFields).toEqual([]);
    });
  });
});