/**
 * Integration Tests for Authentication Flow
 * End-to-end testing of authentication process
 */

import { AuthManager } from '../../src/twitch/auth/authManager';
import { TwitchChatManager } from '../../src/twitch/twitchChatManager';
import { testData } from '../fixtures/test-data';
import * as vscode from 'vscode';

describe('Authentication Flow Integration', () => {
  let mockContext: vscode.ExtensionContext;
  let authManager: AuthManager;
  let chatManager: TwitchChatManager;

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

    // Setup valid configuration
    global.testUtils.mockVSCode.workspace.getConfiguration.mockReturnValue({
      get: jest.fn((key: string) => {
        const config = testData.configurations.valid as any;
        return config[key];
      })
    });

    authManager = new AuthManager(mockContext);
    chatManager = new TwitchChatManager(mockContext);
  });

  afterEach(() => {
    chatManager.dispose();
    jest.clearAllMocks();
  });

  describe('Complete Authentication Process', () => {
    it('should authenticate and prepare for chat connection', async () => {
      // Mock successful authentication
      const mockAuthResult = {
        success: true,
        token: testData.authResponses.success
      };

      jest.spyOn(authManager, 'authenticate').mockResolvedValue(mockAuthResult);
      jest.spyOn(authManager, 'isAuthenticated').mockReturnValue(true);
      jest.spyOn(authManager, 'getAccessToken').mockReturnValue(testData.authResponses.success.access_token);

      // Perform authentication through chat manager
      const result = await chatManager.authenticate();

      expect(result).toBe(true);
      expect(authManager.authenticate).toHaveBeenCalled();
      expect(chatManager.isAuthenticated()).toBe(true);
    });

    it('should handle authentication failure gracefully', async () => {
      // Mock failed authentication
      const mockAuthResult = {
        success: false,
        error: 'Invalid credentials'
      };

      jest.spyOn(authManager, 'authenticate').mockResolvedValue(mockAuthResult);
      jest.spyOn(authManager, 'isAuthenticated').mockReturnValue(false);

      // Attempt authentication through chat manager
      const result = await chatManager.authenticate();

      expect(result).toBe(false);
      expect(chatManager.isAuthenticated()).toBe(false);
    });

    it('should validate configuration before authentication', async () => {
      // Mock invalid configuration
      global.testUtils.mockVSCode.workspace.getConfiguration.mockReturnValue({
        get: jest.fn((key: string) => {
          const config = testData.configurations.missingUsername as any;
          return config[key];
        })
      });

      const result = await chatManager.authenticate();

      expect(result).toBe(false);
    });
  });

  describe('Token Management Integration', () => {
    beforeEach(() => {
      // Mock existing token
      mockContext.globalState.get = jest.fn((key: string) => {
        if (key === 'twitchToken') {
          return testData.authResponses.success;
        }
        return undefined;
      });

      jest.spyOn(authManager, 'isAuthenticated').mockReturnValue(true);
      jest.spyOn(authManager, 'getAccessToken').mockReturnValue(testData.authResponses.success.access_token);
      jest.spyOn(authManager, 'validateCurrentToken').mockResolvedValue(true);
    });

    it('should use existing valid token for connection', async () => {
      // Mock connection attempt
      jest.spyOn(chatManager, 'connectToChannel').mockResolvedValue(true);

      const result = await chatManager.connectToChannel('testchannel');

      expect(result).toBe(true);
      expect(authManager.validateCurrentToken).toHaveBeenCalled();
    });

    it('should refresh expired token automatically', async () => {
      // Mock expired token
      jest.spyOn(authManager, 'validateCurrentToken').mockResolvedValue(false);
      jest.spyOn(authManager, 'refreshToken').mockResolvedValue();
      jest.spyOn(authManager, 'getAccessToken').mockReturnValue('new-token');
      jest.spyOn(chatManager, 'connectToChannel').mockResolvedValue(true);

      const result = await chatManager.connectToChannel('testchannel');

      expect(authManager.refreshToken).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('Logout Integration', () => {
    it('should logout and disconnect completely', async () => {
      // Setup authenticated state
      jest.spyOn(authManager, 'isAuthenticated').mockReturnValue(true);
      jest.spyOn(authManager, 'logout').mockResolvedValue();
      jest.spyOn(chatManager, 'disconnect').mockResolvedValue();

      await chatManager.logout();

      expect(authManager.logout).toHaveBeenCalled();
      expect(chatManager.disconnect).toHaveBeenCalled();
    });

    it('should handle logout when not connected', async () => {
      // Setup unauthenticated state
      jest.spyOn(authManager, 'isAuthenticated').mockReturnValue(false);
      jest.spyOn(authManager, 'logout').mockResolvedValue();

      await expect(chatManager.logout()).resolves.not.toThrow();
    });
  });
});