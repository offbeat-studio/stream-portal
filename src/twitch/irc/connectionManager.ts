import WebSocket from 'ws';
import { IRCProtocolHandler } from './ircProtocol';
import { ConnectionState, IRCMessage } from '../types/twitch';

export class IRCConnectionManager {
    private static readonly IRC_WEBSOCKET_URL = 'wss://irc-ws.chat.twitch.tv:443';
    private static readonly PING_INTERVAL = 5 * 60 * 1000; // 5 minutes
    private static readonly RECONNECT_DELAY = 5000; // 5 seconds

    private websocket: WebSocket | null = null;
    private protocolHandler: IRCProtocolHandler;
    private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
    private heartbeatTimer: NodeJS.Timeout | null = null;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private username: string = '';
    private accessToken: string = '';
    private joinedChannels: Set<string> = new Set();
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;

    // Event handlers
    private onMessageHandler?: (message: IRCMessage) => void;
    private onStateChangeHandler?: (state: ConnectionState) => void;
    private onErrorHandler?: (error: Error) => void;

    constructor() {
        this.protocolHandler = new IRCProtocolHandler();
    }

    async connect(token: string, username: string): Promise<void> {
        if (this.connectionState === ConnectionState.CONNECTING || 
            this.connectionState === ConnectionState.CONNECTED) {
            return;
        }

        this.accessToken = token;
        this.username = username.toLowerCase();
        
        try {
            this.setConnectionState(ConnectionState.CONNECTING);
            
            this.websocket = new WebSocket(IRCConnectionManager.IRC_WEBSOCKET_URL);
            this.setupWebSocketHandlers();
            
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, 10000);

                const onConnect = () => {
                    clearTimeout(timeout);
                    resolve();
                };

                const onError = (error: Error) => {
                    clearTimeout(timeout);
                    reject(error);
                };

                this.websocket!.once('open', onConnect);
                this.websocket!.once('error', onError);
            });
        } catch (error) {
            this.setConnectionState(ConnectionState.ERROR);
            throw error;
        }
    }

    disconnect(): void {
        this.clearTimers();
        this.reconnectAttempts = 0;
        
        if (this.websocket) {
            this.websocket.removeAllListeners();
            this.websocket.close();
            this.websocket = null;
        }
        
        this.joinedChannels.clear();
        this.setConnectionState(ConnectionState.DISCONNECTED);
    }

    async joinChannel(channel: string): Promise<void> {
        if (this.connectionState !== ConnectionState.CONNECTED) {
            throw new Error('Not connected to IRC');
        }

        const formattedChannel = channel.startsWith('#') ? channel : `#${channel}`;
        const joinMessage = this.protocolHandler.formatJoinMessage(formattedChannel);
        
        this.sendRawMessage(joinMessage);
        this.joinedChannels.add(formattedChannel);
    }

    async leaveChannel(channel: string): Promise<void> {
        if (this.connectionState !== ConnectionState.CONNECTED) {
            throw new Error('Not connected to IRC');
        }

        const formattedChannel = channel.startsWith('#') ? channel : `#${channel}`;
        const partMessage = this.protocolHandler.formatPartMessage(formattedChannel);
        
        this.sendRawMessage(partMessage);
        this.joinedChannels.delete(formattedChannel);
    }

    sendMessage(channel: string, message: string): void {
        if (this.connectionState !== ConnectionState.CONNECTED) {
            throw new Error('Not connected to IRC');
        }

        const privMsg = this.protocolHandler.formatPrivMsg(channel, message);
        this.sendRawMessage(privMsg);
    }

    getConnectionState(): ConnectionState {
        return this.connectionState;
    }

    getJoinedChannels(): string[] {
        return Array.from(this.joinedChannels);
    }

    isConnected(): boolean {
        return this.connectionState === ConnectionState.CONNECTED;
    }

    // Event handlers
    onMessage(handler: (message: IRCMessage) => void): void {
        this.onMessageHandler = handler;
    }

    onStateChange(handler: (state: ConnectionState) => void): void {
        this.onStateChangeHandler = handler;
    }

    onError(handler: (error: Error) => void): void {
        this.onErrorHandler = handler;
    }

    private setupWebSocketHandlers(): void {
        if (!this.websocket) {
            return;
        }

        this.websocket.on('open', () => {
            this.handleConnectionOpen();
        });

        this.websocket.on('message', (data) => {
            this.handleMessage(data.toString());
        });

        this.websocket.on('close', (code, reason) => {
            this.handleConnectionClose(code, reason.toString());
        });

        this.websocket.on('error', (error) => {
            this.handleConnectionError(error);
        });
    }

    private async handleConnectionOpen(): Promise<void> {
        try {
            this.setConnectionState(ConnectionState.AUTHENTICATING);
            
            // Send capability request
            const capReq = this.protocolHandler.formatCapabilityRequest();
            this.sendRawMessage(capReq);
            
            // Send authentication
            const authMessage = this.protocolHandler.formatAuthMessage(this.accessToken, this.username);
            this.sendRawMessage(authMessage);
            
            this.startHeartbeat();
            this.reconnectAttempts = 0;
            
        } catch (error) {
            this.handleConnectionError(error as Error);
        }
    }

    private handleMessage(data: string): void {
        // IRC messages are separated by CRLF and might contain multiple messages
        const messages = data.split('\r\n').filter(msg => msg.length > 0);
        
        for (const rawMessage of messages) {
            try {
                const ircMessage = this.protocolHandler.parseMessage(rawMessage);
                this.processIRCMessage(ircMessage);
                
                // Emit message to handlers
                if (this.onMessageHandler) {
                    this.onMessageHandler(ircMessage);
                }
            } catch (error) {
                console.error('Error parsing IRC message:', rawMessage, error);
            }
        }
    }

    private processIRCMessage(message: IRCMessage): void {
        switch (message.command) {
            case 'PING':
                // Respond to ping with pong
                if (message.params.length > 0) {
                    const pongMessage = this.protocolHandler.formatPongMessage(message.params[0]);
                    this.sendRawMessage(pongMessage);
                }
                break;

            case 'CAP':
                // Handle capability acknowledgment
                if (message.params.includes('ACK')) {
                    console.log('Capabilities acknowledged');
                }
                break;

            case '001': // RPL_WELCOME
                this.setConnectionState(ConnectionState.CONNECTED);
                console.log('Successfully connected to Twitch IRC');
                break;

            case '421': // ERR_UNKNOWNCOMMAND
                console.warn('Unknown command:', message.params);
                break;

            case 'JOIN':
                console.log('Joined channel:', message.params[0]);
                break;

            case 'PART':
                console.log('Left channel:', message.params[0]);
                break;

            case 'PRIVMSG':
                // Chat message - will be handled by message handler
                break;

            default:
                // Other IRC messages
                console.debug('IRC message:', message.command, message.params);
                break;
        }
    }

    private handleConnectionClose(code: number, reason: string): void {
        console.log(`WebSocket closed: ${code} ${reason}`);
        this.clearTimers();
        
        if (this.connectionState !== ConnectionState.DISCONNECTED) {
            this.setConnectionState(ConnectionState.DISCONNECTED);
            this.attemptReconnect();
        }
    }

    private handleConnectionError(error: Error): void {
        console.error('WebSocket error:', error);
        this.setConnectionState(ConnectionState.ERROR);
        
        if (this.onErrorHandler) {
            this.onErrorHandler(error);
        }
        
        this.attemptReconnect();
    }

    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }

        if (this.reconnectTimer) {
            return; // Already attempting reconnect
        }

        this.reconnectAttempts++;
        const delay = IRCConnectionManager.RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1);
        
        console.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
        
        this.setConnectionState(ConnectionState.RECONNECTING);
        
        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = null;
            
            try {
                await this.connect(this.accessToken, this.username);
                
                // Rejoin previously joined channels
                for (const channel of this.joinedChannels) {
                    await this.joinChannel(channel);
                }
            } catch (error) {
                console.error('Reconnection failed:', error);
                this.attemptReconnect();
            }
        }, delay);
    }

    private startHeartbeat(): void {
        this.clearHeartbeat();
        
        this.heartbeatTimer = setInterval(() => {
            if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                // Send a PING to keep connection alive
                this.sendRawMessage('PING :keepalive\r\n');
            }
        }, IRCConnectionManager.PING_INTERVAL);
    }

    private clearHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    private clearReconnectTimer(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    private clearTimers(): void {
        this.clearHeartbeat();
        this.clearReconnectTimer();
    }

    private sendRawMessage(message: string): void {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(message);
        } else {
            throw new Error('WebSocket is not connected');
        }
    }

    private setConnectionState(state: ConnectionState): void {
        if (this.connectionState !== state) {
            this.connectionState = state;
            
            if (this.onStateChangeHandler) {
                this.onStateChangeHandler(state);
            }
        }
    }
}