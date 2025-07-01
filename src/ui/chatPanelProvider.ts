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
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https: data:;">
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
                    <div class="connection-status">
                        <span class="status-indicator disconnected" id="statusIndicator"></span>
                        <span class="status-text" id="statusText">Disconnected</span>
                    </div>
                    <div class="header-controls">
                        <button class="btn-settings" id="btnSettings" title="Settings">⚙️</button>
                        <button class="btn-connect" id="btnConnect" title="Connect">🔌</button>
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
                        <div class="input-counter" id="inputCounter">0/500</div>
                        <button class="btn-send" id="btnSend" disabled>Send</button>
                    </div>
                    <div class="quick-actions">
                        <button class="btn-emote" id="btnEmote" title="Emotes" disabled>😊</button>
                        <button class="btn-clear" id="btnClear" title="Clear chat">🗑️</button>
                    </div>
                </footer>

                <!-- 設定面板 (可摺疊) -->
                <aside class="settings-panel hidden" id="settingsPanel">
                    <div class="settings-content">
                        <h3>Chat Settings</h3>
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
            
            case 'clearChat':
                this.handleClearChat();
                break;
            
            case 'settingsChanged':
                this.handleSettingsChanged(message.settings);
                break;
            
            default:
                console.warn('Unknown message type:', message.type);
        }
    }

    private async handleConnectRequest() {
        try {
            // Get channel from configuration or ask user
            const config = vscode.workspace.getConfiguration('twitchChatroom');
            let channel = config.get<string>('channel', '');

            if (!channel) {
                channel = await vscode.window.showInputBox({
                    prompt: 'Enter Twitch channel name to join',
                    placeHolder: 'channelname',
                    ignoreFocusOut: true
                }) || '';

                if (!channel) {
                    return;
                }

                // Save channel to settings for future use
                await config.update('channel', channel, vscode.ConfigurationTarget.Global);
            }

            // Attempt to connect
            await this._chatManager.connectToChannel(channel);
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

    private handleClearChat() {
        this.postMessage({
            type: 'clearMessages'
        });
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
                userType: message.userType
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