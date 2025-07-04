import * as vscode from 'vscode';
import { TwitchChatManager } from '../twitch/twitchChatManager';
import { ConnectionState, ChatMessage } from '../twitch/types/twitch';

export class ChatPanelProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'twitchChatroom.chatPanel';
    
    private _view?: vscode.WebviewView;
    private _extensionUri: vscode.Uri;
    private _chatManager: TwitchChatManager;
    private _disposables: vscode.Disposable[] = [];

    constructor(extensionUri: vscode.Uri, chatManager: TwitchChatManager) {
        this._extensionUri = extensionUri;
        this._chatManager = chatManager;
        
        // Listen for chat messages and connection state changes
        this._chatManager.onChatMessage((message) => this.handleChatMessage(message));
        this._chatManager.onConnectionStateChange((state) => this.handleConnectionStateChange(state));
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        this._disposables.push(
            webviewView.webview.onDidReceiveMessage(
                (message) => this.handleWebviewMessage(message)
            )
        );

        // Send initial state when webview is ready
        setTimeout(() => this.sendInitialState(), 100);
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'chatPanel.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'chatPanel.css')
        );

        const nonce = this.getNonce();

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' https://cdnjs.buymeacoffee.com 'unsafe-inline'; img-src ${webview.cspSource} https: data:; frame-src https:; connect-src https:;">
            <link href="${styleUri}" rel="stylesheet">
            <title>Twitch Chat</title>
        </head>
        <body>
            <div class="chat-container" data-vscode-theme-kind="${vscode.window.activeColorTheme.kind}">
                <!-- Header 區域 -->
                <header class="chat-header">
                    <div class="channel-info">
                        <span class="channel-name" id="channelName">Not connected</span>
                        <span class="viewer-count" id="viewerCount" style="display: none;"></span>
                    </div>
                    <div class="channel-switcher">
                        <div class="channel-input-container">
                            <input 
                                type="text" 
                                id="channelInput" 
                                class="channel-input" 
                                placeholder="Enter channel name..."
                                title="Enter a Twitch channel name and press Enter to connect"
                            />
                            <button class="btn-channel-go" id="btnChannelGo" title="Connect to channel">→</button>
                        </div>
                        <div class="recent-channels" id="recentChannels" style="display: none;">
                            <select class="channel-select" id="channelSelect">
                                <option value="">Recent channels...</option>
                            </select>
                        </div>
                    </div>
                    <div class="connection-status">
                        <span class="status-indicator disconnected" id="statusIndicator"></span>
                        <span class="status-text" id="statusText">Disconnected</span>
                    </div>
                    <div class="header-controls">
                        <button class="btn-info" id="btnInfo" title="Information">ℹ️</button>
                        <button class="btn-settings" id="btnSettings" title="Settings">⚙️</button>
                    </div>
                </header>

                <!-- 訊息區域 -->
                <main class="messages-container">
                    <div class="messages-list" id="messagesList" role="log" aria-live="polite" aria-label="Chat messages">
                        <!-- 歡迎訊息 -->
                        <div class="welcome-message">
                            <h3>Welcome to Twitch Chat!</h3>
                            <p>Connect to a Twitch channel to start chatting.</p>
                            <button class="btn-primary" id="btnWelcomeConnect">Connect to Twitch</button>
                        </div>
                    </div>
                    <div class="scroll-indicator" style="display: none;">
                        <button class="btn-scroll-bottom" id="btnScrollBottom">📍 Jump to bottom</button>
                    </div>
                </main>

                <!-- 輸入區域 -->
                <footer class="input-area">
                    <div class="input-container">
                        <textarea 
                            class="message-input" 
                            id="messageInput"
                            placeholder="Type a message..." 
                            maxlength="500"
                            rows="1"
                            disabled
                            style="resize: none;"
                        ></textarea>
                        <button class="btn-send" id="btnSend" disabled>Send</button>
                    </div>
                </footer>

                <!-- 設定面板 (可摺疊) -->
                <aside class="settings-panel hidden" id="settingsPanel">
                    <div class="settings-content">
                        <div class="settings-header">
                            <h3>Chat Settings</h3>
                            <button class="btn-close-settings" id="btnCloseSettings" title="Close settings">✕</button>
                        </div>
                        <div class="setting-group">
                            <h4>Display</h4>
                            <label>
                                <input type="range" min="12" max="20" value="14" id="fontSize">
                                Font Size: <span id="fontSizeValue">14px</span>
                            </label>
                            <label>
                                <input type="checkbox" id="showTimestamps" checked>
                                Show Timestamps
                            </label>
                            <label>
                                <input type="checkbox" id="showBadges" checked>
                                Show User Badges
                            </label>
                        </div>
                        <div class="setting-group">
                            <h4>Behavior</h4>
                            <label>
                                <input type="checkbox" id="autoScroll" checked>
                                Auto-scroll to new messages
                            </label>
                            <label>
                                <input type="checkbox" id="soundNotifications">
                                Sound notifications
                            </label>
                        </div>
                    </div>
                </aside>

                <!-- 資訊面板 (可摺疊) -->
                <aside class="info-panel hidden" id="infoPanel">
                    <div class="info-content">
                        <div class="info-header">
                            <h3>About</h3>
                            <button class="btn-close-info" id="btnCloseInfo" title="Close information">✕</button>
                        </div>
                        <div class="info-section">
                            <h4>VSCode Twitch Chatroom</h4>
                            <p>A VSCode extension for viewing and participating in Twitch chat directly within your editor.</p>
                        </div>
                        <div class="info-section">
                            <h4>Developer</h4>
                            <div class="info-links">
                                <a href="https://bento.me/musingfox" target="_blank" class="info-link" title="Nick Huang's Profile">
                                    📋 My Profile
                                </a>
                                <a href="https://buymeacoffee.com/musingfox" target="_blank" class="info-link bmc-link" title="Support Development">
                                    🍵 Buy me a tea
                                </a>
                                <a href="https://github.com/offbeat-studio/stream-portal/issues" target="_blank" class="info-link" title="Report Issues">
                                    🐛 Report Issues
                                </a>
                            </div>
                        </div>
                        <div class="info-section">
                            <h4>How to Use</h4>
                            <div class="tutorial-steps">
                                <div class="tutorial-step">
                                    <span class="step-number">1</span>
                                    <div class="step-content">
                                        <strong>Configure Twitch Settings</strong>
                                        <p>Go to VSCode Settings → Extensions → Twitch Chatroom and set your Twitch username, Client ID, and Client Secret.</p>
                                    </div>
                                </div>
                                <div class="tutorial-step">
                                    <span class="step-number">2</span>
                                    <div class="step-content">
                                        <strong>Connect to a Channel</strong>
                                        <p>Enter a channel name in the input box above and press Enter or click the → button to connect.</p>
                                    </div>
                                </div>
                                <div class="tutorial-step">
                                    <span class="step-number">3</span>
                                    <div class="step-content">
                                        <strong>Start Chatting</strong>
                                        <p>Once connected, type your message in the input box at the bottom and press Enter to send.</p>
                                    </div>
                                </div>
                                <div class="tutorial-step">
                                    <span class="step-number">4</span>
                                    <div class="step-content">
                                        <strong>Switch Channels</strong>
                                        <p>Use the channel input or recent channels dropdown to quickly switch between different streams.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="info-section">
                            <h4>Features</h4>
                            <ul class="info-features">
                                <li>Real-time Twitch chat integration</li>
                                <li>Quick channel switching</li>
                                <li>Customizable appearance</li>
                                <li>International keyboard support</li>
                                <li>Self-message display</li>
                            </ul>
                        </div>
                    </div>
                </aside>
            </div>
            
            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
    }

    private handleWebviewMessage(message: any) {
        switch (message.type) {
            case 'ready':
                this.sendInitialState();
                break;
            
            case 'connect':
                this.handleConnectRequest();
                break;
            
            case 'disconnect':
                this.handleDisconnectRequest();
                break;
            
            case 'sendMessage':
                this.handleSendMessage(message.text);
                break;
            
            
            case 'settingsChanged':
                this.handleSettingsChanged(message.settings);
                break;
            
            case 'connectToChannel':
                this.handleConnectToChannel(message.channel);
                break;
            
            case 'saveRecentChannels':
                this.handleSaveRecentChannels(message.channels);
                break;
            
            default:
                console.warn('Unknown message type:', message.type);
        }
    }

    private async handleConnectRequest() {
        try {
            // Ask user for channel name
            const channel = await vscode.window.showInputBox({
                prompt: 'Enter Twitch channel name to join',
                placeHolder: 'channelname',
                ignoreFocusOut: true
            }) || '';

            if (!channel) {
                return;
            }

            // Attempt to connect
            const success = await this._chatManager.connectToChannel(channel);
            if (success) {
                // Connection successful, UI will be updated via state change handlers
                console.log('Successfully connected to channel:', channel);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to connect: ${errorMessage}`);
        }
    }

    private async handleDisconnectRequest() {
        try {
            await this._chatManager.disconnect();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to disconnect: ${errorMessage}`);
        }
    }

    private async handleSendMessage(text: string) {
        try {
            if (!text || text.trim().length === 0) {
                return;
            }

            const success = await this._chatManager.sendMessage(text.trim());
            if (success) {
                this.postMessage({
                    type: 'messageSent',
                    success: true
                });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.postMessage({
                type: 'messageSent',
                success: false,
                error: errorMessage
            });
        }
    }


    private handleSettingsChanged(settings: any) {
        // Save settings to workspace configuration
        const config = vscode.workspace.getConfiguration('twitchChatroom');
        
        if (settings.fontSize) {
            config.update('fontSize', settings.fontSize, vscode.ConfigurationTarget.Global);
        }
        if (settings.showTimestamps !== undefined) {
            config.update('showTimestamps', settings.showTimestamps, vscode.ConfigurationTarget.Global);
        }
        if (settings.showBadges !== undefined) {
            config.update('showBadges', settings.showBadges, vscode.ConfigurationTarget.Global);
        }
        if (settings.autoScroll !== undefined) {
            config.update('autoScroll', settings.autoScroll, vscode.ConfigurationTarget.Global);
        }
        if (settings.soundNotifications !== undefined) {
            config.update('soundNotifications', settings.soundNotifications, vscode.ConfigurationTarget.Global);
        }
    }

    private async handleConnectToChannel(channel: string) {
        try {
            const success = await this._chatManager.connectToChannel(channel);
            if (success) {
                console.log('Successfully connected to channel:', channel);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to connect to ${channel}: ${errorMessage}`);
        }
    }

    private handleSaveRecentChannels(channels: string[]) {
        const config = vscode.workspace.getConfiguration('twitchChatroom');
        config.update('recentChannels', channels, vscode.ConfigurationTarget.Global);
    }

    private handleChatMessage(message: ChatMessage) {
        this.postMessage({
            type: 'newMessage',
            message: {
                id: message.id,
                channel: message.channel,
                username: message.username,
                displayName: message.displayName,
                message: message.message,
                timestamp: message.timestamp.toISOString(),
                badges: message.badges,
                emotes: message.emotes,
                color: message.color,
                userType: message.userType,
                isSelf: message.isSelf
            }
        });
    }

    private handleConnectionStateChange(state: ConnectionState) {
        const currentChannel = this._chatManager.getCurrentChannel();
        
        this.postMessage({
            type: 'connectionStateChanged',
            state: state,
            channel: currentChannel,
            isAuthenticated: this._chatManager.isAuthenticated()
        });
    }

    private sendInitialState() {
        const config = vscode.workspace.getConfiguration('twitchChatroom');
        const currentChannel = this._chatManager.getCurrentChannel();
        const connectionState = this._chatManager.getConnectionState();
        
        this.postMessage({
            type: 'initialState',
            state: {
                connectionState,
                channel: currentChannel,
                isAuthenticated: this._chatManager.isAuthenticated(),
                recentChannels: config.get('recentChannels', []),
                settings: {
                    fontSize: config.get('fontSize', 14),
                    showTimestamps: config.get('showTimestamps', true),
                    showBadges: config.get('showBadges', true),
                    autoScroll: config.get('autoScroll', true),
                    soundNotifications: config.get('soundNotifications', false)
                }
            }
        });
    }

    private postMessage(message: any) {
        if (this._view) {
            this._view.webview.postMessage(message);
        }
    }

    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    public dispose() {
        // Clean up resources
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];
    }
}