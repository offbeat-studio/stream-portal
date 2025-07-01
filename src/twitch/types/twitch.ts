export interface TwitchConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string[];
}

export interface TokenData {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    scope: string[];
    tokenType: string;
    expiresAt: Date;
}

export interface IRCMessage {
    prefix?: string;
    command: string;
    params: string[];
    tags?: Record<string, string>;
    raw: string;
}

export interface ChatMessage {
    id: string;
    channel: string;
    username: string;
    displayName: string;
    message: string;
    timestamp: Date;
    badges: Badge[];
    emotes: Emote[];
    color?: string | undefined;
    userType: UserType;
    isSelf?: boolean;
}

export interface Badge {
    name: string;
    version: string;
}

export interface Emote {
    id: string;
    name: string;
    positions: EmotePosition[];
}

export interface EmotePosition {
    start: number;
    end: number;
}

export interface UserAction {
    type: 'join' | 'part';
    channel: string;
    username: string;
    timestamp: Date;
}

export enum UserType {
    VIEWER = 'viewer',
    SUBSCRIBER = 'subscriber',
    MODERATOR = 'moderator',
    VIP = 'vip',
    BROADCASTER = 'broadcaster'
}

export enum ConnectionState {
    DISCONNECTED = 'disconnected',
    CONNECTING = 'connecting',
    AUTHENTICATING = 'authenticating',
    CONNECTED = 'connected',
    ERROR = 'error',
    RECONNECTING = 'reconnecting'
}

export interface AuthResult {
    success: boolean;
    token?: TokenData;
    error?: string;
}

export interface TwitchChannelInfo {
    id: string;
    name: string;
    displayName: string;
    isLive: boolean;
    viewerCount?: number;
}