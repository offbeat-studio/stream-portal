/**
 * Integration Tests for Chat Flow
 * End-to-end testing of chat connection and message handling
 */

import { TwitchChatManager } from '../../src/twitch/twitchChatManager';
import { IRCConnectionManager } from '../../src/twitch/irc/connectionManager';
import { IRCProtocolHandler } from '../../src/twitch/irc/ircProtocol';
import { ConnectionState, UserType } from '../../src/twitch/types/twitch';
import { testData, createMockChatMessage } from '../fixtures/test-data';
import { MockWebSocket, mockWebSocketBehavior } from '../helpers/mocks/websocket.mock';
import * as vscode from 'vscode';

// Mock WebSocket
jest.mock('ws', () => ({
  __esModule: true,
  default: MockWebSocket
}));

describe('Chat Flow Integration', () => {
  let mockContext: vscode.ExtensionContext;
  let chatManager: TwitchChatManager;
  let mockWebSocket: MockWebSocket;

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
        get: jest.fn((key: string) => {
          if (key === 'twitchToken') {
            return testData.authResponses.success;
          }
          return undefined;
        }),
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

    // Mock WebSocket creation
    jest.spyOn(global, 'WebSocket' as any).mockImplementation(() => {
      mockWebSocket = new MockWebSocket('wss://irc-ws.chat.twitch.tv:443');
      return mockWebSocket as any;
    });

    chatManager = new TwitchChatManager(mockContext);
  });

  afterEach(() => {
    chatManager.dispose();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('Complete Chat Connection Flow', () => {
    it('should authenticate and connect to channel successfully', async () => {
      // Mock authentication
      jest.spyOn(chatManager, 'authenticate').mockResolvedValue(true);
      jest.spyOn(chatManager, 'isAuthenticated').mockReturnValue(true);

      // Authenticate first
      const authResult = await chatManager.authenticate();
      expect(authResult).toBe(true);

      // Connect to channel
      const connectPromise = chatManager.connectToChannel('testchannel');

      // Simulate successful IRC connection
      setTimeout(() => {
        mockWebSocketBehavior.authenticationSuccess(mockWebSocket, 'testuser');
      }, 100);

      const connectResult = await connectPromise;
      expect(connectResult).toBe(true);
      expect(chatManager.isConnected()).toBe(true);
      expect(chatManager.getCurrentChannel()).toBe('testchannel');
    });

    it('should handle connection failure gracefully', async () => {
      // Mock authentication
      jest.spyOn(chatManager, 'authenticate').mockResolvedValue(true);
      jest.spyOn(chatManager, 'isAuthenticated').mockReturnValue(true);

      // Authenticate first
      await chatManager.authenticate();

      // Connect to channel
      const connectPromise = chatManager.connectToChannel('testchannel');

      // Simulate authentication failure
      setTimeout(() => {
        mockWebSocketBehavior.authenticationFailure(mockWebSocket);
      }, 100);

      const connectResult = await connectPromise;
      expect(connectResult).toBe(false);
      expect(chatManager.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
    });

    it('should switch channels without full disconnection', async () => {
      // Setup authenticated and connected state
      jest.spyOn(chatManager, 'authenticate').mockResolvedValue(true);
      jest.spyOn(chatManager, 'isAuthenticated').mockReturnValue(true);

      await chatManager.authenticate();

      // Connect to first channel
      const connect1Promise = chatManager.connectToChannel('channel1');
      setTimeout(() => {
        mockWebSocketBehavior.authenticationSuccess(mockWebSocket, 'testuser');
      }, 50);
      await connect1Promise;

      expect(chatManager.getCurrentChannel()).toBe('channel1');

      // Switch to second channel
      mockWebSocket.clearMessageHistory();
      const connect2Promise = chatManager.connectToChannel('channel2');
      setTimeout(() => {
        mockWebSocketBehavior.channelJoinSuccess(mockWebSocket, '#channel2', 'testuser');
      }, 50);
      await connect2Promise;

      expect(chatManager.getCurrentChannel()).toBe('channel2');
      expect(chatManager.isConnected()).toBe(true);

      // Verify channel switching commands
      const sentMessages = mockWebSocket.getSentMessages();
      expect(sentMessages.some(msg => msg.includes('PART #channel1'))).toBe(true);
      expect(sentMessages.some(msg => msg.includes('JOIN #channel2'))).toBe(true);
    });
  });

  describe('Message Handling Integration', () => {
    let receivedMessages: any[] = [];

    beforeEach(async () => {
      receivedMessages = [];

      // Setup authenticated and connected state
      jest.spyOn(chatManager, 'authenticate').mockResolvedValue(true);
      jest.spyOn(chatManager, 'isAuthenticated').mockReturnValue(true);

      await chatManager.authenticate();

      const connectPromise = chatManager.connectToChannel('testchannel');
      setTimeout(() => {
        mockWebSocketBehavior.authenticationSuccess(mockWebSocket, 'testuser');
      }, 50);
      await connectPromise;

      // Setup message handler
      chatManager.onChatMessage((message) => {
        receivedMessages.push(message);
      });
    });

    it('should receive and parse incoming chat messages', async () => {
      const username = 'someuser';
      const messageText = 'Hello from integration test!';
      const channel = '#testchannel';

      // Simulate incoming message
      mockWebSocketBehavior.receiveChatMessage(mockWebSocket, channel, username, messageText);

      // Wait for message processing
      await global.testUtils.sleep(100);

      expect(receivedMessages).toHaveLength(1);
      const receivedMessage = receivedMessages[0];
      expect(receivedMessage.username).toBe(username);
      expect(receivedMessage.message).toBe(messageText);
      expect(receivedMessage.channel).toBe('testchannel');
      expect(receivedMessage.isSelf).toBe(false);
    });

    it('should handle sending messages correctly', async () => {
      const messageText = 'Test message from integration';

      const sendResult = await chatManager.sendMessage(messageText);

      expect(sendResult).toBe(true);

      // Verify message was sent via IRC
      const sentMessages = mockWebSocket.getSentMessages();
      expect(sentMessages.some(msg => 
        msg.includes(`PRIVMSG #testchannel :${messageText}`)
      )).toBe(true);

      // Should also create a self-message
      await global.testUtils.sleep(50);
      const selfMessage = receivedMessages.find(msg => msg.isSelf);
      expect(selfMessage).toBeDefined();
      expect(selfMessage.message).toBe(messageText);
      expect(selfMessage.username).toBe('testuser');
    });

    it('should handle message with emotes correctly', async () => {
      const messageWithEmotes = 'Kappa great stream kreygasm';
      const channel = '#testchannel';
      const username = 'emoteuser';

      // Simulate message with emote tags
      const ircMessageWithEmotes = `@emotes=25:0-4/354:18-26 :${username}!${username}@${username}.tmi.twitch.tv PRIVMSG ${channel} :${messageWithEmotes}`;
      
      mockWebSocket.simulateMessage(ircMessageWithEmotes);

      await global.testUtils.sleep(100);

      expect(receivedMessages).toHaveLength(1);
      const receivedMessage = receivedMessages[0];
      expect(receivedMessage.emotes).toHaveLength(2);
      expect(receivedMessage.emotes[0].id).toBe('25');
      expect(receivedMessage.emotes[1].id).toBe('354');
    });

    it('should handle moderator messages correctly', async () => {
      const messageText = 'Welcome to the stream everyone!';
      const channel = '#testchannel';
      const username = 'moderator';

      // Simulate moderator message
      const ircModMessage = `@badges=moderator/1;mod=1;display-name=Moderator :${username}!${username}@${username}.tmi.twitch.tv PRIVMSG ${channel} :${messageText}`;
      
      mockWebSocket.simulateMessage(ircModMessage);

      await global.testUtils.sleep(100);

      expect(receivedMessages).toHaveLength(1);
      const receivedMessage = receivedMessages[0];
      expect(receivedMessage.userType).toBe(UserType.MODERATOR);
      expect(receivedMessage.badges).toHaveLength(1);
      expect(receivedMessage.badges[0].name).toBe('moderator');
    });
  });

  describe('Connection State Management', () => {
    let stateChanges: ConnectionState[] = [];

    beforeEach(() => {
      stateChanges = [];
      chatManager.onConnectionStateChange((state) => {
        stateChanges.push(state);
      });
    });

    it('should track connection state changes correctly', async () => {
      // Mock authentication
      jest.spyOn(chatManager, 'authenticate').mockResolvedValue(true);
      jest.spyOn(chatManager, 'isAuthenticated').mockReturnValue(true);

      await chatManager.authenticate();

      // Start connection
      const connectPromise = chatManager.connectToChannel('testchannel');

      // Simulate successful connection
      setTimeout(() => {
        mockWebSocketBehavior.authenticationSuccess(mockWebSocket, 'testuser');
      }, 100);

      await connectPromise;

      // Should have seen state transitions
      expect(stateChanges).toContain(ConnectionState.CONNECTING);
      expect(stateChanges).toContain(ConnectionState.CONNECTED);
    });

    it('should handle reconnection attempts', async () => {
      // Setup connected state
      jest.spyOn(chatManager, 'authenticate').mockResolvedValue(true);
      jest.spyOn(chatManager, 'isAuthenticated').mockReturnValue(true);

      await chatManager.authenticate();

      const connectPromise = chatManager.connectToChannel('testchannel');
      setTimeout(() => {
        mockWebSocketBehavior.authenticationSuccess(mockWebSocket, 'testuser');
      }, 50);
      await connectPromise;

      // Clear state changes from initial connection
      stateChanges = [];

      // Simulate network disconnection
      mockWebSocketBehavior.networkIssues(mockWebSocket);

      // Wait for reconnection attempt
      await global.testUtils.sleep(200);

      expect(stateChanges).toContain(ConnectionState.RECONNECTING);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle authentication errors during connection', async () => {
      // Mock failed authentication
      jest.spyOn(chatManager, 'authenticate').mockResolvedValue(false);

      const connectResult = await chatManager.connectToChannel('testchannel');

      expect(connectResult).toBe(false);
      expect(chatManager.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
    });

    it('should handle network errors gracefully', async () => {
      // Setup authenticated state
      jest.spyOn(chatManager, 'authenticate').mockResolvedValue(true);
      jest.spyOn(chatManager, 'isAuthenticated').mockReturnValue(true);

      await chatManager.authenticate();

      // Start connection and simulate network error
      const connectPromise = chatManager.connectToChannel('testchannel');
      
      setTimeout(() => {
        mockWebSocket.simulateError(new Error('Network error'));
      }, 50);

      const connectResult = await connectPromise;
      expect(connectResult).toBe(false);
    });

    it('should handle malformed IRC messages', async () => {
      // Setup connected state
      jest.spyOn(chatManager, 'authenticate').mockResolvedValue(true);
      jest.spyOn(chatManager, 'isAuthenticated').mockReturnValue(true);

      await chatManager.authenticate();

      const connectPromise = chatManager.connectToChannel('testchannel');
      setTimeout(() => {
        mockWebSocketBehavior.authenticationSuccess(mockWebSocket, 'testuser');
      }, 50);
      await connectPromise;

      let receivedMessages: any[] = [];
      chatManager.onChatMessage((message) => {
        receivedMessages.push(message);
      });

      // Send malformed message
      mockWebSocket.simulateMessage('INVALID MESSAGE FORMAT');

      await global.testUtils.sleep(100);

      // Should not crash, and should not create chat messages
      expect(receivedMessages).toHaveLength(0);
    });
  });

  describe('Memory Management Integration', () => {
    it('should cleanup resources on disconnect', async () => {
      // Setup connected state
      jest.spyOn(chatManager, 'authenticate').mockResolvedValue(true);
      jest.spyOn(chatManager, 'isAuthenticated').mockReturnValue(true);

      await chatManager.authenticate();

      const connectPromise = chatManager.connectToChannel('testchannel');
      setTimeout(() => {
        mockWebSocketBehavior.authenticationSuccess(mockWebSocket, 'testuser');
      }, 50);
      await connectPromise;

      expect(chatManager.isConnected()).toBe(true);

      // Disconnect
      await chatManager.disconnect();

      expect(chatManager.isConnected()).toBe(false);
      expect(chatManager.getCurrentChannel()).toBe('');
      expect(chatManager.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
    });

    it('should handle dispose correctly', () => {
      chatManager.dispose();

      // Should not throw errors when disposing
      expect(() => chatManager.dispose()).not.toThrow();
    });
  });
});