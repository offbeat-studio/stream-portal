/**
 * Tests for TwitchChatManager
 * Comprehensive testing of chat management, authentication, and message handling
 */

import { TwitchChatManager } from '../../../src/twitch/twitchChatManager';
import { ConnectionState, UserType } from '../../../src/twitch/types/twitch';
import { testData, createMockChatMessage } from '../../fixtures/test-data';
import * as vscode from 'vscode';

// Mock the dependencies
jest.mock('../../../src/twitch/auth/authManager');
jest.mock('../../../src/twitch/irc/connectionManager');
jest.mock('../../../src/twitch/irc/ircProtocol');

// Import mocked classes
import { AuthManager } from '../../../src/twitch/auth/authManager';
import { IRCConnectionManager } from '../../../src/twitch/irc/connectionManager';
import { IRCProtocolHandler } from '../../../src/twitch/irc/ircProtocol';

describe('TwitchChatManager', () => {
  let chatManager: TwitchChatManager;
  let mockContext: vscode.ExtensionContext;
  let mockAuthManager: jest.Mocked<AuthManager>;
  let mockConnectionManager: jest.Mocked<IRCConnectionManager>;
  let mockProtocolHandler: jest.Mocked<IRCProtocolHandler>;

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

    // Create mock instances
    mockAuthManager = {
      validateConfig: jest.fn(),
      authenticate: jest.fn(),
      isAuthenticated: jest.fn(),
      getAccessToken: jest.fn(),
      validateCurrentToken: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn()
    } as any;

    mockConnectionManager = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      joinChannel: jest.fn(),
      switchToChannel: jest.fn(),
      sendMessage: jest.fn(),
      isConnected: jest.fn(),
      getConnectionState: jest.fn(),
      onMessage: jest.fn(),
      onStateChange: jest.fn(),
      onError: jest.fn()
    } as any;

    mockProtocolHandler = {
      parsePrivMsg: jest.fn(),
      isPrivateMessage: jest.fn()
    } as any;

    // Mock constructor calls
    (AuthManager as jest.MockedClass<typeof AuthManager>).mockImplementation(() => mockAuthManager);
    (IRCConnectionManager as jest.MockedClass<typeof IRCConnectionManager>).mockImplementation(() => mockConnectionManager);
    (IRCProtocolHandler as jest.MockedClass<typeof IRCProtocolHandler>).mockImplementation(() => mockProtocolHandler);

    // Create chat manager instance
    chatManager = new TwitchChatManager(mockContext);
  });

  afterEach(() => {
    chatManager.dispose();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with proper dependencies', () => {
      expect(AuthManager).toHaveBeenCalledWith(mockContext);
      expect(IRCConnectionManager).toHaveBeenCalled();
      expect(IRCProtocolHandler).toHaveBeenCalled();
    });

    it('should setup connection handlers during initialization', () => {
      expect(mockConnectionManager.onMessage).toHaveBeenCalled();
      expect(mockConnectionManager.onStateChange).toHaveBeenCalled();
      expect(mockConnectionManager.onError).toHaveBeenCalled();
    });

    it('should create status bar item', () => {
      expect(global.testUtils.mockVSCode.window.createStatusBarItem).toHaveBeenCalled();
    });
  });

  describe('Authentication Flow', () => {
    it('should authenticate successfully with valid config', async () => {
      mockAuthManager.validateConfig.mockReturnValue({
        isValid: true,
        missingFields: []
      });
      mockAuthManager.authenticate.mockResolvedValue({
        success: true,
        token: testData.authResponses.success as any
      });

      const result = await chatManager.authenticate();

      expect(result).toBe(true);
      expect(mockAuthManager.validateConfig).toHaveBeenCalled();
      expect(mockAuthManager.authenticate).toHaveBeenCalled();
      expect(global.testUtils.mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
        'Successfully authenticated with Twitch!'
      );
    });

    it('should handle missing configuration gracefully', async () => {
      mockAuthManager.validateConfig.mockReturnValue({
        isValid: false,
        missingFields: ['clientId', 'username']
      });

      const result = await chatManager.authenticate();

      expect(result).toBe(false);
      expect(mockAuthManager.authenticate).not.toHaveBeenCalled();
    });

    it('should handle authentication failures', async () => {
      mockAuthManager.validateConfig.mockReturnValue({
        isValid: true,
        missingFields: []
      });
      mockAuthManager.authenticate.mockResolvedValue({
        success: false,
        error: 'Invalid credentials'
      });

      const result = await chatManager.authenticate();

      expect(result).toBe(false);
    });

    it('should handle authentication errors with proper error handling', async () => {
      mockAuthManager.validateConfig.mockReturnValue({
        isValid: true,
        missingFields: []
      });
      mockAuthManager.authenticate.mockRejectedValue(new Error('Network error'));

      const result = await chatManager.authenticate();

      expect(result).toBe(false);
    });
  });

  describe('Channel Connection', () => {
    beforeEach(() => {
      // Setup successful authentication
      mockAuthManager.isAuthenticated.mockReturnValue(true);
      mockAuthManager.getAccessToken.mockReturnValue('valid-token');
      mockAuthManager.validateCurrentToken.mockResolvedValue(true);
    });

    it('should connect to valid channels', async () => {
      const channel = 'testchannel';
      mockConnectionManager.isConnected.mockReturnValue(false);
      mockConnectionManager.connect.mockResolvedValue();
      mockConnectionManager.joinChannel.mockResolvedValue();
      mockConnectionManager.getConnectionState.mockReturnValue(ConnectionState.CONNECTED);

      const result = await chatManager.connectToChannel(channel);

      expect(result).toBe(true);
      expect(mockConnectionManager.connect).toHaveBeenCalledWith('valid-token', 'testuser');
      expect(mockConnectionManager.joinChannel).toHaveBeenCalledWith(channel);
      expect(global.testUtils.mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
        `Connected to Twitch channel: ${channel}`
      );
    });

    it('should handle invalid channel names', async () => {
      const invalidChannel = '';

      const result = await chatManager.connectToChannel(invalidChannel);

      expect(result).toBe(false);
      expect(mockConnectionManager.connect).not.toHaveBeenCalled();
    });

    it('should handle already connected to same channel', async () => {
      const channel = 'testchannel';
      mockConnectionManager.isConnected.mockReturnValue(true);
      
      // Set current channel by connecting first
      await chatManager.connectToChannel(channel);
      mockConnectionManager.isConnected.mockReturnValue(true);
      
      const result = await chatManager.connectToChannel(channel);

      expect(result).toBe(true);
      expect(global.testUtils.mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
        `Already connected to ${channel}`
      );
    });

    it('should switch channels efficiently', async () => {
      const oldChannel = 'oldchannel';
      const newChannel = 'newchannel';
      
      // First connect to old channel
      mockConnectionManager.isConnected.mockReturnValue(false);
      mockConnectionManager.connect.mockResolvedValue();
      mockConnectionManager.joinChannel.mockResolvedValue();
      mockConnectionManager.getConnectionState.mockReturnValue(ConnectionState.CONNECTED);
      
      await chatManager.connectToChannel(oldChannel);
      
      // Now switch to new channel
      mockConnectionManager.isConnected.mockReturnValue(true);
      mockConnectionManager.switchToChannel.mockResolvedValue();
      
      const result = await chatManager.connectToChannel(newChannel);

      expect(result).toBe(true);
      expect(mockConnectionManager.switchToChannel).toHaveBeenCalledWith(newChannel);
    });

    it('should handle token refresh when needed', async () => {
      const channel = 'testchannel';
      mockConnectionManager.isConnected.mockReturnValue(false);
      mockAuthManager.validateCurrentToken.mockResolvedValue(false);
      mockAuthManager.refreshToken.mockResolvedValue();
      mockAuthManager.getAccessToken.mockReturnValue('refreshed-token');
      mockConnectionManager.connect.mockResolvedValue();
      mockConnectionManager.joinChannel.mockResolvedValue();

      const result = await chatManager.connectToChannel(channel);

      expect(result).toBe(true);
      expect(mockAuthManager.refreshToken).toHaveBeenCalled();
      expect(mockConnectionManager.connect).toHaveBeenCalledWith('refreshed-token', 'testuser');
    });

    it('should handle connection failures gracefully', async () => {
      const channel = 'testchannel';
      mockConnectionManager.isConnected.mockReturnValue(false);
      mockConnectionManager.connect.mockRejectedValue(new Error('Connection failed'));

      const result = await chatManager.connectToChannel(channel);

      expect(result).toBe(false);
    });
  });

  describe('Message Handling', () => {
    beforeEach(() => {
      // Setup connected state
      mockConnectionManager.isConnected.mockReturnValue(true);
      chatManager['currentChannel'] = 'testchannel';
    });

    it('should send messages successfully', async () => {
      const message = 'Hello world!';
      mockConnectionManager.sendMessage.mockImplementation(() => {});

      const result = await chatManager.sendMessage(message);

      expect(result).toBe(true);
      expect(mockConnectionManager.sendMessage).toHaveBeenCalledWith('testchannel', message);
    });

    it('should create self-messages correctly', async () => {
      const message = 'My test message';
      let capturedMessage: any = null;
      
      // Mock the message handler to capture emitted messages
      chatManager.onChatMessage((msg) => {
        if (msg.isSelf) {
          capturedMessage = msg;
        }
      });

      await chatManager.sendMessage(message);

      expect(capturedMessage).toBeTruthy();
      expect(capturedMessage.message).toBe(message);
      expect(capturedMessage.isSelf).toBe(true);
      expect(capturedMessage.username).toBe('testuser');
      expect(capturedMessage.channel).toBe('testchannel');
    });

    it('should validate message content', async () => {
      const emptyMessage = '';

      const result = await chatManager.sendMessage(emptyMessage);

      expect(result).toBe(false);
      expect(mockConnectionManager.sendMessage).not.toHaveBeenCalled();
    });

    it('should handle send failures gracefully', async () => {
      const message = 'Test message';
      mockConnectionManager.sendMessage.mockImplementation(() => {
        throw new Error('Send failed');
      });

      const result = await chatManager.sendMessage(message);

      expect(result).toBe(false);
    });

    it('should reject sending when not connected', async () => {
      mockConnectionManager.isConnected.mockReturnValue(false);
      const message = 'Test message';

      const result = await chatManager.sendMessage(message);

      expect(result).toBe(false);
    });

    it('should reject sending when no channel joined', async () => {
      chatManager['currentChannel'] = '';
      const message = 'Test message';

      const result = await chatManager.sendMessage(message);

      expect(result).toBe(false);
    });
  });

  describe('Event Management', () => {
    it('should register chat message handlers correctly', () => {
      const handler = jest.fn();
      
      chatManager.onChatMessage(handler);
      
      // Simulate receiving a message
      const mockMessage = createMockChatMessage();
      mockProtocolHandler.isPrivateMessage.mockReturnValue(true);
      mockProtocolHandler.parsePrivMsg.mockReturnValue(mockMessage);
      
      // Trigger the IRC message handler
      const messageHandlerCall = mockConnectionManager.onMessage.mock.calls[0][0];
      messageHandlerCall({ command: 'PRIVMSG', params: ['#test', 'message'], raw: 'test' });
      
      expect(handler).toHaveBeenCalledWith(mockMessage);
    });

    it('should register connection state handlers correctly', () => {
      const handler = jest.fn();
      
      chatManager.onConnectionStateChange(handler);
      
      // Trigger the state change handler
      const stateHandlerCall = mockConnectionManager.onStateChange.mock.calls[0][0];
      stateHandlerCall(ConnectionState.CONNECTED);
      
      expect(handler).toHaveBeenCalledWith(ConnectionState.CONNECTED);
    });

    it('should handle handler errors gracefully', () => {
      const faultyHandler = jest.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });
      
      chatManager.onChatMessage(faultyHandler);
      
      // Should not throw when handler fails
      expect(() => {
        const mockMessage = createMockChatMessage();
        mockProtocolHandler.isPrivateMessage.mockReturnValue(true);
        mockProtocolHandler.parsePrivMsg.mockReturnValue(mockMessage);
        
        const messageHandlerCall = mockConnectionManager.onMessage.mock.calls[0][0];
        messageHandlerCall({ command: 'PRIVMSG', params: ['#test', 'message'], raw: 'test' });
      }).not.toThrow();
    });
  });

  describe('State Management', () => {
    it('should track connection state correctly', () => {
      mockConnectionManager.getConnectionState.mockReturnValue(ConnectionState.CONNECTED);
      
      expect(chatManager.getConnectionState()).toBe(ConnectionState.CONNECTED);
    });

    it('should track authentication state correctly', () => {
      mockAuthManager.isAuthenticated.mockReturnValue(true);
      
      expect(chatManager.isAuthenticated()).toBe(true);
    });

    it('should track current channel correctly', () => {
      const channel = 'testchannel';
      chatManager['currentChannel'] = channel;
      
      expect(chatManager.getCurrentChannel()).toBe(channel);
    });

    it('should track connection status correctly', () => {
      mockConnectionManager.isConnected.mockReturnValue(true);
      
      expect(chatManager.isConnected()).toBe(true);
    });
  });

  describe('Cleanup and Disposal', () => {
    it('should disconnect and cleanup on logout', async () => {
      mockAuthManager.logout.mockResolvedValue();
      
      await chatManager.logout();
      
      expect(mockConnectionManager.disconnect).toHaveBeenCalled();
      expect(mockAuthManager.logout).toHaveBeenCalled();
    });

    it('should cleanup resources on disposal', () => {
      chatManager.dispose();
      
      expect(mockConnectionManager.disconnect).toHaveBeenCalled();
      expect(global.testUtils.mockStatusBarItem.dispose).toHaveBeenCalled();
    });

    it('should handle disconnect gracefully', async () => {
      await chatManager.disconnect();
      
      expect(mockConnectionManager.disconnect).toHaveBeenCalled();
      expect(chatManager.getCurrentChannel()).toBe('');
      expect(global.testUtils.mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
        'Disconnected from Twitch chat'
      );
    });
  });

  describe('IRC Message Processing', () => {
    it('should process PRIVMSG correctly', () => {
      const mockMessage = createMockChatMessage({
        username: 'testuser',
        message: 'Hello world!',
        channel: 'testchannel'
      });
      
      mockProtocolHandler.isPrivateMessage.mockReturnValue(true);
      mockProtocolHandler.parsePrivMsg.mockReturnValue(mockMessage);
      
      const messageHandler = jest.fn();
      chatManager.onChatMessage(messageHandler);
      
      // Trigger IRC message handling
      const ircMessageHandler = mockConnectionManager.onMessage.mock.calls[0][0];
      ircMessageHandler({
        command: 'PRIVMSG',
        params: ['#testchannel', 'Hello world!'],
        prefix: 'testuser!testuser@testuser.tmi.twitch.tv',
        raw: ':testuser!testuser@testuser.tmi.twitch.tv PRIVMSG #testchannel :Hello world!'
      });
      
      expect(mockProtocolHandler.parsePrivMsg).toHaveBeenCalled();
      expect(messageHandler).toHaveBeenCalledWith(mockMessage);
    });

    it('should handle non-PRIVMSG IRC messages', () => {
      mockProtocolHandler.isPrivateMessage.mockReturnValue(false);
      
      const messageHandler = jest.fn();
      chatManager.onChatMessage(messageHandler);
      
      // Trigger IRC message handling with JOIN command
      const ircMessageHandler = mockConnectionManager.onMessage.mock.calls[0][0];
      ircMessageHandler({
        command: 'JOIN',
        params: ['#testchannel'],
        prefix: 'testuser!testuser@testuser.tmi.twitch.tv',
        raw: ':testuser!testuser@testuser.tmi.twitch.tv JOIN #testchannel'
      });
      
      expect(mockProtocolHandler.parsePrivMsg).not.toHaveBeenCalled();
      expect(messageHandler).not.toHaveBeenCalled();
    });
  });
});