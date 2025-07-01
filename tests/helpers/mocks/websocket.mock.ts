/**
 * WebSocket Mock for Testing
 * Simulates WebSocket behavior for IRC connection testing
 */

import { EventEmitter } from 'events';

export class MockWebSocket extends EventEmitter {
  public readyState: number;
  public url: string;
  public protocol?: string;
  
  private _isConnected: boolean = false;
  private _messageQueue: string[] = [];
  private _connectionDelay: number = 10;

  // WebSocket constants
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  constructor(url: string, protocol?: string) {
    super();
    this.url = url;
    this.protocol = protocol;
    this.readyState = MockWebSocket.CONNECTING;
    
    // Simulate connection establishment
    setTimeout(() => {
      this._connect();
    }, this._connectionDelay);
  }

  private _connect(): void {
    this.readyState = MockWebSocket.OPEN;
    this._isConnected = true;
    this.emit('open');
  }

  send(data: string): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    
    this._messageQueue.push(data);
    
    // Simulate server responses for IRC commands
    this._handleIRCCommand(data);
  }

  close(code?: number, reason?: string): void {
    if (this.readyState === MockWebSocket.CLOSED || this.readyState === MockWebSocket.CLOSING) {
      return;
    }

    this.readyState = MockWebSocket.CLOSING;
    
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      this._isConnected = false;
      this.emit('close', code || 1000, reason || 'Normal closure');
    }, 10);
  }

  // Simulate incoming messages
  simulateMessage(data: string): void {
    if (this._isConnected) {
      setTimeout(() => {
        this.emit('message', Buffer.from(data));
      }, 5);
    }
  }

  // Simulate connection error
  simulateError(error: Error): void {
    setTimeout(() => {
      this.emit('error', error);
    }, 5);
  }

  // Simulate network disconnection
  simulateDisconnection(code: number = 1006, reason: string = 'Connection lost'): void {
    if (this._isConnected) {
      this.readyState = MockWebSocket.CLOSED;
      this._isConnected = false;
      this.emit('close', code, reason);
    }
  }

  // Get sent messages for testing
  getSentMessages(): string[] {
    return [...this._messageQueue];
  }

  // Clear message history
  clearMessageHistory(): void {
    this._messageQueue = [];
  }

  // Set connection delay for testing
  setConnectionDelay(delay: number): void {
    this._connectionDelay = delay;
  }

  private _handleIRCCommand(data: string): void {
    const trimmedData = data.trim();
    
    // Simulate IRC server responses
    if (trimmedData.startsWith('PASS ')) {
      // Authentication responses will be handled by test
      return;
    }
    
    if (trimmedData.startsWith('NICK ')) {
      const nick = trimmedData.split(' ')[1];
      setTimeout(() => {
        this.simulateMessage(`:tmi.twitch.tv 001 ${nick} :Welcome, GLHF!`);
      }, 20);
      return;
    }
    
    if (trimmedData.startsWith('JOIN ')) {
      const channel = trimmedData.split(' ')[1];
      const nick = 'testuser'; // Default test nickname
      setTimeout(() => {
        this.simulateMessage(`:${nick}!${nick}@${nick}.tmi.twitch.tv JOIN ${channel}`);
      }, 30);
      return;
    }
    
    if (trimmedData.startsWith('PRIVMSG ')) {
      // Message sent successfully (no response needed for Twitch IRC)
      return;
    }
    
    if (trimmedData.startsWith('PING ')) {
      // Respond to ping with pong
      const pingData = trimmedData.substring(5);
      setTimeout(() => {
        this.simulateMessage(`PONG :${pingData}`);
      }, 10);
      return;
    }
  }
}

// Factory function for creating mock WebSocket instances
export const createMockWebSocket = (url: string = 'wss://irc-ws.chat.twitch.tv:443'): MockWebSocket => {
  return new MockWebSocket(url);
};

// Helper for testing WebSocket behavior
export const mockWebSocketBehavior = {
  // Simulate successful connection
  successfulConnection: (ws: MockWebSocket) => {
    // Already handled in constructor
  },
  
  // Simulate authentication success
  authenticationSuccess: (ws: MockWebSocket, username: string = 'testuser') => {
    setTimeout(() => {
      ws.simulateMessage(`:tmi.twitch.tv 001 ${username} :Welcome, GLHF!`);
      ws.simulateMessage(`:tmi.twitch.tv 002 ${username} :Your host is tmi.twitch.tv`);
      ws.simulateMessage(`:tmi.twitch.tv 003 ${username} :This server is rather new`);
      ws.simulateMessage(`:tmi.twitch.tv 004 ${username} :-`);
    }, 50);
  },
  
  // Simulate authentication failure
  authenticationFailure: (ws: MockWebSocket) => {
    setTimeout(() => {
      ws.simulateMessage(':tmi.twitch.tv NOTICE * :Login authentication failed');
    }, 50);
  },
  
  // Simulate channel join success
  channelJoinSuccess: (ws: MockWebSocket, channel: string, username: string = 'testuser') => {
    setTimeout(() => {
      ws.simulateMessage(`:${username}!${username}@${username}.tmi.twitch.tv JOIN ${channel}`);
    }, 30);
  },
  
  // Simulate receiving a chat message
  receiveChatMessage: (ws: MockWebSocket, channel: string, username: string, message: string) => {
    setTimeout(() => {
      ws.simulateMessage(`:${username}!${username}@${username}.tmi.twitch.tv PRIVMSG ${channel} :${message}`);
    }, 20);
  },
  
  // Simulate network issues
  networkIssues: (ws: MockWebSocket) => {
    setTimeout(() => {
      ws.simulateDisconnection(1006, 'Network error');
    }, 100);
  }
};