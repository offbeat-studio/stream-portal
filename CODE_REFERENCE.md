# Code Reference Guide

This document provides a comprehensive reference for the codebase structure, key functions, and integration points.

## 📁 Source Code Organization

### Authentication System (`src/twitch/auth/`)

#### AuthManager (`authManager.ts`)
**Primary authentication coordinator**

```typescript
class AuthManager {
  async authenticate(): Promise<AuthResult>     // Main auth entry point
  isAuthenticated(): boolean                    // Check auth status  
  getAccessToken(): string | null              // Get current token
  async refreshToken(): Promise<void>          // Refresh expired token
  async logout(): Promise<void>                // Clear auth state
  validateConfig(): ValidationResult          // Check required config
}
```

**Key Integration Points**:
- Uses `TokenManager` for secure storage
- Uses `OAuthFlow` for OAuth operations
- Reads config from VSCode workspace settings
- Integrates with `TwitchChatManager`

#### TokenManager (`tokenManager.ts`)
**Secure token storage using VSCode SecretStorage**

```typescript
class TokenManager {
  async storeTokens(tokens: TokenData): Promise<void>    // Store encrypted tokens
  async getStoredTokens(): Promise<TokenData | null>     // Retrieve tokens
  isTokenExpired(): boolean                              // Check expiration
  getAccessToken(): string | null                       // Get access token
  async clearTokens(): Promise<void>                     // Delete all tokens
}
```

**Security Features**:
- VSCode SecretStorage API for encryption
- 5-minute expiration buffer
- Automatic date handling for token expiry

#### OAuthFlow (`oauthFlow.ts`)
**OAuth 2.0 Authorization Code Flow implementation**

```typescript
class OAuthFlow {
  async startFlow(): Promise<AuthResult>                          // Begin OAuth flow
  async exchangeCodeForTokens(code: string): Promise<TokenData>   // Exchange auth code
  async refreshAccessToken(refreshToken: string): Promise<TokenData>  // Refresh token
  async validateToken(accessToken: string): Promise<boolean>      // Validate token
}
```

**OAuth Endpoints**:
- Authorization: `https://id.twitch.tv/oauth2/authorize`
- Token: `https://id.twitch.tv/oauth2/token`
- Validation: `https://id.twitch.tv/oauth2/validate`

### IRC Connection System (`src/twitch/irc/`)

#### IRCConnectionManager (`connectionManager.ts`)
**WebSocket connection management with auto-reconnection**

```typescript
class IRCConnectionManager {
  async connect(token: string, username: string): Promise<void>   // Establish connection
  disconnect(): void                                              // Close connection
  async joinChannel(channel: string): Promise<void>              // Join chat channel
  sendMessage(channel: string, message: string): void           // Send chat message
  getConnectionState(): ConnectionState                          // Get current state
  
  // Event handlers
  onMessage(handler: (message: IRCMessage) => void): void       // IRC message events
  onStateChange(handler: (state: ConnectionState) => void): void // Connection state events
  onError(handler: (error: Error) => void): void               // Error events
}
```

**Connection Features**:
- WebSocket endpoint: `wss://irc-ws.chat.twitch.tv:443`
- Auto-reconnection with exponential backoff (max 5 attempts)
- Heartbeat mechanism every 5 minutes
- Connection state tracking

**IRC Capabilities**:
- `twitch.tv/commands` - Twitch-specific IRC commands
- `twitch.tv/membership` - User join/part notifications  
- `twitch.tv/tags` - Message metadata and user info

#### IRCProtocolHandler (`ircProtocol.ts`)
**IRC message parsing and protocol handling**

```typescript
class IRCProtocolHandler {
  parseMessage(rawMessage: string): IRCMessage              // Parse raw IRC message
  parsePrivMsg(ircMessage: IRCMessage): ChatMessage | null  // Parse chat message
  formatAuthMessage(token: string, username: string): string // Format auth
  formatJoinMessage(channel: string): string               // Format JOIN command
  formatPrivMsg(channel: string, message: string): string  // Format PRIVMSG
  
  // Message type detection
  isPrivateMessage(ircMessage: IRCMessage): boolean
  isPingMessage(ircMessage: IRCMessage): boolean
  isJoinMessage(ircMessage: IRCMessage): boolean
}
```

**Twitch-Specific Features**:
- Badge parsing (broadcaster, moderator, subscriber, VIP)
- Emote position parsing
- User type detection
- Color and display name handling

### Integration Layer

#### TwitchChatManager (`src/twitch/twitchChatManager.ts`)
**High-level chat operations and VSCode integration**

```typescript
class TwitchChatManager {
  async authenticate(): Promise<boolean>                    // Authenticate with Twitch
  async connectToChannel(channel: string): Promise<boolean> // Connect to specific channel
  async disconnect(): Promise<void>                         // Disconnect from chat
  async sendMessage(message: string): Promise<boolean>      // Send chat message
  async logout(): Promise<void>                            // Complete logout
  
  // Status queries
  isConnected(): boolean                                   // Check connection status
  isAuthenticated(): boolean                              // Check auth status
  getCurrentChannel(): string                             // Get current channel
  getConnectionState(): ConnectionState                   // Get detailed state
  
  // Event handlers
  onChatMessage(handler: (message: ChatMessage) => void): void         // Chat message events
  onConnectionStateChange(handler: (state: ConnectionState) => void): void // State change events
}
```

**VSCode Integration**:
- Status bar management with real-time connection status
- Command palette integration
- Error message display
- Configuration reading

#### Extension Entry Point (`src/extension.ts`)
**VSCode extension activation and command registration**

```typescript
export function activate(context: vscode.ExtensionContext) {
  const twitchChatManager = new TwitchChatManager(context);
  
  // Command registration
  const connectCommand = vscode.commands.registerCommand('twitchChatroom.connect', async () => {
    // Connection logic with user prompts
  });
  
  const sendMessageCommand = vscode.commands.registerCommand('twitchChatroom.sendMessage', async () => {
    // Message sending with input box
  });
  
  // Additional commands: disconnect, logout
}
```

## 🔗 Data Flow & Integration Points

### Authentication Flow
```
User → Connect Command → AuthManager.authenticate() → OAuthFlow.startFlow()
  ↓
Browser OAuth → Auth Code → OAuthFlow.exchangeCodeForTokens() → TokenManager.storeTokens()
  ↓  
TwitchChatManager.connectToChannel() → IRCConnectionManager.connect()
```

### Message Receiving Flow
```
Twitch IRC → WebSocket → IRCConnectionManager.handleMessage() → IRCProtocolHandler.parseMessage()
  ↓
IRCProtocolHandler.parsePrivMsg() → TwitchChatManager.handleIRCMessage() → Event Handlers
```

### Message Sending Flow
```
User → Send Command → TwitchChatManager.sendMessage() → IRCConnectionManager.sendMessage()
  ↓
IRCProtocolHandler.formatPrivMsg() → WebSocket → Twitch IRC
```

## 📋 Type Definitions (`src/twitch/types/twitch.ts`)

### Core Interfaces

```typescript
interface TwitchConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string[];
  tokenType: string;
  expiresAt: Date;
}

interface ChatMessage {
  id: string;
  channel: string;
  username: string;
  displayName: string;
  message: string;
  timestamp: Date;
  badges: Badge[];
  emotes: Emote[];
  color?: string | undefined;
  userType: UserType;
}

interface IRCMessage {
  prefix?: string;
  command: string;
  params: string[];
  tags?: Record<string, string>;
  raw: string;
}

enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  AUTHENTICATING = 'authenticating',
  CONNECTED = 'connected',
  ERROR = 'error',
  RECONNECTING = 'reconnecting'
}
```

## ⚙️ Configuration Schema

### VSCode Settings (`package.json`)

```json
{
  "contributes": {
    "configuration": {
      "title": "Twitch Chatroom",
      "properties": {
        "twitchChatroom.clientId": {
          "type": "string",
          "description": "Twitch application Client ID (required for OAuth)"
        },
        "twitchChatroom.clientSecret": {
          "type": "string", 
          "description": "Twitch application Client Secret (required for OAuth)"
        },
        "twitchChatroom.username": {
          "type": "string",
          "description": "Your Twitch username"
        },
        "twitchChatroom.channel": {
          "type": "string",
          "description": "Twitch channel name to connect to"
        }
      }
    }
  }
}
```

### Command Definitions

```json
{
  "contributes": {
    "commands": [
      {
        "command": "twitchChatroom.connect",
        "title": "Connect to Twitch Chat",
        "category": "Twitch Chatroom"
      },
      {
        "command": "twitchChatroom.sendMessage", 
        "title": "Send Message to Chat",
        "category": "Twitch Chatroom"
      }
    ]
  }
}
```

## 🔧 Key Utilities & Helpers

### Error Handling Patterns

```typescript
// Consistent error handling in async operations
try {
  const result = await operation();
  return { success: true, data: result };
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  vscode.window.showErrorMessage(`Operation failed: ${errorMessage}`);
  return { success: false, error: errorMessage };
}
```

### Status Bar Management

```typescript
// Status bar state management in TwitchChatManager
private updateStatusBar(): void {
  const state = this.getConnectionState();
  switch (state) {
    case ConnectionState.CONNECTED:
      this.statusBarItem.text = `$(comment-discussion) Twitch: ${this.currentChannel}`;
      break;
    case ConnectionState.CONNECTING:
      this.statusBarItem.text = `$(sync~spin) Twitch: Connecting...`;
      break;
    // Additional states...
  }
}
```

### Event Handler Pattern

```typescript
// Event emission pattern used throughout the codebase
private emitChatMessage(message: ChatMessage): void {
  this.onChatMessageHandlers.forEach(handler => {
    try {
      handler(message);
    } catch (error) {
      console.error('Error in chat message handler:', error);
    }
  });
}
```

## 🚀 Extension Points

### Adding New Commands

1. Register command in `extension.ts`:
```typescript
const newCommand = vscode.commands.registerCommand('twitchChatroom.newFeature', async () => {
  // Implementation
});
context.subscriptions.push(newCommand);
```

2. Add command definition to `package.json`:
```json
{
  "command": "twitchChatroom.newFeature",
  "title": "New Feature",
  "category": "Twitch Chatroom"
}
```

### Adding New Configuration

1. Add to `package.json` configuration schema
2. Read in `AuthManager.getConfigFromSettings()`
3. Update `TwitchConfig` interface if needed

### Extending Message Handling

1. Add new message types to `IRCProtocolHandler`
2. Handle in `TwitchChatManager.handleIRCMessage()`
3. Emit events to registered handlers

---

This reference provides the foundation for understanding and extending the VSCode Twitch Chatroom Extension codebase.