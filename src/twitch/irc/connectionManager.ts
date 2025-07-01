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
    
    // Performance optimization: debounce rapid reconnection attempts
    private lastReconnectAttempt: number = 0;
    private static readonly MIN_RECONNECT_INTERVAL = 1000; // 1 second minimum between attempts

    // Event handlers
    private onMessageHandler?: (message: IRCMessage) => void;
    private onStateChangeHandler?: (state: ConnectionState) => void;
    private onErrorHandler?: (error: Error) => void;

    // Connection promise handlers
    private connectionResolve: (() => void) | undefined;
    private connectionReject: ((error: Error) => void) | undefined;
    private connectionTimeout: NodeJS.Timeout | undefined;

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
                    reject(new Error('IRC connection timeout - failed to authenticate'));
                }, 30000); // Increase timeout to 30 seconds

                // Store resolve/reject for later use
                this.connectionResolve = resolve;
                this.connectionReject = reject;
                this.connectionTimeout = timeout;

                this.websocket!.once('error', (error) => {
                    this.cleanupConnectionPromise();
                    reject(new Error(`WebSocket error: ${error.message}`));
                });
            });
        } catch (error) {
            this.setConnectionState(ConnectionState.ERROR);
            throw error;
        }
    }

    disconnect(): void {
        this.clearTimers();
        this.cleanupConnectionPromise();
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

    async switchToChannel(newChannel: string): Promise<void> {
        if (this.connectionState !== ConnectionState.CONNECTED) {
            throw new Error('Not connected to IRC');
        }

        // Leave all current channels
        const currentChannels = Array.from(this.joinedChannels);
        for (const channel of currentChannels) {
            await this.leaveChannel(channel);
        }

        // Join new channel
        await this.joinChannel(newChannel);
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
            console.log('WebSocket connection opened, starting IRC authentication...');
            console.log('Token length:', this.accessToken.length);
            console.log('Username:', this.username);
            this.setConnectionState(ConnectionState.AUTHENTICATING);
            
            // Send authentication first (PASS and NICK)
            const passMessage = `PASS oauth:${this.accessToken}\r\n`;
            const nickMessage = `NICK ${this.username}\r\n`;
            
            console.log('Sending PASS message...');
            this.sendRawMessage(passMessage);
            
            console.log('Sending NICK message for user:', this.username);
            this.sendRawMessage(nickMessage);
            
            // Then send capability request
            const capReq = this.protocolHandler.formatCapabilityRequest();
            console.log('Sending capability request:', capReq.trim());
            this.sendRawMessage(capReq);
            
            this.startHeartbeat();
            this.reconnectAttempts = 0;
            
        } catch (error) {
            console.error('Error during connection open:', error);
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
        console.log('Processing IRC message:', message.command, message.params);
        
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
                
                // Resolve the connection promise
                if (this.connectionResolve) {
                    const resolve = this.connectionResolve;
                    this.cleanupConnectionPromise();
                    resolve();
                }
                break;

            case '421': // ERR_UNKNOWNCOMMAND
                console.warn('Unknown command:', message.params);
                break;

            case 'NOTICE':
                // Authentication or general notices
                console.log('IRC NOTICE:', message.params);
                if (message.params.some(p => p.includes('Login authentication failed') || p.includes('Login unsuccessful'))) {
                    console.error('IRC authentication failed - check token and username');
                    if (this.connectionReject) {
                        const reject = this.connectionReject;
                        this.cleanupConnectionPromise();
                        reject(new Error('IRC authentication failed - invalid token or username'));
                    }
                }
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
                // Other IRC messages - log all for debugging
                console.log('Other IRC message:', message.command, message.params, message.prefix);
                break;
        }
    }

    private handleConnectionClose(code: number, reason: string): void {
        console.log(`WebSocket closed: ${code} ${reason}`);
        this.clearTimers();
        
        // Handle specific close codes
        let errorMessage = '';
        switch (code) {
            case 1006:
                errorMessage = 'Connection closed abnormally - possibly authentication failed';
                break;
            case 1002:
                errorMessage = 'Connection closed due to protocol error';
                break;
            case 1003:
                errorMessage = 'Connection closed due to invalid data';
                break;
            default:
                errorMessage = `Connection closed with code ${code}: ${reason}`;
        }
        
        console.log('Connection close reason:', errorMessage);
        
        // If we have a pending connection promise and this is an authentication failure
        if (this.connectionReject && code === 1006) {
            const reject = this.connectionReject;
            this.cleanupConnectionPromise();
            reject(new Error(errorMessage));
            return;
        }
        
        if (this.connectionState !== ConnectionState.DISCONNECTED) {
            this.setConnectionState(ConnectionState.DISCONNECTED);
            this.attemptReconnect();
        }
    }

    private handleConnectionError(error: Error): void {
        console.error('WebSocket error:', error);
        this.setConnectionState(ConnectionState.ERROR);
        
        // Reject connection promise if still pending
        if (this.connectionReject) {
            const reject = this.connectionReject;
            this.cleanupConnectionPromise();
            reject(error);
        }
        
        if (this.onErrorHandler) {
            this.onErrorHandler(error);
        }
        
        this.attemptReconnect();
    }

    private attemptReconnect(): void {
        // Performance optimization: prevent rapid reconnection attempts
        const now = Date.now();
        if (now - this.lastReconnectAttempt < IRCConnectionManager.MIN_RECONNECT_INTERVAL) {
            console.log('Reconnection attempt too soon, skipping');
            return;
        }
        this.lastReconnectAttempt = now;

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.setConnectionState(ConnectionState.ERROR);
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

    private cleanupConnectionPromise(): void {
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
        }
        this.connectionTimeout = undefined;
        this.connectionResolve = undefined;
        this.connectionReject = undefined;
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