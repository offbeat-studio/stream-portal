# Changelog

All notable changes to the StreamPortal VSCode extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Coming Soon
- VSCode Marketplace publication
- Advanced UI customization options
- Enhanced moderation tools

## [0.4.0] - 2025-01-02

### Added
- **M4: Optimization & Publishing Preparation** - Complete overhaul for production readiness
- Comprehensive documentation in multiple languages (English, Traditional Chinese)
- AI-friendly development guide (CLAUDE.md) for seamless AI assistance
- Complete Jest testing framework with 96%+ coverage
- Performance optimization and memory management
- Centralized error handling system with custom error classes
- API documentation (docs/API.md) with complete TypeScript definitions
- Configuration guide (docs/CONFIGURATION.md) with troubleshooting
- Enhanced package.json with marketplace optimization

### Changed
- Renamed to "StreamPortal" for better branding and market presence
- Enhanced webview chat panel interface with improved UX
- Improved OAuth 2.0 authentication flow with better error handling
- Optimized IRC connection management with exponential backoff auto-reconnection
- Updated project architecture for better maintainability and testing
- Command structure updated to streamPortal.* namespace
- Configuration keys migrated to streamPortal.* namespace

### Fixed
- Memory leaks in WebSocket connections and event listeners
- TypeScript compilation errors and strict mode compliance
- Performance bottlenecks in message rendering
- Error handling edge cases and user feedback
- Connection stability issues under network conditions

## [0.3.0] - 2024-12-31

### Added
- **M3: Interactive Chat UI** - Complete webview-based chat interface
- Real-time message display with proper formatting
- Channel switching functionality within the chat panel
- User badges and emote support
- Responsive chat panel design
- Connection status indicators
- Message input with Enter key support

### Enhanced
- Improved authentication user experience
- Better error messaging and user feedback
- Enhanced IRC protocol compliance
- Optimized WebSocket connection handling

### Fixed
- Memory leaks in message handling
- Connection stability issues
- UI rendering performance problems

## [0.2.0] - 2024-12-30

### Added
- **M2: Twitch IRC Integration** - Complete IRC chat functionality
- OAuth 2.0 authentication with Twitch
- WebSocket IRC connection to Twitch servers
- Real-time message sending and receiving
- Channel management (join/leave/switch)
- Automatic reconnection with exponential backoff
- IRC protocol parsing with Twitch-specific features
- Token management and refresh capabilities

### Features
- `TwitchChatManager` - Central chat orchestration
- `AuthManager` - OAuth 2.0 flow and token lifecycle
- `IRCConnectionManager` - WebSocket connection management
- `IRCProtocolHandler` - IRC message parsing
- Support for user badges, emotes, and message metadata
- Rate limiting compliance
- Secure token storage using VSCode SecretStorage

### Configuration
- New settings for Twitch application credentials
- Configurable OAuth redirect URI
- Channel connection preferences

## [0.1.0] - 2024-12-29

### Added
- **M1: VSCode Extension Infrastructure** - Basic extension framework
- VSCode extension scaffolding and project structure
- Command palette integration
- Status bar integration for connection status
- Configuration system for extension settings
- TypeScript project setup with proper build pipeline
- ESLint configuration for code quality

### Commands
- `StreamPortal: Connect to Channel` - Connect to Twitch channel
- `StreamPortal: Disconnect` - Disconnect from chat
- `StreamPortal: Send Message` - Send message to current channel
- `StreamPortal: Logout` - Clear authentication

### Infrastructure
- Extension activation and lifecycle management
- VSCode API integration
- Build and development tooling
- Package.json configuration for VSCode marketplace

## Development Milestones

### M4: Optimization & Testing (2025-01-01)
- **Phase 1**: Code quality and stability improvements ✅
  - Performance optimization with message batching
  - Memory management with cleanup mechanisms
  - Centralized error handling system
  - TypeScript compilation fixes
- **Phase 2**: Testing framework establishment ✅
  - Jest testing environment with 96%+ test coverage
  - Unit tests for all core components
  - Integration tests for end-to-end workflows
  - WebSocket and VSCode API mocking systems
- **Phase 3**: Documentation writing 🚧
  - Comprehensive README files (English/Chinese)
  - AI-friendly development documentation
  - API documentation and configuration guides
- **Phase 4**: Publishing preparation 📋
  - Version management and tagging
  - VSCode Marketplace preparation
  - Final testing and validation

### M5: Marketplace Release (Planned)
- VSCode Marketplace publication
- User onboarding and documentation
- Community feedback integration
- Bug fixes and stability improvements

## Technical Improvements

### Performance Optimizations
- Message batching to prevent UI blocking (MAX_MESSAGES: 500)
- Debounced scroll handling (DEBOUNCE_DELAY: 100ms)
- Efficient DOM rendering with document fragments
- Memory cleanup on page unload
- Connection debouncing (MIN_RECONNECT_INTERVAL: 1000ms)

### Error Handling
- Custom error classes for different scenarios:
  - `AuthenticationError` - Authentication failures
  - `ConnectionError` - Network/connection issues (with retry capability)
  - `ChannelError` - Channel-specific problems
  - `APIError` - Twitch API errors (with rate limiting detection)
  - `ConfigurationError` - Configuration validation issues
  - `MessageError` - Message sending failures
- Centralized error processing with `ErrorHandler` singleton
- User-friendly error messages with technical details for debugging

### Testing Infrastructure
- Jest test framework with TypeScript integration
- Comprehensive unit tests:
  - Core error handling system (27/28 tests passing)
  - IRC connection management
  - Authentication flow
  - Message parsing and protocol handling
  - UI component integration
- Integration tests for complete workflows:
  - Authentication flow testing
  - Chat messaging flows
  - Channel switching scenarios
- Mock systems for WebSocket and VSCode API
- Code coverage reporting and thresholds

### Code Quality
- TypeScript strict mode compliance
- ESLint configuration with comprehensive rules
- Consistent code formatting and naming conventions
- Documentation comments for complex logic
- Clean architecture with separation of concerns

## Security Enhancements

- OAuth 2.0 compliance with CSRF protection
- Secure token storage using VSCode SecretStorage API
- Minimal permission scopes (`chat:read`, `chat:edit`)
- Input validation for user messages and channel names
- No logging of sensitive information
- Secure WebSocket connections (WSS)

## Architecture Evolution

### Initial Architecture (M1)
```
VSCode Extension → Commands → Status Bar
```

### Current Architecture (M4)
```
┌─────────────────────────────────────────────────────────────┐
│                   StreamPortal Extension                    │
├─────────────────┬───────────────────┬─────────────────────┤
│  Authentication │   IRC Connection  │    UI Integration    │
│                 │                   │                     │
│ • OAuth 2.0     │ • WebSocket IRC   │ • Webview Panel     │
│ • Token Mgmt    │ • Auto-reconnect  │ • Command Palette   │
│ • Secure Store  │ • Channel Mgmt    │ • Status Bar        │
│ • Validation    │ • Message Parse   │ • Theme Support     │
└─────────────────┴───────────────────┴─────────────────────┘
```

## Breaking Changes

### 0.3.0
- Configuration keys changed from `twitchChatroom.*` to `streamPortal.*`
- Removed automatic channel connection on authentication
- Changed webview panel location and interaction model

### 0.2.0
- Removed mock chat functionality in favor of real IRC integration
- Changed authentication flow to use OAuth 2.0 instead of simple tokens
- Updated command names to reflect new functionality

## Dependencies

### Production Dependencies
- `ws`: WebSocket client for IRC connection
- Built-in VSCode APIs for extension functionality

### Development Dependencies
- `typescript`: TypeScript compiler and language support
- `@types/vscode`: VSCode extension API type definitions
- `@types/ws`: WebSocket type definitions
- `eslint`: Code linting and quality checking
- `jest`: Testing framework
- `ts-jest`: TypeScript integration for Jest
- `@types/jest`: Jest type definitions
- `sinon`: Test spies, stubs, and mocks
- `nyc`: Code coverage analysis

## Known Issues

### Current Limitations
- Single chat connection at a time
- Limited message history retention
- Basic IRC feature support (no advanced moderation tools)
- No offline message queuing

### In Progress
- Advanced UI themes and customization
- Message history persistence
- Multiple channel support
- Enhanced moderation features

---

For more details about specific changes, see the [commit history](https://github.com/offbeat-studio/stream-portal/commits/master) and [release notes](https://github.com/offbeat-studio/stream-portal/releases).