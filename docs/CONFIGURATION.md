# StreamPortal Configuration Guide

This guide provides comprehensive information on configuring StreamPortal for optimal use with your Twitch streaming setup.

## Table of Contents

- [Quick Setup](#quick-setup)
- [Twitch Application Setup](#twitch-application-setup)
- [VSCode Configuration](#vscode-configuration)
- [Advanced Settings](#advanced-settings)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)

## Quick Setup

For a rapid setup, follow these essential steps:

1. **Create Twitch Application** at [Twitch Developer Console](https://dev.twitch.tv/console)
2. **Configure OAuth Redirect URI**: `http://localhost:7777/auth/callback`
3. **Set VSCode Settings** with your application credentials
4. **Authenticate** through the StreamPortal chat panel

## Twitch Application Setup

### Step 1: Create a Twitch Application

1. Visit [Twitch Developer Console](https://dev.twitch.tv/console)
2. Click "Register Your Application"
3. Fill in the application details:

   ```
   Name: VSCode StreamPortal (or your preferred name)
   OAuth Redirect URLs: http://localhost:7777/auth/callback
   Category: Developer Tools
   Client Type: Confidential
   ```

4. Click "Create"
5. Note down your **Client ID** and **Client Secret**

### Step 2: Configure OAuth Settings

**Important**: The redirect URI must be exactly:
```
http://localhost:7777/auth/callback
```

This localhost URL is used for the OAuth flow and must match exactly in both your Twitch application and VSCode settings.

### Step 3: Obtain Required Credentials

You'll need these three pieces of information:
- **Client ID**: Public identifier for your Twitch application
- **Client Secret**: Private key for your Twitch application (keep secure!)
- **Username**: Your Twitch username

## VSCode Configuration

### Method 1: Settings UI (Recommended)

1. Open VSCode Settings (`Ctrl+,` or `Cmd+,`)
2. Search for "StreamPortal"
3. Configure the following settings:

   | Setting | Value | Description |
   |---------|--------|-------------|
   | Username | `your_twitch_username` | Your Twitch account username |
   | Client ID | `your_client_id` | From Twitch Developer Console |
   | Client Secret | `your_client_secret` | From Twitch Developer Console |
   | Redirect URI | `http://localhost:7777/auth/callback` | OAuth callback URL |

### Method 2: Settings JSON

Add to your VSCode `settings.json`:

```json
{
  "streamPortal.username": "your_twitch_username",
  "streamPortal.clientId": "your_client_id_here",
  "streamPortal.clientSecret": "your_client_secret_here",
  "streamPortal.redirectUri": "http://localhost:7777/auth/callback",
  "streamPortal.autoConnect": false
}
```

### Method 3: Workspace Settings

For project-specific configuration, create `.vscode/settings.json`:

```json
{
  "streamPortal.username": "project_specific_username",
  "streamPortal.autoConnect": true
}
```

## Advanced Settings

### Auto-Connect Configuration

Enable automatic connection to your last used channel:

```json
{
  "streamPortal.autoConnect": true
}
```

**Note**: This requires a previous successful authentication and channel connection.

### Recent Channels Management

StreamPortal automatically tracks recently connected channels:

```json
{
  "streamPortal.recentChannels": ["channelname1", "channelname2", "channelname3"]
}
```

This setting is managed automatically but can be manually edited if needed.

### Custom OAuth Port

If port 7777 is occupied, you can configure a custom port:

```json
{
  "streamPortal.redirectUri": "http://localhost:8888/auth/callback"
}
```

**Important**: Update your Twitch application's OAuth redirect URI to match.

## Environment-Specific Configuration

### Development Environment

For development work, consider these settings:

```json
{
  "streamPortal.username": "dev_account",
  "streamPortal.autoConnect": false,
  "streamPortal.redirectUri": "http://localhost:7777/auth/callback"
}
```

### Production/Streaming Environment

For live streaming, optimize with:

```json
{
  "streamPortal.autoConnect": true,
  "streamPortal.username": "your_main_account"
}
```

### Team/Shared Environment

For shared development environments:

```json
{
  "streamPortal.username": "",
  "streamPortal.autoConnect": false
}
```

This allows each developer to authenticate with their own account.

## Configuration Validation

StreamPortal validates your configuration on startup. Common validation errors:

### Missing Required Fields

```
Configuration Error: Missing required fields: username, clientId, clientSecret
```

**Solution**: Ensure all required settings are configured in VSCode.

### Invalid Redirect URI

```
Authentication Error: Redirect URI mismatch
```

**Solution**: Verify the redirect URI matches exactly between VSCode settings and Twitch application.

### Invalid Credentials

```
Authentication Error: Invalid client credentials
```

**Solution**: Double-check your Client ID and Client Secret from the Twitch Developer Console.

## Security Considerations

### Credential Storage

- **Client Secret**: Stored securely in VSCode settings
- **Access Tokens**: Stored in VSCode's secure storage (SecretStorage API)
- **Refresh Tokens**: Encrypted and stored securely

### Best Practices

1. **Never commit credentials** to version control
2. **Use workspace settings** for project-specific configurations
3. **Regularly rotate** your Twitch application client secret
4. **Monitor access** in Twitch Developer Console

### Credential Rotation

To rotate your credentials:

1. Generate new Client Secret in Twitch Developer Console
2. Update VSCode settings with new secret
3. Re-authenticate through StreamPortal
4. Revoke old credentials in Twitch Console

## Network Configuration

### Firewall Settings

Ensure these ports are accessible:

- **Port 7777** (or your custom port): OAuth callback server
- **Port 443**: HTTPS connections to Twitch APIs
- **Port 443**: WebSocket Secure (WSS) for IRC connection

### Proxy Configuration

For corporate networks with proxies, VSCode's proxy settings apply automatically:

```json
{
  "http.proxy": "http://proxy.company.com:8080",
  "http.proxyStrictSSL": false
}
```

## Multi-Account Configuration

### Switching Between Accounts

1. **Logout** from current account: `StreamPortal: Logout`
2. **Update username** in settings
3. **Re-authenticate** with new account

### Account-Specific Workspaces

Create separate workspace configurations:

**Workspace A (`workspace-a/.vscode/settings.json`)**:
```json
{
  "streamPortal.username": "account_a"
}
```

**Workspace B (`workspace-b/.vscode/settings.json`)**:
```json
{
  "streamPortal.username": "account_b"
}
```

## Troubleshooting Configuration Issues

### Common Problems

#### 1. OAuth Flow Fails
```
Error: OAuth server failed to start on port 7777
```

**Solutions**:
- Check if port 7777 is in use: `netstat -an | grep 7777`
- Configure a different port in both VSCode and Twitch application
- Ensure firewall allows localhost connections

#### 2. Authentication Timeout
```
Error: Authentication timed out
```

**Solutions**:
- Check internet connectivity
- Verify Twitch application is active (not suspended)
- Clear browser cache for Twitch authentication

#### 3. Invalid Channel Name
```
Error: Failed to join channel 'channelname'
```

**Solutions**:
- Verify channel exists on Twitch
- Check for typos in channel name
- Ensure channel allows chat participation

### Debug Mode Configuration

Enable detailed logging for troubleshooting:

```json
{
  "streamPortal.debug": true,
  "streamPortal.logLevel": "verbose"
}
```

**Note**: These are advanced debugging options not available in the current release.

### Reset Configuration

To completely reset StreamPortal configuration:

1. **Clear VSCode settings**: Remove all `streamPortal.*` entries
2. **Clear stored tokens**: `StreamPortal: Logout`
3. **Restart VSCode**
4. **Reconfigure** from scratch

## Configuration Templates

### Minimal Configuration

```json
{
  "streamPortal.username": "your_username",
  "streamPortal.clientId": "your_client_id",
  "streamPortal.clientSecret": "your_client_secret"
}
```

### Complete Configuration

```json
{
  "streamPortal.username": "your_username",
  "streamPortal.clientId": "your_client_id",
  "streamPortal.clientSecret": "your_client_secret",
  "streamPortal.redirectUri": "http://localhost:7777/auth/callback",
  "streamPortal.autoConnect": true,
  "streamPortal.recentChannels": ["channel1", "channel2", "channel3"]
}
```

### Team Development Configuration

```json
{
  "streamPortal.clientId": "shared_dev_client_id",
  "streamPortal.clientSecret": "shared_dev_client_secret",
  "streamPortal.redirectUri": "http://localhost:7777/auth/callback",
  "streamPortal.autoConnect": false
}
```

## Integration with CI/CD

For automated testing environments, configure StreamPortal to use test credentials:

```json
{
  "streamPortal.username": "${env:TWITCH_TEST_USERNAME}",
  "streamPortal.clientId": "${env:TWITCH_TEST_CLIENT_ID}",
  "streamPortal.clientSecret": "${env:TWITCH_TEST_CLIENT_SECRET}",
  "streamPortal.autoConnect": false
}
```

**Note**: Environment variable substitution is a planned feature.

## Getting Help

### Configuration Support

- **Documentation**: [README.md](../README.md) for general setup
- **API Reference**: [API.md](API.md) for technical details
- **Issues**: [GitHub Issues](https://github.com/yourusername/vscode-twitch-chatroom/issues) for bug reports
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/vscode-twitch-chatroom/discussions) for questions

### Validation Tools

Use these commands to validate your configuration:

1. **Check Settings**: Open VSCode settings and search for "StreamPortal"
2. **Test Authentication**: Use `StreamPortal: Connect to Channel` command
3. **View Output**: Check "StreamPortal" in VSCode Output panel

---

**Need more help?** Check our [troubleshooting guide](../README.md#-troubleshooting) or open an issue on GitHub.