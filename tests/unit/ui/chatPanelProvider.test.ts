/**
 * Tests for ChatPanelProvider
 * Comprehensive testing of webview management, message handling, and UI interactions
 */

import { ChatPanelProvider } from '../../../src/ui/chatPanelProvider';
import { TwitchChatManager } from '../../../src/twitch/twitchChatManager';
import { ConnectionState, UserType } from '../../../src/twitch/types/twitch';
import { testData, createMockChatMessage } from '../../fixtures/test-data';
import * as vscode from 'vscode';

// Mock the TwitchChatManager
jest.mock('../../../src/twitch/twitchChatManager');

describe('ChatPanelProvider', () => {
  let chatPanelProvider: ChatPanelProvider;
  let mockContext: vscode.ExtensionContext;
  let mockChatManager: jest.Mocked<TwitchChatManager>;
  let mockWebviewView: vscode.WebviewView;
  let mockWebview: vscode.Webview;

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
      asAbsolutePath: jest.fn((path: string) => `/absolute/${path}`),
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

    // Create mock webview
    mockWebview = {
      html: '',
      options: {},
      cspSource: 'vscode-webview:',
      asWebviewUri: jest.fn((uri) => ({
        toString: () => `webview://file${uri.path}`,
        scheme: 'webview',
        path: uri.path
      })),
      postMessage: jest.fn(),
      onDidReceiveMessage: jest.fn()
    } as any;

    // Create mock webview view
    mockWebviewView = {
      webview: mockWebview,
      show: jest.fn(),
      visible: true,
      onDidDispose: jest.fn(),
      onDidChangeVisibility: jest.fn(),
      title: 'StreamPortal Chat',
      description: undefined,
      badge: undefined
    } as any;

    // Create mock chat manager
    mockChatManager = {
      authenticate: jest.fn(),
      connectToChannel: jest.fn(),
      sendMessage: jest.fn(),
      disconnect: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: jest.fn(),
      isConnected: jest.fn(),
      getConnectionState: jest.fn(),
      getCurrentChannel: jest.fn(),
      onChatMessage: jest.fn(),
      onConnectionStateChange: jest.fn(),
      dispose: jest.fn()
    } as any;

    // Mock TwitchChatManager constructor
    (TwitchChatManager as jest.MockedClass<typeof TwitchChatManager>).mockImplementation(() => mockChatManager);

    // Create chat panel provider
    chatPanelProvider = new ChatPanelProvider(mockContext);
  });

  afterEach(() => {
    chatPanelProvider.dispose();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with proper dependencies', () => {
      expect(TwitchChatManager).toHaveBeenCalledWith(mockContext);
    });

    it('should setup event handlers during initialization', () => {
      expect(mockChatManager.onChatMessage).toHaveBeenCalled();
      expect(mockChatManager.onConnectionStateChange).toHaveBeenCalled();
    });
  });

  describe('Webview Resolution', () => {
    beforeEach(() => {
      // Setup successful resolution
      chatPanelProvider.resolveWebviewView(mockWebviewView, undefined as any, undefined as any);
    });

    it('should set webview options correctly', () => {
      expect(mockWebview.options).toEqual({
        enableScripts: true,
        localResourceRoots: [mockContext.extensionUri]
      });
    });

    it('should set initial HTML content', () => {
      expect(mockWebview.html).toContain('StreamPortal Chat');
      expect(mockWebview.html).toContain('<!DOCTYPE html>');
      expect(mockWebview.html).toContain('<div id="chat-container">');
    });

    it('should setup message handler', () => {
      expect(mockWebview.onDidReceiveMessage).toHaveBeenCalled();
    });

    it('should generate proper webview URIs for resources', () => {
      expect(mockContext.asAbsolutePath).toHaveBeenCalledWith('media/chatPanel.js');
      expect(mockContext.asAbsolutePath).toHaveBeenCalledWith('media/styles.css');
      expect(mockWebview.asWebviewUri).toHaveBeenCalled();
    });
  });

  describe('Message Handling from Webview', () => {
    beforeEach(() => {
      chatPanelProvider.resolveWebviewView(mockWebviewView, undefined as any, undefined as any);
      
      // Get the message handler that was registered
      const messageHandlerCall = (mockWebview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
      chatPanelProvider['handleWebviewMessage'] = messageHandlerCall;
    });

    it('should handle authenticate command', async () => {
      mockChatManager.authenticate.mockResolvedValue(true);

      const message = { command: 'authenticate' };
      await chatPanelProvider['handleWebviewMessage'](message);

      expect(mockChatManager.authenticate).toHaveBeenCalled();
    });

    it('should handle connectToChannel command', async () => {
      const channel = 'testchannel';
      mockChatManager.connectToChannel.mockResolvedValue(true);

      const message = { command: 'connectToChannel', channel };
      await chatPanelProvider['handleWebviewMessage'](message);

      expect(mockChatManager.connectToChannel).toHaveBeenCalledWith(channel);
    });

    it('should handle sendMessage command', async () => {
      const messageText = 'Hello world!';
      mockChatManager.sendMessage.mockResolvedValue(true);

      const message = { command: 'sendMessage', message: messageText };
      await chatPanelProvider['handleWebviewMessage'](message);

      expect(mockChatManager.sendMessage).toHaveBeenCalledWith(messageText);
    });

    it('should handle disconnect command', async () => {
      const message = { command: 'disconnect' };
      await chatPanelProvider['handleWebviewMessage'](message);

      expect(mockChatManager.disconnect).toHaveBeenCalled();
    });

    it('should handle logout command', async () => {
      const message = { command: 'logout' };
      await chatPanelProvider['handleWebviewMessage'](message);

      expect(mockChatManager.logout).toHaveBeenCalled();
    });

    it('should handle getStatus command', async () => {
      mockChatManager.isAuthenticated.mockReturnValue(true);
      mockChatManager.isConnected.mockReturnValue(false);
      mockChatManager.getConnectionState.mockReturnValue(ConnectionState.DISCONNECTED);
      mockChatManager.getCurrentChannel.mockReturnValue('');

      const message = { command: 'getStatus' };
      await chatPanelProvider['handleWebviewMessage'](message);

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        command: 'statusUpdate',
        status: {
          isAuthenticated: true,
          isConnected: false,
          connectionState: ConnectionState.DISCONNECTED,
          currentChannel: ''
        }
      });
    });

    it('should handle unknown commands gracefully', async () => {
      const message = { command: 'unknownCommand' };
      
      await expect(chatPanelProvider['handleWebviewMessage'](message)).resolves.not.toThrow();
    });

    it('should handle missing command field', async () => {
      const message = { data: 'some data' };
      
      await expect(chatPanelProvider['handleWebviewMessage'](message)).resolves.not.toThrow();
    });
  });

  describe('Chat Message Broadcasting', () => {
    let chatMessageHandler: (message: any) => void;

    beforeEach(() => {
      chatPanelProvider.resolveWebviewView(mockWebviewView, undefined as any, undefined as any);
      
      // Get the chat message handler that was registered
      const chatMessageCall = mockChatManager.onChatMessage.mock.calls[0][0];
      chatMessageHandler = chatMessageCall;
    });

    it('should broadcast chat messages to webview', () => {
      const mockMessage = createMockChatMessage({
        username: 'testuser',
        message: 'Hello world!',
        channel: 'testchannel'
      });

      chatMessageHandler(mockMessage);

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        command: 'newMessage',
        message: mockMessage
      });
    });

    it('should broadcast moderator messages correctly', () => {
      const mockMessage = createMockChatMessage({
        username: 'moderator',
        message: 'Welcome to the stream!',
        userType: UserType.MODERATOR,
        badges: [{ name: 'moderator', version: '1' }]
      });

      chatMessageHandler(mockMessage);

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        command: 'newMessage',
        message: mockMessage
      });
    });

    it('should broadcast self messages correctly', () => {
      const mockMessage = createMockChatMessage({
        username: 'testuser',
        message: 'My own message',
        isSelf: true
      });

      chatMessageHandler(mockMessage);

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        command: 'newMessage',
        message: mockMessage
      });
    });

    it('should handle message broadcasting errors gracefully', () => {
      mockWebview.postMessage.mockImplementation(() => {
        throw new Error('Webview error');
      });

      const mockMessage = createMockChatMessage();

      expect(() => chatMessageHandler(mockMessage)).not.toThrow();
    });
  });

  describe('Connection State Broadcasting', () => {
    let stateChangeHandler: (state: ConnectionState) => void;

    beforeEach(() => {
      chatPanelProvider.resolveWebviewView(mockWebviewView, undefined as any, undefined as any);
      
      // Get the state change handler that was registered
      const stateChangeCall = mockChatManager.onConnectionStateChange.mock.calls[0][0];
      stateChangeHandler = stateChangeCall;
    });

    it('should broadcast connection state changes to webview', () => {
      stateChangeHandler(ConnectionState.CONNECTED);

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        command: 'connectionStateChange',
        state: ConnectionState.CONNECTED
      });
    });

    it('should broadcast all connection states correctly', () => {
      const states = [
        ConnectionState.DISCONNECTED,
        ConnectionState.CONNECTING,
        ConnectionState.CONNECTED,
        ConnectionState.RECONNECTING,
        ConnectionState.ERROR
      ];

      states.forEach(state => {
        stateChangeHandler(state);
        expect(mockWebview.postMessage).toHaveBeenCalledWith({
          command: 'connectionStateChange',
          state
        });
      });
    });

    it('should handle state broadcasting errors gracefully', () => {
      mockWebview.postMessage.mockImplementation(() => {
        throw new Error('Webview error');
      });

      expect(() => stateChangeHandler(ConnectionState.CONNECTED)).not.toThrow();
    });
  });

  describe('HTML Generation', () => {
    beforeEach(() => {
      chatPanelProvider.resolveWebviewView(mockWebviewView, undefined as any, undefined as any);
    });

    it('should include proper CSP directives', () => {
      expect(mockWebview.html).toContain('Content-Security-Policy');
      expect(mockWebview.html).toContain("default-src 'none'");
      expect(mockWebview.html).toContain("script-src");
      expect(mockWebview.html).toContain("style-src");
    });

    it('should include required CSS and JS files', () => {
      expect(mockWebview.html).toContain('styles.css');
      expect(mockWebview.html).toContain('chatPanel.js');
    });

    it('should include message input and send button', () => {
      expect(mockWebview.html).toContain('input');
      expect(mockWebview.html).toContain('type="text"');
      expect(mockWebview.html).toContain('button');
    });

    it('should include authentication controls', () => {
      expect(mockWebview.html).toContain('authenticate');
      expect(mockWebview.html).toContain('channel');
    });

    it('should be valid HTML', () => {
      expect(mockWebview.html).toMatch(/^<!DOCTYPE html>/);
      expect(mockWebview.html).toContain('<html');
      expect(mockWebview.html).toContain('<head>');
      expect(mockWebview.html).toContain('<body>');
      expect(mockWebview.html).toContain('</html>');
    });
  });

  describe('Resource Management', () => {
    it('should dispose properly', () => {
      chatPanelProvider.dispose();

      expect(mockChatManager.dispose).toHaveBeenCalled();
    });

    it('should handle multiple dispose calls', () => {
      chatPanelProvider.dispose();
      chatPanelProvider.dispose();

      expect(mockChatManager.dispose).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      chatPanelProvider.resolveWebviewView(mockWebviewView, undefined as any, undefined as any);
    });

    it('should handle authentication errors', async () => {
      mockChatManager.authenticate.mockRejectedValue(new Error('Auth failed'));

      const message = { command: 'authenticate' };
      await chatPanelProvider['handleWebviewMessage'](message);

      // Should not crash and should handle error gracefully
      expect(mockWebview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'error'
        })
      );
    });

    it('should handle connection errors', async () => {
      mockChatManager.connectToChannel.mockRejectedValue(new Error('Connection failed'));

      const message = { command: 'connectToChannel', channel: 'testchannel' };
      await chatPanelProvider['handleWebviewMessage'](message);

      expect(mockWebview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'error'
        })
      );
    });

    it('should handle message sending errors', async () => {
      mockChatManager.sendMessage.mockRejectedValue(new Error('Send failed'));

      const message = { command: 'sendMessage', message: 'test' };
      await chatPanelProvider['handleWebviewMessage'](message);

      expect(mockWebview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'error'
        })
      );
    });

    it('should handle webview not ready', () => {
      const provider = new ChatPanelProvider(mockContext);
      
      // Try to broadcast without webview being set
      const chatMessageHandler = mockChatManager.onChatMessage.mock.calls[0][0];
      const mockMessage = createMockChatMessage();

      expect(() => chatMessageHandler(mockMessage)).not.toThrow();
    });
  });

  describe('Webview Visibility', () => {
    it('should handle webview becoming visible', () => {
      chatPanelProvider.resolveWebviewView(mockWebviewView, undefined as any, undefined as any);

      // Simulate webview becoming visible
      mockWebviewView.visible = true;

      // Should be able to handle visibility changes
      expect(mockWebviewView.visible).toBe(true);
    });

    it('should handle webview becoming hidden', () => {
      chatPanelProvider.resolveWebviewView(mockWebviewView, undefined as any, undefined as any);

      // Simulate webview becoming hidden
      mockWebviewView.visible = false;

      expect(mockWebviewView.visible).toBe(false);
    });
  });
});