# VSCode Twitch Chatroom Extension - AI Index

**Project Status**: M2 Complete, Ready for M3  
**Last Updated**: 2025-06-30  
**Git Commit**: `6be7b72` - Complete Twitch IRC integration

## 📋 Project Overview

VSCode extension that integrates Twitch IRC chatroom functionality directly into the editor, allowing streamers to interact with their audience while coding.

**Key Features**:
- OAuth 2.0 authentication with Twitch
- Real-time IRC chat connection via WebSocket
- Secure token management with auto-refresh
- Auto-reconnection with exponential backoff
- VSCode status bar integration
- Full chat functionality (send/receive messages)

## 🏗️ Architecture Summary

```
Extension Architecture:
├── Authentication Layer (OAuth 2.0)
│   ├── AuthManager - Main auth coordinator
│   ├── TokenManager - Secure token storage (VSCode SecretStorage)
│   └── OAuthFlow - OAuth flow implementation
├── IRC Connection Layer  
│   ├── IRCConnectionManager - WebSocket management
│   └── IRCProtocolHandler - IRC protocol parsing
├── Integration Layer
│   ├── TwitchChatManager - High-level chat operations
│   └── Extension.ts - VSCode command integration
└── UI Layer (Future M3)
    └── Webview chat interface (planned)
```

## 📁 File Structure & Purpose

### Core Source Files (`src/`)

#### Main Extension
- **`extension.ts`** - VSCode extension entry point, command registration, TwitchChatManager initialization

#### Twitch Integration (`src/twitch/`)

**Authentication System (`auth/`)**:
- **`authManager.ts`** - Main authentication coordinator, OAuth flow management
- **`tokenManager.ts`** - Secure token storage using VSCode SecretStorage API
- **`oauthFlow.ts`** - OAuth 2.0 Authorization Code Flow implementation

**IRC System (`irc/`)**:
- **`connectionManager.ts`** - WebSocket connection management, auto-reconnection
- **`ircProtocol.ts`** - IRC message parsing, protocol handling, Twitch-specific features

**Main Chat Manager**:
- **`twitchChatManager.ts`** - High-level chat operations, event coordination

**Type Definitions (`types/`)**:
- **`twitch.ts`** - TypeScript interfaces for Twitch data structures

#### Legacy Commands (`src/commands/`)
- **`connect.ts`, `disconnect.ts`, `helloWorld.ts`** - Individual command implementations (BaseCommand pattern)
- **`index.ts`** - Command exports

#### Shared Types (`src/types/`)
- **`extension.ts`** - Extension-wide TypeScript interfaces

### Documentation (`docs/`)

- **`setup-guide.md`** - User setup instructions, Twitch app registration
- **`architecture.md`** - Original M1 architecture design (legacy)
- **`twitch-integration-architecture.md`** - Detailed M2 technical architecture
- **`m2-development-workflow.md`** - M2 development planning and workflow

### Configuration

- **`package.json`** - Extension manifest, commands, configuration schema
- **`tsconfig.json`** - TypeScript compilation settings
- **`.eslintrc.json`** - Code quality rules
- **`.gitignore`** - Git exclusions
- **`.vscode/launch.json`** - Debug configuration
- **`.vscode/tasks.json`** - Build tasks

## 🔧 Key Components Deep Dive

### AuthManager (`src/twitch/auth/authManager.ts`)

**Purpose**: Orchestrates the entire authentication flow  
**Key Methods**:
- `authenticate()` - Main auth entry point, handles token validation/refresh
- `isAuthenticated()` - Check current auth status
- `logout()` - Clear all tokens and logout

**Dependencies**: TokenManager, OAuthFlow
**Integration**: Uses VSCode configuration for Client ID/Secret

### IRCConnectionManager (`src/twitch/irc/connectionManager.ts`)

**Purpose**: Manages WebSocket connection to Twitch IRC  
**Key Features**:
- Auto-reconnection with exponential backoff (max 5 attempts)
- Heartbeat mechanism (5-minute PING/PONG)
- Connection state management
- Event-driven message handling

**Connection Flow**:
1. WebSocket connection to `wss://irc-ws.chat.twitch.tv:443`
2. IRC capability negotiation (`twitch.tv/commands`, `membership`, `tags`)
3. Authentication with OAuth token
4. Channel join/part operations

### TwitchChatManager (`src/twitch/twitchChatManager.ts`)

**Purpose**: High-level chat operations and VSCode integration  
**Key Features**:
- Status bar management with connection state
- Chat message event handling
- Command palette integration
- Error handling and user feedback

## 📋 Available VSCode Commands

```typescript
// Command Palette entries:
'twitchChatroom.connect'      // Connect to Twitch Chat
'twitchChatroom.disconnect'   // Disconnect from Chat
'twitchChatroom.sendMessage'  // Send Message to Chat
'twitchChatroom.logout'       // Logout from Twitch
'twitchChatroom.helloWorld'   // Test command
```

## ⚙️ Configuration Schema

```typescript
// VSCode Settings (package.json contributes.configuration)
{
  "twitchChatroom.clientId": string,      // Twitch App Client ID (required)
  "twitchChatroom.clientSecret": string,  // Twitch App Client Secret (required)
  "twitchChatroom.username": string,      // Twitch username (required)
  "twitchChatroom.channel": string,       // Default channel to join
  "twitchChatroom.redirectUri": string,   // OAuth redirect (default: localhost:3000)
  "twitchChatroom.autoConnect": boolean   // Auto-connect on startup
}
```

## 🔐 Security Implementation

**Token Storage**: VSCode SecretStorage API (encrypted)  
**OAuth Flow**: Authorization Code Flow with CSRF protection  
**Token Refresh**: Automatic with 5-minute buffer  
**Scope**: Minimal (`chat:read`, `chat:edit`)

## 📊 Current Status & Milestones

### ✅ M1: Basic Infrastructure (Complete)
- VSCode extension scaffold
- TypeScript configuration
- Command system architecture
- Git repository setup

### ✅ M2: Twitch IRC Integration (Complete)
- OAuth 2.0 authentication system
- WebSocket IRC connection
- Message parsing and protocol handling
- Error handling and reconnection
- VSCode command integration

### 🚧 M3: UI/UX Interface (Next)
- Webview chat interface
- Message display components
- Interactive chat UI
- Theme integration

### 📅 M4: Optimization & Release (Planned)
- Performance optimization
- Testing implementation
- Documentation completion
- Marketplace preparation

## 🧩 Dependencies

**Runtime Dependencies**:
- `ws@^8.18.3` - WebSocket client for IRC connection
- `node-fetch@^3.3.2` - HTTP requests for OAuth API calls

**Development Dependencies**:
- `@types/vscode@^1.85.0` - VSCode API types
- `typescript@^5.3.3` - TypeScript compiler
- `eslint` + `@typescript-eslint/*` - Code quality
- `@vscode/test-*` - Testing framework

## 📝 Data Flow

```
User Action → VSCode Command → TwitchChatManager → AuthManager/ConnectionManager → Twitch API/IRC
                                     ↓
Status Bar ← UI Updates ← Event Handlers ← IRC Messages ← WebSocket ← Twitch IRC
```

## 🔍 Entry Points for AI Analysis

### For Authentication Issues:
- Start with `authManager.ts` → `oauthFlow.ts` → `tokenManager.ts`
- Check VSCode configuration in `package.json`

### For Connection Issues:
- Start with `connectionManager.ts` → `ircProtocol.ts`
- Check WebSocket connection and IRC message parsing

### For Integration Issues:
- Start with `extension.ts` → `twitchChatManager.ts`
- Check VSCode command registration and status bar

### For Configuration Issues:
- Check `package.json` contributes.configuration
- Verify `docs/setup-guide.md` for user setup

## 🏷️ Key Search Terms

**Authentication**: OAuth, token, SecretStorage, refresh, Twitch API  
**Connection**: IRC, WebSocket, reconnect, heartbeat, ping-pong  
**Protocol**: PRIVMSG, JOIN, PART, capabilities, tags, badges  
**Integration**: VSCode, commands, status bar, configuration  
**Error Handling**: try-catch, connection state, exponential backoff

## 🚀 Quick Start for Development

1. **Authentication Setup**: Configure Client ID/Secret in VSCode settings
2. **Debug**: Use F5 to launch extension development host
3. **Test Connection**: Use "Connect to Twitch Chat" command
4. **Monitor**: Check VSCode Developer Tools console for logs
5. **Extend**: Add new commands in `extension.ts` and update `package.json`

---

**Note**: This extension requires Twitch Developer Application registration. See `docs/setup-guide.md` for complete setup instructions.