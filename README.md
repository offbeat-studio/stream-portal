# StreamPortal - VSCode Twitch Chat Extension

> **[繁體中文版本](README.zh-TW.md)** | **[AI Development Guide](CLAUDE.md)**

A powerful VSCode extension that seamlessly integrates Twitch chat functionality directly into your development environment. Perfect for streamers who want to interact with their audience while coding, without switching between applications.

## ✨ Features

- 🔐 **Secure OAuth 2.0 Authentication** - Safe and secure Twitch integration
- 💬 **Real-time Chat Integration** - Connect to any Twitch channel's chat
- 🔄 **Smart Channel Switching** - Easily switch between multiple channels
- 📱 **Webview Chat Panel** - Dedicated chat interface within VSCode
- 📊 **Connection Status Display** - Real-time status in the status bar
- 🔄 **Auto-reconnection** - Robust connection with exponential backoff
- ⚡ **Performance Optimized** - Memory efficient with message batching
- 🎨 **Theme Integration** - Seamlessly adapts to your VSCode theme
- 🔧 **Comprehensive Configuration** - Extensive customization options

## 🚀 Quick Start

### 1. Install the Extension

Install from the VSCode Marketplace or download the latest release from GitHub.

### 2. Setup Twitch Application

1. Visit [Twitch Developer Console](https://dev.twitch.tv/console)
2. Create a new application with these settings:
   - **Name**: Your choice (e.g., "VSCode StreamPortal")
   - **OAuth Redirect URLs**: `http://localhost:7777/auth/callback`
   - **Category**: Developer Tools
3. Save your **Client ID** and **Client Secret**

### 3. Configure Extension

Open VSCode Settings (`Ctrl+,` or `Cmd+,`) and configure StreamPortal:

```json
{
  "streamPortal.username": "your_twitch_username",
  "streamPortal.clientId": "your_client_id_here",
  "streamPortal.clientSecret": "your_client_secret_here",
  "streamPortal.redirectUri": "http://localhost:7777/auth/callback"
}
```

### 4. Start Using StreamPortal

1. **Open Chat Panel**: View → StreamPortal Chat
2. **Authenticate**: Click "Authenticate with Twitch" in the chat panel
3. **Connect to Channel**: Enter a channel name and click "Connect"
4. **Start Chatting**: Send messages directly from VSCode! 🎉

## 📋 Available Commands

Access these commands via Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):

| Command | Description |
|---------|-------------|
| `StreamPortal: Connect to Channel` | Connect to a specific Twitch channel |
| `StreamPortal: Disconnect` | Disconnect from current chat |
| `StreamPortal: Send Message` | Send a message to current channel |
| `StreamPortal: Logout` | Logout and clear authentication |

## 🎛️ Chat Panel Features

The **StreamPortal Chat** panel provides:

- **Real-time Message Display**: See chat messages as they arrive
- **Channel Switcher**: Quick dropdown to change channels
- **Message Input**: Send messages with Enter key
- **Connection Controls**: Authenticate, connect, and disconnect buttons
- **Status Indicators**: Visual feedback for connection state
- **Responsive Design**: Adapts to different panel sizes

### Panel Controls

- **Authentication**: Click "Authenticate with Twitch" for OAuth flow
- **Channel Connection**: Select channel from dropdown or type new one
- **Message Sending**: Type in input field and press Enter
- **Settings**: Configure preferences and view status

## ⚙️ Configuration Options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `streamPortal.username` | string | "" | Your Twitch username (required) |
| `streamPortal.clientId` | string | "" | Twitch Application Client ID (required) |
| `streamPortal.clientSecret` | string | "" | Twitch Application Client Secret (required) |
| `streamPortal.redirectUri` | string | "http://localhost:7777/auth/callback" | OAuth redirect URI |
| `streamPortal.autoConnect` | boolean | false | Auto-connect to last channel on startup |
| `streamPortal.recentChannels` | array | [] | List of recently connected channels |

## 🏗️ Architecture

StreamPortal follows a modular architecture with clean separation of concerns:

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

### Core Components

- **TwitchChatManager**: Central orchestrator for all chat functionality
- **AuthManager**: OAuth 2.0 authentication and token lifecycle management
- **IRCConnectionManager**: WebSocket connection with Twitch IRC servers
- **IRCProtocolHandler**: IRC message parsing with Twitch-specific features
- **ChatPanelProvider**: Webview UI management and user interactions
- **ErrorHandler**: Centralized error management and user feedback

## 🔐 Security & Privacy

- **Secure Token Storage**: All authentication tokens stored using VSCode SecretStorage
- **OAuth 2.0 Compliance**: Industry-standard authentication with CSRF protection
- **Minimal Permissions**: Only requests necessary scopes (`chat:read`, `chat:edit`)
- **No Data Collection**: Extension doesn't collect or transmit personal data
- **Secure Connections**: All network communication over HTTPS/WSS

## 🧪 Testing & Quality

StreamPortal includes comprehensive testing infrastructure:

- **Unit Tests**: Individual component testing with 96%+ coverage
- **Integration Tests**: End-to-end workflow validation
- **Mock Systems**: WebSocket and VSCode API simulation
- **Performance Tests**: Memory usage and connection stability
- **Error Handling**: Comprehensive error scenario coverage

Run tests with: `npm test`

## 🔧 Development

### Prerequisites

- Node.js 18+ and npm
- VSCode 1.85.0+
- TypeScript 5.3+

### Setup Development Environment

```bash
# Clone repository
git clone https://github.com/offbeat-studio/stream-portal.git
cd stream-portal

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run tests
npm test

# Launch Extension Development Host
npm run dev
# OR press F5 in VSCode
```

### Project Structure

```
src/
├── core/                    # Core utilities and error handling
├── commands/               # VSCode command implementations
├── twitch/                # Twitch integration modules
│   ├── auth/              # Authentication system
│   ├── irc/               # IRC protocol implementation
│   └── types/             # TypeScript definitions
├── ui/                    # User interface components
└── extension.ts           # Main extension entry point

tests/                     # Comprehensive test suite
├── unit/                  # Unit tests
├── integration/           # Integration tests
└── helpers/               # Test utilities and mocks

media/                     # Frontend assets
├── chatPanel.js          # Webview frontend
└── styles.css           # UI styling
```

### Build Commands

```bash
npm run compile      # Compile TypeScript
npm run lint         # Run ESLint
npm run test         # Run test suite
npm run package      # Create .vsix package
```

## 🐛 Troubleshooting

### Common Issues

#### Authentication Problems
- **Invalid Credentials**: Verify Client ID and Secret in Twitch Developer Console
- **Redirect URI Mismatch**: Ensure redirect URI matches exactly: `http://localhost:7777/auth/callback`
- **OAuth Timeout**: Try logging out and re-authenticating

#### Connection Issues
- **Network Problems**: Check internet connectivity and firewall settings
- **Invalid Channel**: Verify channel name exists and is accessible
- **Rate Limiting**: Wait a few minutes before attempting reconnection

#### Performance Issues
- **Memory Usage**: Extension automatically manages memory with message limits
- **Slow Response**: Check VSCode Developer Tools Console for errors
- **UI Problems**: Try reloading the webview panel

### Debug Steps

1. **Check Extension Output**: View → Output → StreamPortal
2. **Open Developer Tools**: Help → Toggle Developer Tools
3. **Verify Configuration**: Check all required settings are configured
4. **Test Network**: Ensure Twitch.tv is accessible
5. **Restart Extension**: Reload VSCode window

### Getting Help

- 📖 **Documentation**: Check [CLAUDE.md](CLAUDE.md) for technical details
- 🐞 **Bug Reports**: Open an issue on GitHub with detailed information
- 💡 **Feature Requests**: Suggest improvements via GitHub issues
- 🔧 **Configuration Help**: Review the configuration examples above

## 🗺️ Roadmap

- [x] **M1**: VSCode extension infrastructure and basic functionality
- [x] **M2**: Twitch IRC integration with OAuth authentication
- [x] **M3**: Interactive webview chat UI and user experience
- [x] **M4**: Performance optimization and comprehensive testing
- [ ] **M5**: VSCode Marketplace publication and documentation
- [ ] **Future**: Advanced features (moderation tools, chat commands, themes)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with tests
4. Ensure all tests pass (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Twitch**: For providing the IRC interface and developer APIs
- **VSCode Team**: For the excellent extension development platform
- **Community**: For feedback, testing, and contributions

## 📞 Support

- **Documentation**: [CLAUDE.md](CLAUDE.md) for comprehensive technical details
- **Issues**: [GitHub Issues](https://github.com/offbeat-studio/stream-portal/issues)
- **Discussions**: [GitHub Discussions](https://github.com/offbeat-studio/stream-portal/discussions)

---

**Happy streaming and coding!** 🎮💻✨

*Made with ❤️ for the streaming developer community*
