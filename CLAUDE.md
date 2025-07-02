# StreamPortal VSCode Extension - AI Development Guide

This document provides comprehensive information for AI assistants (like Claude Code) to understand and work with the StreamPortal VSCode extension project.

## Project Overview

**StreamPortal** is a Visual Studio Code extension that provides integrated Twitch chat functionality directly within the VS Code interface. It allows developers to interact with Twitch chat while coding, without switching between applications.

### Key Features
- Real-time Twitch chat integration
- OAuth2 authentication flow
- Channel switching capabilities
- Message sending and receiving
- Configurable UI themes and settings
- Memory-efficient IRC connection management

## Architecture Overview

```
src/
├── core/                    # Core error handling and utilities
│   └── errors.ts           # Centralized error management system
├── commands/               # VSCode command implementations
│   ├── connect.ts         # Channel connection command
│   ├── disconnect.ts      # Disconnect command
│   ├── logout.ts          # Authentication logout
│   └── sendMessage.ts     # Message sending command
├── twitch/                # Twitch integration modules
│   ├── twitchChatManager.ts  # Main chat orchestration
│   ├── auth/              # Authentication system
│   │   ├── authManager.ts    # OAuth2 flow management
│   │   ├── oauthFlow.ts      # OAuth2 implementation
│   │   └── tokenManager.ts  # Token storage and refresh
│   ├── irc/               # IRC protocol implementation
│   │   ├── connectionManager.ts  # WebSocket IRC connection
│   │   └── ircProtocol.ts       # IRC message parsing
│   └── types/             # TypeScript type definitions
│       └── twitch.ts         # Twitch-specific types
├── ui/                    # User interface components
│   └── chatPanelProvider.ts  # Webview panel management
├── types/                 # Global type definitions
│   └── extension.ts         # Extension-wide types
└── extension.ts           # Main extension entry point

media/                     # Frontend assets
├── chatPanel.js          # Webview frontend logic
└── styles.css           # UI styling

tests/                     # Comprehensive test suite
├── unit/                 # Unit tests
├── integration/          # Integration tests
├── helpers/              # Test utilities
└── fixtures/            # Test data
```

## Key Components

### 1. TwitchChatManager (`src/twitch/twitchChatManager.ts`)
**Purpose**: Central orchestrator for all chat-related functionality
**Key Methods**:
- `authenticate()`: Handle OAuth2 authentication
- `connectToChannel(channel: string)`: Connect to a Twitch channel
- `sendMessage(message: string)`: Send chat messages
- `disconnect()`: Clean disconnect from chat

**Dependencies**: AuthManager, IRCConnectionManager, IRCProtocolHandler

### 2. AuthManager (`src/twitch/auth/authManager.ts`)
**Purpose**: Manage OAuth2 authentication flow and token lifecycle
**Key Methods**:
- `validateConfig()`: Check configuration completeness
- `authenticate()`: Execute OAuth2 flow
- `validateCurrentToken()`: Check token validity
- `refreshToken()`: Refresh expired tokens

**Configuration Requirements**:
- `username`: Twitch username
- `clientId`: Twitch application client ID
- `clientSecret`: Twitch application client secret
- `redirectUri`: OAuth2 redirect URI

### 3. IRCConnectionManager (`src/twitch/irc/connectionManager.ts`)
**Purpose**: Handle WebSocket IRC connections to Twitch
**Key Features**:
- Automatic reconnection with exponential backoff
- Channel management (join/part/switch)
- Connection state tracking
- Memory management and cleanup

**WebSocket Endpoint**: `wss://irc-ws.chat.twitch.tv:443`

### 4. IRCProtocolHandler (`src/twitch/irc/ircProtocol.ts`)
**Purpose**: Parse and handle IRC protocol messages
**Key Capabilities**:
- PRIVMSG parsing with tags (badges, emotes, colors)
- User type detection (broadcaster, moderator, VIP, subscriber)
- Message metadata extraction
- Error handling for malformed messages

### 5. ChatPanelProvider (`src/ui/chatPanelProvider.ts`)
**Purpose**: Manage webview UI and user interactions
**Key Features**:
- Webview lifecycle management
- Message broadcasting to frontend
- Command handling from webview
- State synchronization

## Configuration System

Extension configuration is managed through VSCode settings with the prefix `streamPortal`:

```json
{
  "streamPortal.username": "your_twitch_username",
  "streamPortal.clientId": "your_app_client_id",
  "streamPortal.clientSecret": "your_app_client_secret",
  "streamPortal.redirectUri": "http://localhost:7777/auth/callback"
}
```

## Error Handling System

The extension uses a centralized error handling system (`src/core/errors.ts`):

### Error Types
- `AuthenticationError`: Authentication failures
- `ConnectionError`: Network/connection issues (with retry capability)
- `ChannelError`: Channel-specific problems
- `APIError`: Twitch API errors (with rate limiting detection)
- `ConfigurationError`: Configuration validation issues
- `MessageError`: Message sending failures

### Error Handler
- `ErrorHandler.getInstance()`: Singleton error processor
- `withErrorHandling()`: Utility for async operation wrapping
- `handleError()`: Centralized error logging and user notification

## Testing Framework

The project uses Jest with comprehensive test coverage:

### Test Structure
```
tests/
├── unit/                  # Unit tests for individual components
│   ├── core/             # Core system tests
│   ├── twitch/           # Twitch integration tests
│   └── ui/               # UI component tests
├── integration/          # End-to-end workflow tests
├── helpers/              # Test utilities and mocks
│   └── mocks/           # WebSocket and VSCode API mocks
└── fixtures/            # Test data and scenarios
```

### Key Test Files
- `tests/unit/core/errors.test.ts`: Error system validation (27/28 tests passing)
- `tests/unit/twitch/twitchChatManager.test.ts`: Main chat manager tests
- `tests/integration/chat-flow.test.ts`: Complete chat workflow testing

### Running Tests
```bash
npm test                  # Run all tests
npx jest --coverage      # Run with coverage report
npx jest --watch         # Watch mode for development
```

## Development Guidelines

### Code Style
- TypeScript with strict type checking
- Centralized error handling using custom error classes
- Memory management with explicit cleanup patterns
- Event-driven architecture with proper listener management

### Performance Considerations
- Message batching for DOM updates (MAX_MESSAGES = 500)
- Debounced reconnection attempts (MIN_RECONNECT_INTERVAL = 1000ms)
- Efficient WebSocket connection management
- Resource cleanup on disconnect/dispose

### Memory Management
- Explicit WebSocket cleanup
- Event listener removal
- Status bar item disposal
- Timer cleanup for reconnection logic

## Common Development Tasks

### Adding New Commands
1. Create command file in `src/commands/`
2. Register in `src/commands/index.ts`
3. Add command registration in `src/extension.ts`
4. Update `package.json` commands section

### Extending Chat Features
1. Add message handling in `IRCProtocolHandler`
2. Update chat message types in `src/twitch/types/twitch.ts`
3. Implement UI changes in `media/chatPanel.js`
4. Add corresponding tests

### Configuration Changes
1. Update `package.json` configuration properties
2. Modify validation in `AuthManager.validateConfig()`
3. Update documentation and type definitions

## Debugging and Troubleshooting

### Common Issues
1. **Authentication Failures**: Check client credentials and redirect URI
2. **Connection Issues**: Verify network connectivity and WebSocket support
3. **Channel Join Failures**: Validate channel names and user permissions
4. **Message Sending Issues**: Check authentication state and connection status

### Debug Commands
```bash
npm run compile          # Compile TypeScript
npm run lint            # Run ESLint
npm run test            # Run test suite
code --extensionDevelopmentHost=.  # Launch extension development
```

### VSCode Extension Development
- Use F5 to launch Extension Development Host
- Use Ctrl+Shift+P to access command palette
- Check Output panel for extension logs
- Use Developer Tools for webview debugging

## API Integration

### Twitch IRC
- **Protocol**: WebSocket IRC over wss://irc-ws.chat.twitch.tv:443
- **Authentication**: OAuth2 token-based
- **Rate Limits**: Handled automatically with exponential backoff
- **Message Format**: IRC protocol with Twitch-specific tags

### VSCode Extension API
- **Webview Provider**: For chat panel UI
- **Configuration**: VSCode settings integration
- **Commands**: Command palette integration
- **Status Bar**: Connection status display

## Security Considerations

- OAuth2 tokens stored in VSCode secure storage
- No credentials logged or exposed in clear text
- Secure WebSocket connections (WSS)
- Input validation for user messages and channel names
- Rate limiting compliance with Twitch guidelines

This documentation should provide sufficient context for AI assistants to understand, maintain, and extend the StreamPortal extension effectively.