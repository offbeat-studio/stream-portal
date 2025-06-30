# VSCode Twitch Chatroom Extension

A VSCode extension that integrates Twitch IRC chatroom functionality directly into your development environment, perfect for streamers who want to interact with their audience while coding.

## ✨ Features

- 🔐 **Secure OAuth Authentication** - Safe login with Twitch using OAuth 2.0
- 💬 **Real-time Chat Integration** - Connect to any Twitch channel's chat
- 📱 **Status Bar Integration** - See connection status at a glance
- 🔄 **Auto-reconnection** - Robust connection with automatic retry
- ⚡ **Fast & Lightweight** - Minimal performance impact on VSCode
- 🎨 **VSCode Theme Support** - Integrates seamlessly with your theme

## 🚀 Quick Start

### 1. Install the Extension
Install from the VSCode Marketplace or clone this repository for development.

### 2. Setup Twitch Application
1. Go to [Twitch Developer Console](https://dev.twitch.tv/console)
2. Create a new application
3. Set OAuth redirect URI to: `http://localhost:3000/auth/callback`
4. Note down your **Client ID** and **Client Secret**

### 3. Configure VSCode Settings
Open VSCode Settings (`Ctrl+,`) and configure:

```json
{
  "twitchChatroom.clientId": "your_client_id_here",
  "twitchChatroom.clientSecret": "your_client_secret_here", 
  "twitchChatroom.username": "your_twitch_username",
  "twitchChatroom.channel": "target_channel_name"
}
```

### 4. Connect to Chat
1. Open Command Palette (`Ctrl+Shift+P`)
2. Run: `Twitch Chatroom: Connect to Twitch Chat`
3. Complete OAuth authentication in browser
4. Start chatting! 🎉

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `Twitch Chatroom: Connect to Twitch Chat` | Connect to a Twitch channel |
| `Twitch Chatroom: Disconnect from Twitch Chat` | Disconnect from chat |
| `Twitch Chatroom: Send Message to Chat` | Send a message to current channel |
| `Twitch Chatroom: Logout from Twitch` | Logout and clear authentication |

## ⚙️ Configuration Options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `twitchChatroom.clientId` | string | "" | Twitch Application Client ID (required) |
| `twitchChatroom.clientSecret` | string | "" | Twitch Application Client Secret (required) |
| `twitchChatroom.username` | string | "" | Your Twitch username (required) |
| `twitchChatroom.channel` | string | "" | Default channel to connect to |
| `twitchChatroom.redirectUri` | string | "http://localhost:3000/auth/callback" | OAuth redirect URI |
| `twitchChatroom.autoConnect` | boolean | false | Auto-connect on extension startup |

## 🔧 Development

### Prerequisites
- Node.js 18+
- npm or yarn
- VSCode

### Setup
```bash
git clone <repository-url>
cd vscode-twitch-chatroom
npm install
npm run compile
```

### Debug
1. Open project in VSCode
2. Press `F5` to launch Extension Development Host
3. Test the extension in the new VSCode window

### Build
```bash
npm run compile      # Compile TypeScript
npm run lint        # Check code quality
npm run package     # Create .vsix package
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VSCode Extension                         │
├─────────────────────┬───────────────────┬───────────────────┤
│   Authentication    │   IRC Connection  │    Integration    │
│                     │                   │                   │
│ • OAuth 2.0 Flow    │ • WebSocket       │ • Command Palette │
│ • Token Management  │ • Auto-reconnect  │ • Status Bar      │
│ • Secure Storage    │ • IRC Protocol    │ • Configuration   │
└─────────────────────┴───────────────────┴───────────────────┘
```

### Key Components
- **AuthManager**: Handles OAuth authentication and token management
- **IRCConnectionManager**: Manages WebSocket connection to Twitch IRC
- **TwitchChatManager**: High-level chat operations and VSCode integration
- **IRCProtocolHandler**: Parses IRC messages and handles Twitch-specific features

## 🔐 Security

- All authentication tokens are securely stored using VSCode's built-in SecretStorage API
- OAuth 2.0 with CSRF protection
- Minimal permission scope (`chat:read`, `chat:edit`)
- No sensitive data is logged or transmitted insecurely

## 🐛 Troubleshooting

### Authentication Issues
- Verify Client ID and Client Secret are correct
- Check that redirect URI matches your Twitch app settings
- Try logging out and re-authenticating

### Connection Issues
- Check your internet connection
- Verify the channel name is correct
- Look for errors in VSCode Developer Tools Console

### General Issues
- Restart VSCode
- Check the Output panel for error messages
- Ensure all required settings are configured

## 📚 Documentation

- [Setup Guide](docs/setup-guide.md) - Detailed setup instructions
- [Architecture Documentation](docs/twitch-integration-architecture.md) - Technical details
- [AI Index](AI_INDEX.md) - AI-readable project documentation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🎯 Roadmap

- [x] **M1**: Basic VSCode extension infrastructure
- [x] **M2**: Twitch IRC integration with authentication
- [ ] **M3**: Interactive chat UI with Webview
- [ ] **M4**: Performance optimization and marketplace release

## 🆘 Support

- Check the [troubleshooting section](#🐛-troubleshooting)
- Review [documentation](docs/)
- Open an issue on GitHub

---

**Happy streaming and coding!** 🎮💻