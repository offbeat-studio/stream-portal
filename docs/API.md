# StreamPortal API Documentation

This document provides comprehensive API documentation for the StreamPortal VSCode extension, intended for developers who want to understand the internal APIs, extend functionality, or integrate with the extension.

## Table of Contents

- [Core APIs](#core-apis)
- [Authentication System](#authentication-system)
- [IRC Connection Management](#irc-connection-management)
- [Chat Management](#chat-management)
- [UI Integration](#ui-integration)
- [Error Handling](#error-handling)
- [Events and Callbacks](#events-and-callbacks)
- [Configuration](#configuration)
- [Type Definitions](#type-definitions)

## Core APIs

### TwitchChatManager

The main orchestrator for all chat-related functionality.

```typescript
class TwitchChatManager {
  constructor(context: vscode.ExtensionContext)
  
  // Authentication
  authenticate(): Promise<boolean>
  isAuthenticated(): boolean
  logout(): Promise<void>
  
  // Connection Management
  connectToChannel(channel: string): Promise<boolean>
  disconnect(): Promise<void>
  isConnected(): boolean
  getConnectionState(): ConnectionState
  getCurrentChannel(): string
  
  // Message Handling
  sendMessage(message: string): Promise<boolean>
  
  // Event Listeners
  onChatMessage(handler: (message: ChatMessage) => void): void
  onConnectionStateChange(handler: (state: ConnectionState) => void): void
  
  // Cleanup
  dispose(): void
}
```

#### Methods

##### `authenticate(): Promise<boolean>`
Initiates the OAuth 2.0 authentication flow with Twitch.

**Returns**: `Promise<boolean>` - Success status of authentication
**Throws**: `AuthenticationError` - When authentication fails

**Example**:
```typescript
const success = await chatManager.authenticate();
if (success) {
  console.log('Authentication successful');
}
```

##### `connectToChannel(channel: string): Promise<boolean>`
Connects to a specific Twitch channel's chat.

**Parameters**:
- `channel: string` - The channel name (without # prefix)

**Returns**: `Promise<boolean>` - Success status of connection
**Throws**: `ChannelError` - When channel connection fails

**Example**:
```typescript
const connected = await chatManager.connectToChannel('shroud');
```

##### `sendMessage(message: string): Promise<boolean>`
Sends a message to the currently connected channel.

**Parameters**:
- `message: string` - The message content to send

**Returns**: `Promise<boolean>` - Success status of message sending
**Throws**: `MessageError` - When message sending fails

**Example**:
```typescript
const sent = await chatManager.sendMessage('Hello chat!');
```

## Authentication System

### AuthManager

Handles OAuth 2.0 authentication and token management.

```typescript
class AuthManager {
  constructor(context: vscode.ExtensionContext)
  
  // Configuration
  validateConfig(): ConfigValidationResult
  
  // Authentication Flow
  authenticate(): Promise<AuthResult>
  isAuthenticated(): boolean
  logout(): Promise<void>
  
  // Token Management
  getAccessToken(): string | null
  validateCurrentToken(): Promise<boolean>
  refreshToken(): Promise<void>
}
```

#### Types

```typescript
interface ConfigValidationResult {
  isValid: boolean;
  missingFields: string[];
}

interface AuthResult {
  success: boolean;
  token?: TokenData;
  error?: string;
}

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  scope: string[];
  expiresAt: Date;
}
```

#### Methods

##### `validateConfig(): ConfigValidationResult`
Validates the current extension configuration.

**Returns**: Configuration validation result with missing fields

**Example**:
```typescript
const validation = authManager.validateConfig();
if (!validation.isValid) {
  console.log('Missing fields:', validation.missingFields);
}
```

##### `authenticate(): Promise<AuthResult>`
Executes the complete OAuth 2.0 authentication flow.

**Returns**: Authentication result with token data or error
**Throws**: `AuthenticationError` - When OAuth flow fails

## IRC Connection Management

### IRCConnectionManager

Manages WebSocket IRC connections to Twitch servers.

```typescript
class IRCConnectionManager {
  constructor()
  
  // Connection Lifecycle
  connect(token: string, username: string): Promise<void>
  disconnect(): void
  isConnected(): boolean
  getConnectionState(): ConnectionState
  
  // Channel Management
  joinChannel(channel: string): Promise<void>
  switchToChannel(channel: string): Promise<void>
  
  // Message Handling
  sendMessage(channel: string, message: string): void
  
  // Event Listeners
  onMessage(handler: (message: IRCMessage) => void): void
  onStateChange(handler: (state: ConnectionState) => void): void
  onError(handler: (error: Error) => void): void
}
```

#### Types

```typescript
enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

interface IRCMessage {
  prefix?: string;
  command: string;
  params: string[];
  tags?: Record<string, string>;
  raw: string;
}
```

#### Methods

##### `connect(token: string, username: string): Promise<void>`
Establishes WebSocket connection to Twitch IRC servers.

**Parameters**:
- `token: string` - OAuth access token
- `username: string` - Twitch username

**Throws**: `ConnectionError` - When connection fails

##### `joinChannel(channel: string): Promise<void>`
Joins a specific channel's chat room.

**Parameters**:
- `channel: string` - Channel name (with or without # prefix)

**Throws**: `ChannelError` - When join fails

## Chat Management

### IRCProtocolHandler

Parses IRC messages and extracts Twitch-specific features.

```typescript
class IRCProtocolHandler {
  // Message Parsing
  parseMessage(rawMessage: string): IRCMessage
  isPrivateMessage(message: IRCMessage): boolean
  parsePrivMsg(message: IRCMessage): ChatMessage
}
```

#### Types

```typescript
interface ChatMessage {
  id: string;
  channel: string;
  username: string;
  displayName: string;
  message: string;
  timestamp: Date;
  badges: Badge[];
  emotes: Emote[];
  color?: string;
  userType: UserType;
  isSelf: boolean;
}

interface Badge {
  name: string;
  version: string;
}

interface Emote {
  id: string;
  name: string;
  positions: EmotePosition[];
}

interface EmotePosition {
  start: number;
  end: number;
}

enum UserType {
  VIEWER = 'viewer',
  SUBSCRIBER = 'subscriber',
  VIP = 'vip',
  MODERATOR = 'moderator',
  BROADCASTER = 'broadcaster'
}
```

#### Methods

##### `parsePrivMsg(message: IRCMessage): ChatMessage`
Parses a PRIVMSG IRC message into a structured chat message.

**Parameters**:
- `message: IRCMessage` - Raw IRC message object

**Returns**: Parsed chat message with all metadata
**Throws**: `MessageError` - When parsing fails

## UI Integration

### ChatPanelProvider

Manages the webview chat panel and user interactions.

```typescript
class ChatPanelProvider implements vscode.WebviewViewProvider {
  constructor(context: vscode.ExtensionContext)
  
  // Webview Lifecycle
  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ): void
  
  // Cleanup
  dispose(): void
}
```

#### Webview Commands

The webview communicates with the extension via message passing:

```typescript
// Commands sent from webview to extension
interface WebviewCommand {
  command: 'authenticate' | 'connectToChannel' | 'sendMessage' | 'disconnect' | 'logout' | 'getStatus';
  channel?: string;
  message?: string;
}

// Messages sent from extension to webview
interface WebviewMessage {
  command: 'newMessage' | 'connectionStateChange' | 'statusUpdate' | 'error';
  message?: ChatMessage;
  state?: ConnectionState;
  status?: ConnectionStatus;
  error?: string;
}
```

## Error Handling

### Error Types

The extension uses a centralized error handling system with specific error types:

```typescript
abstract class StreamPortalError extends Error {
  readonly timestamp: Date;
  readonly userMessage: string;
  readonly technicalMessage: string;
}

class AuthenticationError extends StreamPortalError {
  constructor(message?: string, technicalMessage?: string, originalError?: Error)
}

class ConnectionError extends StreamPortalError {
  readonly retryable: boolean;
  constructor(message?: string, retryable = true, technicalMessage?: string, originalError?: Error)
}

class ChannelError extends StreamPortalError {
  readonly channelName: string;
  constructor(channelName: string, message?: string, technicalMessage?: string, originalError?: Error)
}

class APIError extends StreamPortalError {
  readonly statusCode?: number;
  readonly rateLimited: boolean;
  constructor(message: string, statusCode?: number, technicalMessage?: string, originalError?: Error)
}

class ConfigurationError extends StreamPortalError {
  readonly missingFields: string[];
  constructor(missingFields: string[], technicalMessage?: string)
}

class MessageError extends StreamPortalError {
  constructor(message?: string, technicalMessage?: string, originalError?: Error)
}
```

### Error Handler

```typescript
class ErrorHandler {
  static getInstance(): ErrorHandler
  handleError(error: Error, context?: string): void
}

// Utility functions
function handleError(error: Error, context?: string): void
function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string,
  fallbackValue?: T
): Promise<T | undefined>
```

#### Usage Examples

```typescript
// Using withErrorHandling wrapper
const result = await withErrorHandling(
  () => chatManager.sendMessage('Hello'),
  'message sending',
  false
);

// Direct error handling
try {
  await chatManager.authenticate();
} catch (error) {
  handleError(error, 'authentication');
}
```

## Events and Callbacks

### Event Types

The extension provides several event types for monitoring state changes:

```typescript
// Chat message events
type ChatMessageHandler = (message: ChatMessage) => void;

// Connection state events
type ConnectionStateHandler = (state: ConnectionState) => void;

// Error events
type ErrorHandler = (error: Error) => void;
```

### Event Registration

```typescript
// Register for chat messages
chatManager.onChatMessage((message: ChatMessage) => {
  console.log(`${message.username}: ${message.message}`);
});

// Register for connection state changes
chatManager.onConnectionStateChange((state: ConnectionState) => {
  console.log(`Connection state: ${state}`);
});

// Register for IRC-level events
connectionManager.onMessage((ircMessage: IRCMessage) => {
  console.log(`IRC: ${ircMessage.command}`);
});
```

## Configuration

### Extension Settings

The extension uses VSCode's configuration system with the `streamPortal` prefix:

```typescript
interface ExtensionConfig {
  username: string;           // Twitch username
  clientId: string;          // Twitch app client ID
  clientSecret: string;      // Twitch app client secret
  redirectUri: string;       // OAuth redirect URI
  autoConnect: boolean;      // Auto-connect on startup
  recentChannels: string[];  // Recently connected channels
}
```

### Configuration Access

```typescript
// Reading configuration
const config = vscode.workspace.getConfiguration('streamPortal');
const username = config.get<string>('username');

// Updating configuration
await config.update('autoConnect', true, vscode.ConfigurationTarget.Global);
```

## Type Definitions

### Complete Type Export

```typescript
// Main types from src/twitch/types/twitch.ts
export {
  ConnectionState,
  UserType,
  ChatMessage,
  Badge,
  Emote,
  EmotePosition,
  IRCMessage
};

// Authentication types from src/twitch/auth/
export {
  TokenData,
  AuthResult,
  ConfigValidationResult
};

// Error types from src/core/errors.ts
export {
  StreamPortalError,
  AuthenticationError,
  ConnectionError,
  ChannelError,
  APIError,
  ConfigurationError,
  MessageError,
  ErrorHandler
};
```

## Extension API

### Commands

The extension registers the following VSCode commands:

```typescript
// Command IDs
const COMMANDS = {
  CONNECT: 'streamPortal.connect',
  DISCONNECT: 'streamPortal.disconnect',
  SEND_MESSAGE: 'streamPortal.sendMessage',
  LOGOUT: 'streamPortal.logout'
};

// Command registration
vscode.commands.registerCommand(COMMANDS.CONNECT, async () => {
  // Implementation
});
```

### Status Bar Integration

```typescript
// Status bar item management
const statusBarItem = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Right,
  100
);

// Update status
statusBarItem.text = '$(broadcast) StreamPortal: Connected';
statusBarItem.tooltip = 'Connected to #channelname';
statusBarItem.show();
```

## Testing APIs

### Mock Interfaces

For testing purposes, the extension provides mock implementations:

```typescript
// Mock WebSocket for testing
class MockWebSocket extends EventEmitter {
  send(data: string): void
  close(code?: number, reason?: string): void
  simulateMessage(data: string): void
  simulateError(error: Error): void
}

// Test utilities
const testUtils = {
  createMockChatMessage: (overrides?: Partial<ChatMessage>) => ChatMessage,
  sleep: (ms: number) => Promise<void>,
  mockVSCode: MockVSCodeAPI
};
```

## Performance Considerations

### Memory Management

- Message history is limited to 500 messages to prevent memory leaks
- Automatic cleanup of event listeners on disconnect
- WebSocket connections are properly closed and cleaned up
- Timer cleanup for reconnection logic

### Rate Limiting

- Automatic compliance with Twitch IRC rate limits
- Exponential backoff for reconnection attempts
- Message sending throttling to prevent rate limiting

### Optimization Features

- DOM batching for UI updates
- Debounced scroll handling
- Efficient IRC message parsing
- Minimal VSCode API calls

---

This API documentation provides the complete interface for the StreamPortal extension. For implementation examples and detailed usage, refer to the test files in the `tests/` directory and the main source code in `src/`.