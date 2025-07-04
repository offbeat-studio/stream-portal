import * as vscode from 'vscode';
import { AuthManager } from './auth/authManager';
import { IRCConnectionManager } from './irc/connectionManager';
import { IRCProtocolHandler } from './irc/ircProtocol';
import { ConnectionState, IRCMessage, ChatMessage, UserType } from './types/twitch';
import { 
    AuthenticationError, 
    ConnectionError, 
    ChannelError, 
    ConfigurationError,
    MessageError,
    withErrorHandling 
} from '../core/errors';

export class TwitchChatManager {
    private authManager: AuthManager;
    private connectionManager: IRCConnectionManager;
    private protocolHandler: IRCProtocolHandler;
    private statusBarItem!: vscode.StatusBarItem;
    private currentChannel: string = '';

    // Event emitters
    private onChatMessageHandlers: ((message: ChatMessage) => void)[] = [];
    private onConnectionStateHandlers: ((state: ConnectionState) => void)[] = [];

    constructor(private context: vscode.ExtensionContext) {
        this.authManager = new AuthManager(context);
        this.connectionManager = new IRCConnectionManager();
        this.protocolHandler = new IRCProtocolHandler();
        
        this.setupStatusBar();
        this.setupConnectionHandlers();
    }

    async authenticate(): Promise<boolean> {
        return await withErrorHandling(async () => {
            const configValidation = this.authManager.validateConfig();
            if (!configValidation.isValid) {
                throw new ConfigurationError(
                    configValidation.missingFields,
                    undefined,
                    `Missing required Twitch configuration: ${configValidation.missingFields.join(', ')}`
                );
            }

            const result = await this.authManager.authenticate();
            
            if (result.success) {
                vscode.window.showInformationMessage('Successfully authenticated with Twitch!');
                this.updateStatusBar();
                return true;
            } else {
                throw new AuthenticationError(
                    'Failed to authenticate with Twitch. Please check your credentials.',
                    `Authentication failed: ${result.error}`
                );
            }
        }, 'Twitch authentication', false) || false;
    }

    async connectToChannel(channel: string): Promise<boolean> {
        return await withErrorHandling(async () => {
            // Validate channel name
            if (!channel || !channel.trim()) {
                throw new ChannelError(channel, 'Channel name cannot be empty.');
            }

            const cleanChannel = channel.trim().toLowerCase();

            // Always check if we're already connected to this channel
            if (this.isConnected() && this.currentChannel === cleanChannel) {
                vscode.window.showInformationMessage(`Already connected to ${cleanChannel}`);
                return true;
            }

            // If connected to a different channel, switch without full disconnection
            if (this.isConnected() && this.currentChannel && this.currentChannel !== channel) {
                console.log(`Switching from ${this.currentChannel} to ${channel}...`);
                try {
                    await this.connectionManager.switchToChannel(channel);
                    this.currentChannel = channel;
                    
                    // Trigger state update for UI
                    this.onConnectionStateHandlers.forEach(handler => {
                        try {
                            handler(this.connectionManager.getConnectionState());
                        } catch (error) {
                            console.error('Error in connection state handler:', error);
                        }
                    });
                    
                    vscode.window.showInformationMessage(`Switched to Twitch channel: ${channel}`);
                    this.updateStatusBar();
                    return true;
                } catch (error) {
                    console.error('Failed to switch channels, falling back to full reconnection:', error);
                    // Fall back to full disconnect/reconnect if switch fails
                    await this.disconnect();
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            
            // Check authentication first and ensure we have a valid token
            let finalAccessToken = this.authManager.getAccessToken();
            
            if (!this.authManager.isAuthenticated() || !finalAccessToken) {
                console.log('Need to authenticate...');
                const authResult = await this.authManager.authenticate();
                if (!authResult.success) {
                    vscode.window.showErrorMessage(`Authentication failed: ${authResult.error}`);
                    return false;
                }
                finalAccessToken = this.authManager.getAccessToken();
                
                if (!finalAccessToken) {
                    vscode.window.showErrorMessage('Failed to get access token after authentication');
                    return false;
                }
            }
            const config = vscode.workspace.getConfiguration('streamPortal');
            const username = config.get<string>('username', '');

            if (!username) {
                vscode.window.showErrorMessage('Please set your Twitch username in settings');
                return false;
            }

            
            // Validate token before attempting to connect
            console.log('Validating access token...');
            console.log('Token exists:', !!finalAccessToken);
            console.log('Token preview:', finalAccessToken ? `${finalAccessToken.substring(0, 8)}...` : 'null');
            
            const isValid = await this.authManager.validateCurrentToken();
            console.log('Token validation result:', isValid);
            
            if (!isValid) {
                vscode.window.showWarningMessage('Token validation failed, attempting to refresh...');
                try {
                    await this.authManager.refreshToken();
                    finalAccessToken = this.authManager.getAccessToken();
                    if (!finalAccessToken) {
                        vscode.window.showErrorMessage('Failed to refresh token');
                        return false;
                    }
                    console.log('Token refreshed successfully');
                } catch (error) {
                    console.error('Token refresh error:', error);
                    vscode.window.showErrorMessage('Token refresh failed, please re-authenticate');
                    return false;
                }
            }
            
            // Connect to IRC and wait for authentication
            vscode.window.showInformationMessage('Connecting to Twitch IRC...');
            await this.connectionManager.connect(finalAccessToken!, username);
            
            // Join the specified channel after successful connection
            vscode.window.showInformationMessage(`Joining channel: ${channel}`);
            await this.connectionManager.joinChannel(channel);
            this.currentChannel = channel;
            
            // Trigger state update for UI
            this.onConnectionStateHandlers.forEach(handler => {
                try {
                    handler(this.connectionManager.getConnectionState());
                } catch (error) {
                    console.error('Error in connection state handler:', error);
                }
            });
            
            vscode.window.showInformationMessage(`Connected to Twitch channel: ${cleanChannel}`);
            this.updateStatusBar();
            
            return true;
        }, 'channel connection', false) || false;
    }

    async disconnect(): Promise<void> {
        this.connectionManager.disconnect();
        this.currentChannel = '';
        this.updateStatusBar();
        vscode.window.showInformationMessage('Disconnected from Twitch chat');
    }

    async sendMessage(message: string): Promise<boolean> {
        return await withErrorHandling(async () => {
            // Validate message
            if (!message || !message.trim()) {
                throw new MessageError('Message cannot be empty.');
            }

            if (!this.isConnected()) {
                throw new ConnectionError('Not connected to Twitch chat', true);
            }

            if (!this.currentChannel) {
                throw new ChannelError('', 'No channel joined. Please connect to a channel first.');
            }

            // Send message to IRC
            this.connectionManager.sendMessage(this.currentChannel, message);
            
            // Create a local message object for our own message since Twitch doesn't echo it back
            const config = vscode.workspace.getConfiguration('streamPortal');
            const username = config.get<string>('username', '');
            
            if (username) {
                const selfMessage = {
                    id: `self_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                    channel: this.currentChannel,
                    username: username.toLowerCase(),
                    displayName: username,
                    message: message,
                    timestamp: new Date(),
                    badges: [],
                    emotes: [],
                    color: undefined,
                    userType: UserType.VIEWER,
                    isSelf: true
                };
                
                // Emit the message to handlers (UI)
                this.emitChatMessage(selfMessage);
            }
            
            return true;
        }, 'send message', false) || false;
    }

    async logout(): Promise<void> {
        await this.disconnect();
        await this.authManager.logout();
        this.updateStatusBar();
    }

    isConnected(): boolean {
        return this.connectionManager.isConnected();
    }

    isAuthenticated(): boolean {
        return this.authManager.isAuthenticated();
    }

    getCurrentChannel(): string {
        return this.currentChannel;
    }

    getConnectionState(): ConnectionState {
        return this.connectionManager.getConnectionState();
    }

    // Event listeners
    onChatMessage(handler: (message: ChatMessage) => void): void {
        this.onChatMessageHandlers.push(handler);
    }

    onConnectionStateChange(handler: (state: ConnectionState) => void): void {
        this.onConnectionStateHandlers.push(handler);
    }

    private setupStatusBar(): void {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right, 
            100
        );
        this.statusBarItem.command = 'streamPortal.connect';
        this.updateStatusBar();
        this.statusBarItem.show();
        this.context.subscriptions.push(this.statusBarItem);
    }

    private updateStatusBar(): void {
        const state = this.getConnectionState();
        
        switch (state) {
            case ConnectionState.CONNECTED:
                this.statusBarItem.text = `$(comment-discussion) Twitch: ${this.currentChannel}`;
                this.statusBarItem.tooltip = `Connected to ${this.currentChannel}`;
                this.statusBarItem.backgroundColor = undefined;
                break;
            case ConnectionState.CONNECTING:
            case ConnectionState.AUTHENTICATING:
                this.statusBarItem.text = `$(sync~spin) Twitch: Connecting...`;
                this.statusBarItem.tooltip = 'Connecting to Twitch...';
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                break;
            case ConnectionState.RECONNECTING:
                this.statusBarItem.text = `$(sync~spin) Twitch: Reconnecting...`;
                this.statusBarItem.tooltip = 'Reconnecting to Twitch...';
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                break;
            case ConnectionState.ERROR:
                this.statusBarItem.text = `$(error) Twitch: Error`;
                this.statusBarItem.tooltip = 'Twitch connection error';
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
                break;
            default:
                if (this.isAuthenticated()) {
                    this.statusBarItem.text = `$(comment-discussion) Twitch: Ready`;
                    this.statusBarItem.tooltip = 'Authenticated, ready to connect';
                } else {
                    this.statusBarItem.text = `$(comment-discussion) Twitch Chat`;
                    this.statusBarItem.tooltip = 'Click to connect to Twitch';
                }
                this.statusBarItem.backgroundColor = undefined;
                break;
        }
    }

    private setupConnectionHandlers(): void {
        // Handle IRC messages
        this.connectionManager.onMessage((ircMessage: IRCMessage) => {
            this.handleIRCMessage(ircMessage);
        });

        // Handle connection state changes
        this.connectionManager.onStateChange((state: ConnectionState) => {
            this.updateStatusBar();
            
            // Emit to external handlers
            this.onConnectionStateHandlers.forEach(handler => {
                try {
                    handler(state);
                } catch (error) {
                    console.error('Error in connection state handler:', error);
                }
            });
        });

        // Handle connection errors
        this.connectionManager.onError((error: Error) => {
            vscode.window.showErrorMessage(`Twitch connection error: ${error.message}`);
        });
    }

    private handleIRCMessage(ircMessage: IRCMessage): void {
        // Convert IRC PRIVMSG to ChatMessage
        if (this.protocolHandler.isPrivateMessage(ircMessage)) {
            const chatMessage = this.protocolHandler.parsePrivMsg(ircMessage);
            if (chatMessage) {
                this.emitChatMessage(chatMessage);
            }
        }

        // Handle other IRC messages as needed
        switch (ircMessage.command) {
            case 'JOIN':
                if (ircMessage.params.length > 0) {
                    console.log(`User joined: ${ircMessage.prefix} -> ${ircMessage.params[0]}`);
                }
                break;
            case 'PART':
                if (ircMessage.params.length > 0) {
                    console.log(`User left: ${ircMessage.prefix} -> ${ircMessage.params[0]}`);
                }
                break;
        }
    }

    private emitChatMessage(message: ChatMessage): void {
        this.onChatMessageHandlers.forEach(handler => {
            try {
                handler(message);
            } catch (error) {
                console.error('Error in chat message handler:', error);
            }
        });
    }

    dispose(): void {
        this.disconnect();
        this.statusBarItem.dispose();
    }
}