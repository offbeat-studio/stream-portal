/**
 * Integration Tests for Channel Switching
 * End-to-end testing of channel switching functionality
 */

import { TwitchChatManager } from '../../src/twitch/twitchChatManager';
import { ConnectionState } from '../../src/twitch/types/twitch';
import { testData } from '../fixtures/test-data';
import { MockWebSocket, mockWebSocketBehavior } from '../helpers/mocks/websocket.mock';
import * as vscode from 'vscode';

// Mock WebSocket
jest.mock('ws', () => ({
  __esModule: true,
  default: MockWebSocket
}));

describe('Channel Switching Integration', () => {
  let mockContext: vscode.ExtensionContext;
  let chatManager: TwitchChatManager;
  let mockWebSocket: MockWebSocket;

  beforeEach(() => {
    // Create mock context with valid token
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

  describe('Sequential Channel Switching', () => {
    beforeEach(async () => {
      // Setup authenticated state
      jest.spyOn(chatManager, 'authenticate').mockResolvedValue(true);
      jest.spyOn(chatManager, 'isAuthenticated').mockReturnValue(true);
      await chatManager.authenticate();
    });

    it('should switch from one channel to another efficiently', async () => {
      const firstChannel = 'channel1';
      const secondChannel = 'channel2';

      // Connect to first channel
      const connect1Promise = chatManager.connectToChannel(firstChannel);
      setTimeout(() => {
        mockWebSocketBehavior.authenticationSuccess(mockWebSocket, 'testuser');
      }, 50);
      await connect1Promise;

      expect(chatManager.getCurrentChannel()).toBe(firstChannel);
      expect(chatManager.isConnected()).toBe(true);

      // Clear message history for cleaner testing
      mockWebSocket.clearMessageHistory();

      // Switch to second channel
      const connect2Promise = chatManager.connectToChannel(secondChannel);
      setTimeout(() => {
        mockWebSocketBehavior.channelJoinSuccess(mockWebSocket, `#${secondChannel}`, 'testuser');
      }, 50);
      await connect2Promise;

      expect(chatManager.getCurrentChannel()).toBe(secondChannel);
      expect(chatManager.isConnected()).toBe(true);

      // Verify IRC commands for channel switching
      const sentMessages = mockWebSocket.getSentMessages();
      expect(sentMessages.some(msg => msg.includes(`PART #${firstChannel}`))).toBe(true);
      expect(sentMessages.some(msg => msg.includes(`JOIN #${secondChannel}`))).toBe(true);
    });

    it('should handle switching to same channel gracefully', async () => {
      const channel = 'samechannel';

      // Connect to channel
      const connect1Promise = chatManager.connectToChannel(channel);
      setTimeout(() => {
        mockWebSocketBehavior.authenticationSuccess(mockWebSocket, 'testuser');
      }, 50);
      await connect1Promise;

      expect(chatManager.getCurrentChannel()).toBe(channel);

      // Clear message history
      mockWebSocket.clearMessageHistory();

      // "Switch" to same channel
      const connect2Result = await chatManager.connectToChannel(channel);

      expect(connect2Result).toBe(true);
      expect(chatManager.getCurrentChannel()).toBe(channel);
      expect(chatManager.isConnected()).toBe(true);

      // Should not send PART/JOIN commands for same channel
      const sentMessages = mockWebSocket.getSentMessages();
      expect(sentMessages.some(msg => msg.includes('PART'))).toBe(false);
      expect(sentMessages.some(msg => msg.includes('JOIN'))).toBe(false);
    });

    it('should handle rapid channel switching', async () => {
      const channels = ['rapid1', 'rapid2', 'rapid3'];

      // Connect to first channel
      const connect1Promise = chatManager.connectToChannel(channels[0]);
      setTimeout(() => {
        mockWebSocketBehavior.authenticationSuccess(mockWebSocket, 'testuser');
      }, 50);
      await connect1Promise;

      // Rapidly switch channels
      for (let i = 1; i < channels.length; i++) {
        mockWebSocket.clearMessageHistory();
        
        const connectPromise = chatManager.connectToChannel(channels[i]);
        setTimeout(() => {
          mockWebSocketBehavior.channelJoinSuccess(mockWebSocket, `#${channels[i]}`, 'testuser');
        }, 30);
        await connectPromise;

        expect(chatManager.getCurrentChannel()).toBe(channels[i]);

        // Verify channel switching commands
        const sentMessages = mockWebSocket.getSentMessages();
        expect(sentMessages.some(msg => msg.includes(`PART #${channels[i-1]}`))).toBe(true);
        expect(sentMessages.some(msg => msg.includes(`JOIN #${channels[i]}`))).toBe(true);
      }

      expect(chatManager.getCurrentChannel()).toBe(channels[channels.length - 1]);
      expect(chatManager.isConnected()).toBe(true);
    });
  });

  describe('Channel Switching with Message Isolation', () => {
    let receivedMessages: any[] = [];

    beforeEach(async () => {
      receivedMessages = [];

      // Setup authenticated state
      jest.spyOn(chatManager, 'authenticate').mockResolvedValue(true);
      jest.spyOn(chatManager, 'isAuthenticated').mockReturnValue(true);
      await chatManager.authenticate();

      // Setup message handler
      chatManager.onChatMessage((message) => {
        receivedMessages.push(message);
      });
    });

    it('should receive messages only from current channel', async () => {
      const channel1 = 'isolated1';
      const channel2 = 'isolated2';

      // Connect to first channel
      const connect1Promise = chatManager.connectToChannel(channel1);
      setTimeout(() => {
        mockWebSocketBehavior.authenticationSuccess(mockWebSocket, 'testuser');
      }, 50);
      await connect1Promise;

      // Receive message in first channel
      mockWebSocketBehavior.receiveChatMessage(mockWebSocket, `#${channel1}`, 'user1', 'Message in channel 1');
      await global.testUtils.sleep(100);

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].channel).toBe(channel1);
      expect(receivedMessages[0].message).toBe('Message in channel 1');

      // Switch to second channel
      receivedMessages = []; // Clear previous messages
      mockWebSocket.clearMessageHistory();

      const connect2Promise = chatManager.connectToChannel(channel2);
      setTimeout(() => {
        mockWebSocketBehavior.channelJoinSuccess(mockWebSocket, `#${channel2}`, 'testuser');
      }, 50);
      await connect2Promise;

      // Receive message in second channel
      mockWebSocketBehavior.receiveChatMessage(mockWebSocket, `#${channel2}`, 'user2', 'Message in channel 2');
      await global.testUtils.sleep(100);

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].channel).toBe(channel2);
      expect(receivedMessages[0].message).toBe('Message in channel 2');
    });

    it('should handle sending messages to correct channel after switching', async () => {
      const channel1 = 'sendtest1';
      const channel2 = 'sendtest2';

      // Connect to first channel
      const connect1Promise = chatManager.connectToChannel(channel1);
      setTimeout(() => {
        mockWebSocketBehavior.authenticationSuccess(mockWebSocket, 'testuser');
      }, 50);
      await connect1Promise;

      // Send message in first channel
      await chatManager.sendMessage('Hello from channel 1');

      let sentMessages = mockWebSocket.getSentMessages();
      expect(sentMessages.some(msg => 
        msg.includes(`PRIVMSG #${channel1} :Hello from channel 1`)
      )).toBe(true);

      // Switch to second channel
      mockWebSocket.clearMessageHistory();
      const connect2Promise = chatManager.connectToChannel(channel2);
      setTimeout(() => {
        mockWebSocketBehavior.channelJoinSuccess(mockWebSocket, `#${channel2}`, 'testuser');
      }, 50);
      await connect2Promise;

      // Send message in second channel
      await chatManager.sendMessage('Hello from channel 2');

      sentMessages = mockWebSocket.getSentMessages();
      expect(sentMessages.some(msg => 
        msg.includes(`PRIVMSG #${channel2} :Hello from channel 2`)
      )).toBe(true);
    });
  });

  describe('Channel Switching Error Scenarios', () => {
    beforeEach(async () => {
      // Setup authenticated state
      jest.spyOn(chatManager, 'authenticate').mockResolvedValue(true);
      jest.spyOn(chatManager, 'isAuthenticated').mockReturnValue(true);
      await chatManager.authenticate();
    });

    it('should handle channel join failure during switching', async () => {
      const validChannel = 'validchannel';
      const invalidChannel = 'invalidchannel';

      // Connect to valid channel first
      const connect1Promise = chatManager.connectToChannel(validChannel);
      setTimeout(() => {
        mockWebSocketBehavior.authenticationSuccess(mockWebSocket, 'testuser');
      }, 50);
      await connect1Promise;

      expect(chatManager.getCurrentChannel()).toBe(validChannel);

      // Attempt to switch to invalid channel (simulate join failure)
      const connect2Promise = chatManager.connectToChannel(invalidChannel);
      setTimeout(() => {
        // Simulate join failure - no join success message
        mockWebSocket.simulateMessage(':tmi.twitch.tv NOTICE * :Error joining channel');
      }, 50);

      const connect2Result = await connect2Promise;

      // Should fail to switch
      expect(connect2Result).toBe(false);
      // Should still be in original channel or disconnected
      expect(chatManager.getCurrentChannel()).toBe(validChannel);
    });

    it('should handle network errors during channel switching', async () => {
      const channel1 = 'networkerror1';
      const channel2 = 'networkerror2';

      // Connect to first channel
      const connect1Promise = chatManager.connectToChannel(channel1);
      setTimeout(() => {
        mockWebSocketBehavior.authenticationSuccess(mockWebSocket, 'testuser');
      }, 50);
      await connect1Promise;

      expect(chatManager.getCurrentChannel()).toBe(channel1);

      // Simulate network error during channel switch
      const connect2Promise = chatManager.connectToChannel(channel2);
      setTimeout(() => {
        mockWebSocket.simulateError(new Error('Network error during switch'));
      }, 50);

      const connect2Result = await connect2Promise;

      expect(connect2Result).toBe(false);
      // Connection should be in error state
      expect(chatManager.getConnectionState()).toBe(ConnectionState.ERROR);
    });
  });

  describe('Channel Switching State Management', () => {
    let stateChanges: ConnectionState[] = [];

    beforeEach(async () => {
      stateChanges = [];

      // Setup authenticated state
      jest.spyOn(chatManager, 'authenticate').mockResolvedValue(true);
      jest.spyOn(chatManager, 'isAuthenticated').mockReturnValue(true);
      await chatManager.authenticate();

      // Track state changes
      chatManager.onConnectionStateChange((state) => {
        stateChanges.push(state);
      });
    });

    it('should maintain stable connection state during channel switching', async () => {
      const channel1 = 'statetest1';
      const channel2 = 'statetest2';

      // Connect to first channel
      const connect1Promise = chatManager.connectToChannel(channel1);
      setTimeout(() => {
        mockWebSocketBehavior.authenticationSuccess(mockWebSocket, 'testuser');
      }, 50);
      await connect1Promise;

      // Clear state changes from initial connection
      stateChanges = [];

      // Switch to second channel
      const connect2Promise = chatManager.connectToChannel(channel2);
      setTimeout(() => {
        mockWebSocketBehavior.channelJoinSuccess(mockWebSocket, `#${channel2}`, 'testuser');
      }, 50);
      await connect2Promise;

      // Should remain connected throughout the switch
      expect(chatManager.getConnectionState()).toBe(ConnectionState.CONNECTED);
      
      // Should not have disconnected during switch
      expect(stateChanges).not.toContain(ConnectionState.DISCONNECTED);
      expect(stateChanges).not.toContain(ConnectionState.CONNECTING);
    });

    it('should track current channel correctly during switches', async () => {
      const channels = ['track1', 'track2', 'track3'];

      // Connect to first channel
      const connect1Promise = chatManager.connectToChannel(channels[0]);
      setTimeout(() => {
        mockWebSocketBehavior.authenticationSuccess(mockWebSocket, 'testuser');
      }, 50);
      await connect1Promise;

      expect(chatManager.getCurrentChannel()).toBe(channels[0]);

      // Switch through multiple channels
      for (let i = 1; i < channels.length; i++) {
        const connectPromise = chatManager.connectToChannel(channels[i]);
        setTimeout(() => {
          mockWebSocketBehavior.channelJoinSuccess(mockWebSocket, `#${channels[i]}`, 'testuser');
        }, 50);
        await connectPromise;

        expect(chatManager.getCurrentChannel()).toBe(channels[i]);
      }
    });
  });

  describe('Channel Switching Performance', () => {
    beforeEach(async () => {
      // Setup authenticated state
      jest.spyOn(chatManager, 'authenticate').mockResolvedValue(true);
      jest.spyOn(chatManager, 'isAuthenticated').mockReturnValue(true);
      await chatManager.authenticate();
    });

    it('should handle multiple rapid switches efficiently', async () => {
      const channels = Array.from({ length: 10 }, (_, i) => `perf${i}`);
      
      // Connect to first channel
      const connect1Promise = chatManager.connectToChannel(channels[0]);
      setTimeout(() => {
        mockWebSocketBehavior.authenticationSuccess(mockWebSocket, 'testuser');
      }, 50);
      await connect1Promise;

      const startTime = Date.now();

      // Rapidly switch through all channels
      for (let i = 1; i < channels.length; i++) {
        const connectPromise = chatManager.connectToChannel(channels[i]);
        setTimeout(() => {
          mockWebSocketBehavior.channelJoinSuccess(mockWebSocket, `#${channels[i]}`, 'testuser');
        }, 10); // Very fast response
        await connectPromise;
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete all switches reasonably quickly (less than 2 seconds)
      expect(totalTime).toBeLessThan(2000);
      expect(chatManager.getCurrentChannel()).toBe(channels[channels.length - 1]);
      expect(chatManager.isConnected()).toBe(true);
    });
  });
});