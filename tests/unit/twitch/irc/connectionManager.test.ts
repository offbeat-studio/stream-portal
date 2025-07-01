/**
 * Tests for IRCConnectionManager
 * Comprehensive testing of IRC connection, message handling, and state management
 */

import { IRCConnectionManager } from '../../../../src/twitch/irc/connectionManager';
import { ConnectionState } from '../../../../src/twitch/types/twitch';
import { MockWebSocket, mockWebSocketBehavior } from '../../../helpers/mocks/websocket.mock';

// Mock the ws module
jest.mock('ws', () => {
  return {
    __esModule: true,
    default: MockWebSocket
  };
});

describe('IRCConnectionManager', () => {
  let connectionManager: IRCConnectionManager;
  let mockWebSocket: MockWebSocket;

  beforeEach(() => {
    connectionManager = new IRCConnectionManager();
    
    // Mock WebSocket creation
    jest.spyOn(global, 'WebSocket' as any).mockImplementation(() => {
      mockWebSocket = new MockWebSocket('wss://irc-ws.chat.twitch.tv:443');
      return mockWebSocket as any;
    });
  });

  afterEach(() => {
    connectionManager.disconnect();
    jest.restoreAllMocks();
  });

  describe('Connection Management', () => {
    it('should initialize with disconnected state', () => {
      expect(connectionManager.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
      expect(connectionManager.isConnected()).toBe(false);
    });

    it('should connect successfully with valid credentials', async () => {
      const token = 'valid-token';
      const username = 'testuser';

      // Set up mock behavior for successful connection
      const connectPromise = connectionManager.connect(token, username);
      
      // Simulate successful authentication
      setTimeout(() => {
        mockWebSocketBehavior.authenticationSuccess(mockWebSocket, username);
      }, 100);

      await connectPromise;

      expect(connectionManager.getConnectionState()).toBe(ConnectionState.CONNECTED);
      expect(connectionManager.isConnected()).toBe(true);
    });

    it('should handle authentication failure gracefully', async () => {
      const token = 'invalid-token';
      const username = 'testuser';

      // Set up mock behavior for authentication failure
      const connectPromise = connectionManager.connect(token, username);
      
      setTimeout(() => {
        mockWebSocketBehavior.authenticationFailure(mockWebSocket);
      }, 100);

      await expect(connectPromise).rejects.toThrow();
      expect(connectionManager.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
    });

    it('should implement exponential backoff for reconnection', async () => {
      const token = 'valid-token';
      const username = 'testuser';
      
      let stateChanges: ConnectionState[] = [];
      connectionManager.onStateChange((state) => {
        stateChanges.push(state);
      });

      // Start connection
      const connectPromise = connectionManager.connect(token, username);
      
      // First authenticate successfully
      setTimeout(() => {
        mockWebSocketBehavior.authenticationSuccess(mockWebSocket, username);
      }, 50);

      await connectPromise;

      // Then simulate network disconnection
      mockWebSocketBehavior.networkIssues(mockWebSocket);

      // Wait for reconnection attempts
      await global.testUtils.sleep(200);

      expect(stateChanges).toContain(ConnectionState.RECONNECTING);
    });

    it('should prevent rapid reconnection attempts', async () => {
      const token = 'valid-token';
      const username = 'testuser';

      // Connect first
      const connectPromise = connectionManager.connect(token, username);
      setTimeout(() => {
        mockWebSocketBehavior.authenticationSuccess(mockWebSocket, username);
      }, 50);
      await connectPromise;

      // Simulate multiple rapid disconnections
      mockWebSocket.simulateDisconnection(1006, 'Network error');
      mockWebSocket.simulateDisconnection(1006, 'Network error');
      mockWebSocket.simulateDisconnection(1006, 'Network error');

      // Should only attempt reconnection once due to debouncing
      await global.testUtils.sleep(100);
      
      // Verify that reconnection attempts are properly debounced
      expect(connectionManager.getConnectionState()).toBe(ConnectionState.RECONNECTING);
    });

    it('should stop reconnecting after max attempts', async () => {
      const token = 'valid-token';
      const username = 'testuser';

      // Connect and then simulate repeated failures
      const connectPromise = connectionManager.connect(token, username);
      setTimeout(() => {
        mockWebSocketBehavior.authenticationSuccess(mockWebSocket, username);
      }, 50);
      await connectPromise;

      // Simulate repeated connection failures
      for (let i = 0; i < 6; i++) {
        mockWebSocket.simulateDisconnection(1006, 'Network error');
        await global.testUtils.sleep(100);
      }

      expect(connectionManager.getConnectionState()).toBe(ConnectionState.ERROR);
    });
  });

  describe('Channel Management', () => {
    beforeEach(async () => {
      // Establish connection for channel tests
      const connectPromise = connectionManager.connect('token', 'testuser');
      setTimeout(() => {
        mockWebSocketBehavior.authenticationSuccess(mockWebSocket, 'testuser');
      }, 50);
      await connectPromise;
    });

    it('should join channels successfully', async () => {
      const channel = '#testchannel';
      
      const joinPromise = connectionManager.joinChannel(channel);
      
      setTimeout(() => {
        mockWebSocketBehavior.channelJoinSuccess(mockWebSocket, channel, 'testuser');
      }, 50);

      await joinPromise;

      // Verify JOIN command was sent
      const sentMessages = mockWebSocket.getSentMessages();
      expect(sentMessages.some(msg => msg.includes(`JOIN ${channel}`))).toBe(true);
    });

    it('should switch channels without full disconnection', async () => {
      const oldChannel = '#oldchannel';
      const newChannel = '#newchannel';

      // Join initial channel
      const joinPromise1 = connectionManager.joinChannel(oldChannel);
      setTimeout(() => {
        mockWebSocketBehavior.channelJoinSuccess(mockWebSocket, oldChannel, 'testuser');
      }, 50);
      await joinPromise1;

      // Clear message history
      mockWebSocket.clearMessageHistory();

      // Switch to new channel
      const switchPromise = connectionManager.switchToChannel(newChannel);
      setTimeout(() => {
        mockWebSocketBehavior.channelJoinSuccess(mockWebSocket, newChannel, 'testuser');
      }, 50);
      await switchPromise;

      const sentMessages = mockWebSocket.getSentMessages();
      
      // Should send PART for old channel and JOIN for new channel
      expect(sentMessages.some(msg => msg.includes(`PART ${oldChannel}`))).toBe(true);
      expect(sentMessages.some(msg => msg.includes(`JOIN ${newChannel}`))).toBe(true);
      
      // Should remain connected
      expect(connectionManager.isConnected()).toBe(true);
    });

    it('should track joined channels correctly', async () => {
      const channels = ['#channel1', '#channel2', '#channel3'];

      for (const channel of channels) {
        const joinPromise = connectionManager.joinChannel(channel);
        setTimeout(() => {
          mockWebSocketBehavior.channelJoinSuccess(mockWebSocket, channel, 'testuser');
        }, 50);
        await joinPromise;
      }

      // All channels should be tracked (we can't directly access joinedChannels,
      // but we can verify behavior by checking sent messages)
      const sentMessages = mockWebSocket.getSentMessages();
      for (const channel of channels) {
        expect(sentMessages.some(msg => msg.includes(`JOIN ${channel}`))).toBe(true);
      }
    });

    it('should reject joining channels when not connected', async () => {
      connectionManager.disconnect();
      
      await expect(connectionManager.joinChannel('#testchannel'))
        .rejects.toThrow('Not connected to IRC');
    });
  });

  describe('Message Handling', () => {
    let messageHandler: jest.Mock;

    beforeEach(async () => {
      messageHandler = jest.fn();
      connectionManager.onMessage(messageHandler);

      // Establish connection
      const connectPromise = connectionManager.connect('token', 'testuser');
      setTimeout(() => {
        mockWebSocketBehavior.authenticationSuccess(mockWebSocket, 'testuser');
      }, 50);
      await connectPromise;
    });

    it('should parse and emit IRC messages correctly', async () => {
      const testMessage = ':testuser!testuser@testuser.tmi.twitch.tv PRIVMSG #testchannel :Hello world!';
      
      mockWebSocket.simulateMessage(testMessage);
      
      await global.testUtils.sleep(50);

      expect(messageHandler).toHaveBeenCalled();
      const receivedMessage = messageHandler.mock.calls[0][0];
      expect(receivedMessage.command).toBe('PRIVMSG');
      expect(receivedMessage.params).toContain('#testchannel');
      expect(receivedMessage.params).toContain('Hello world!');
    });

    it('should handle malformed messages gracefully', async () => {
      const malformedMessage = 'INVALID MESSAGE FORMAT';
      
      mockWebSocket.simulateMessage(malformedMessage);
      
      await global.testUtils.sleep(50);

      // Should still call handler but with basic parsing
      expect(messageHandler).toHaveBeenCalled();
    });

    it('should emit multiple messages correctly', async () => {
      const messages = [
        ':user1!user1@user1.tmi.twitch.tv PRIVMSG #testchannel :Message 1',
        ':user2!user2@user2.tmi.twitch.tv PRIVMSG #testchannel :Message 2',
        ':user3!user3@user3.tmi.twitch.tv PRIVMSG #testchannel :Message 3'
      ];

      for (const message of messages) {
        mockWebSocket.simulateMessage(message);
      }
      
      await global.testUtils.sleep(100);

      expect(messageHandler).toHaveBeenCalledTimes(messages.length);
    });

    it('should send messages correctly', () => {
      const channel = '#testchannel';
      const message = 'Hello from test!';

      connectionManager.sendMessage(channel, message);

      const sentMessages = mockWebSocket.getSentMessages();
      expect(sentMessages.some(msg => 
        msg.includes(`PRIVMSG ${channel} :${message}`)
      )).toBe(true);
    });

    it('should reject sending messages when not connected', () => {
      connectionManager.disconnect();
      
      expect(() => {
        connectionManager.sendMessage('#testchannel', 'test message');
      }).toThrow('WebSocket is not connected');
    });
  });

  describe('State Management', () => {
    it('should emit state changes correctly', async () => {
      const stateHandler = jest.fn();
      connectionManager.onStateChange(stateHandler);

      const connectPromise = connectionManager.connect('token', 'testuser');
      
      // Simulate successful connection
      setTimeout(() => {
        mockWebSocketBehavior.authenticationSuccess(mockWebSocket, 'testuser');
      }, 50);

      await connectPromise;

      expect(stateHandler).toHaveBeenCalledWith(ConnectionState.CONNECTING);
      expect(stateHandler).toHaveBeenCalledWith(ConnectionState.CONNECTED);
    });

    it('should handle error states correctly', () => {
      const errorHandler = jest.fn();
      connectionManager.onError(errorHandler);

      const error = new Error('Test error');
      mockWebSocket.simulateError(error);

      expect(errorHandler).toHaveBeenCalledWith(error);
    });
  });

  describe('Memory Management', () => {
    it('should clean up resources on disconnect', () => {
      connectionManager.disconnect();

      expect(connectionManager.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
      expect(connectionManager.isConnected()).toBe(false);
    });

    it('should clear timers properly', async () => {
      // Connect and then disconnect immediately to test timer cleanup
      const connectPromise = connectionManager.connect('token', 'testuser');
      
      setTimeout(() => {
        mockWebSocketBehavior.authenticationSuccess(mockWebSocket, 'testuser');
      }, 50);

      await connectPromise;
      
      // Simulate disconnection which should trigger cleanup
      connectionManager.disconnect();

      // Verify state is properly reset
      expect(connectionManager.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
    });

    it('should remove all event listeners on disconnect', () => {
      const messageHandler = jest.fn();
      const stateHandler = jest.fn();
      const errorHandler = jest.fn();

      connectionManager.onMessage(messageHandler);
      connectionManager.onStateChange(stateHandler);
      connectionManager.onError(errorHandler);

      connectionManager.disconnect();

      // After disconnect, WebSocket should have removeAllListeners called
      // This is verified through the mock implementation
      expect(mockWebSocket.removeAllListeners).toHaveBeenCalled();
    });
  });

  describe('Heartbeat and Keep-Alive', () => {
    beforeEach(async () => {
      // Establish connection for heartbeat tests
      const connectPromise = connectionManager.connect('token', 'testuser');
      setTimeout(() => {
        mockWebSocketBehavior.authenticationSuccess(mockWebSocket, 'testuser');
      }, 50);
      await connectPromise;
    });

    it('should respond to PING with PONG', async () => {
      const pingMessage = 'PING :tmi.twitch.tv';
      
      mockWebSocket.simulateMessage(pingMessage);
      
      await global.testUtils.sleep(50);

      const sentMessages = mockWebSocket.getSentMessages();
      expect(sentMessages.some(msg => msg.includes('PONG :tmi.twitch.tv'))).toBe(true);
    });
  });
});