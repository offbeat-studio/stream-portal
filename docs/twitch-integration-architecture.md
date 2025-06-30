# Twitch 整合架構設計

## 系統架構圖

```mermaid
graph TB
    subgraph "VSCode Extension"
        A[TwitchChatManager] --> B[AuthManager]
        A --> C[IRCConnectionManager]
        A --> D[MessageHandler]
        A --> E[ChatUI]
        
        B --> F[OAuthFlow]
        B --> G[TokenManager]
        
        C --> H[WebSocketClient]
        C --> I[IRCProtocolHandler]
        C --> J[ConnectionState]
        
        D --> K[MessageParser]
        D --> L[MessageQueue]
        D --> M[EventEmitter]
        
        E --> N[WebviewProvider]
        E --> O[StatusBarManager]
    end
    
    subgraph "Twitch Services"
        P[OAuth Authorization Server]
        Q[IRC WebSocket Server]
        R[Twitch API]
    end
    
    F --> P
    H --> Q
    G --> R
    
    subgraph "VSCode APIs"
        S[Extension Context]
        T[WebView API]
        U[Configuration API]
        V[Status Bar API]
    end
    
    A --> S
    E --> T
    B --> U
    O --> V
```

## 核心組件設計

### 1. AuthManager - 認證管理器

```mermaid
classDiagram
    class AuthManager {
        -tokenManager: TokenManager
        -oauthFlow: OAuthFlow
        +authenticate(): Promise~AuthResult~
        +isAuthenticated(): boolean
        +getAccessToken(): string | null
        +refreshToken(): Promise~void~
        +logout(): void
    }
    
    class TokenManager {
        -accessToken: string | null
        -refreshToken: string | null
        -expiresAt: Date | null
        +storeTokens(tokens: TokenData): void
        +getStoredTokens(): TokenData | null
        +isTokenExpired(): boolean
        +clearTokens(): void
    }
    
    class OAuthFlow {
        -clientId: string
        -redirectUri: string
        -scopes: string[]
        +startFlow(): Promise~string~
        +exchangeCodeForTokens(code: string): Promise~TokenData~
        +refreshAccessToken(refreshToken: string): Promise~TokenData~
    }
    
    AuthManager --> TokenManager
    AuthManager --> OAuthFlow
```

### 2. IRCConnectionManager - IRC 連線管理器

```mermaid
classDiagram
    class IRCConnectionManager {
        -websocket: WebSocket | null
        -protocolHandler: IRCProtocolHandler
        -connectionState: ConnectionState
        -heartbeat: NodeJS.Timer | null
        +connect(token: string, username: string): Promise~void~
        +disconnect(): void
        +joinChannel(channel: string): Promise~void~
        +sendMessage(channel: string, message: string): void
        +getConnectionState(): ConnectionState
    }
    
    class IRCProtocolHandler {
        +parseMessage(rawMessage: string): IRCMessage
        +formatAuthMessage(token: string, username: string): string
        +formatJoinMessage(channel: string): string
        +formatPrivMsg(channel: string, message: string): string
        +handleCapabilities(): string[]
    }
    
    class ConnectionState {
        <<enumeration>>
        DISCONNECTED
        CONNECTING
        AUTHENTICATING
        CONNECTED
        ERROR
        RECONNECTING
    }
    
    IRCConnectionManager --> IRCProtocolHandler
    IRCConnectionManager --> ConnectionState
```

### 3. MessageHandler - 訊息處理器

```mermaid
classDiagram
    class MessageHandler {
        -messageQueue: MessageQueue
        -eventEmitter: EventEmitter
        -parser: MessageParser
        +handleIncomingMessage(rawMessage: string): void
        +sendMessage(channel: string, message: string): Promise~void~
        +onMessage(callback: Function): void
        +onUserJoin(callback: Function): void
        +onUserPart(callback: Function): void
    }
    
    class MessageParser {
        +parsePrivMsg(message: IRCMessage): ChatMessage
        +parseJoinPart(message: IRCMessage): UserAction
        +parseTags(tags: string): MessageTags
        +extractEmotes(message: string): Emote[]
    }
    
    class MessageQueue {
        -queue: ChatMessage[]
        -rateLimiter: RateLimiter
        +enqueue(message: ChatMessage): void
        +dequeue(): ChatMessage | null
        +processQueue(): void
        +getRemainingCapacity(): number
    }
    
    MessageHandler --> MessageParser
    MessageHandler --> MessageQueue
```

## 資料結構定義

```typescript
interface TwitchConfig {
    clientId: string;
    redirectUri: string;
    scopes: string[];
    channel: string;
    username: string;
    autoConnect: boolean;
}

interface TokenData {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    scope: string[];
    tokenType: string;
}

interface IRCMessage {
    prefix?: string;
    command: string;
    params: string[];
    tags?: Record<string, string>;
}

interface ChatMessage {
    id: string;
    channel: string;
    username: string;
    displayName: string;
    message: string;
    timestamp: Date;
    badges: Badge[];
    emotes: Emote[];
    color?: string;
    userType: UserType;
}

interface UserAction {
    type: 'join' | 'part';
    channel: string;
    username: string;
    timestamp: Date;
}

enum UserType {
    VIEWER = 'viewer',
    SUBSCRIBER = 'subscriber',
    MODERATOR = 'moderator',
    VIP = 'vip',
    BROADCASTER = 'broadcaster'
}
```

## 錯誤處理策略

```mermaid
flowchart TD
    A[連線錯誤] --> B{錯誤類型}
    B -->|認證失效| C[重新認證]
    B -->|網路中斷| D[自動重連]
    B -->|速率限制| E[延遲重試]
    B -->|伺服器錯誤| F[指數退避重連]
    
    C --> G[重新 OAuth 流程]
    D --> H[WebSocket 重連]
    E --> I[等待冷卻時間]
    F --> J[增加重連間隔]
    
    G --> K[更新 Token]
    H --> L[重建連線]
    I --> L
    J --> L
    
    L --> M{重連成功?}
    M -->|是| N[恢復正常]
    M -->|否| O[顯示錯誤狀態]
```

## 安全性考量

### Token 安全存儲
- 使用 VSCode SecretStorage API
- Token 加密存儲
- 定期檢查 Token 有效性

### 速率限制處理
- 實作智能訊息佇列
- 監控 API 使用限制
- 預防性限流機制

### 用戶隱私
- 不記錄敏感訊息
- 可配置的資料保留策略
- 符合 Twitch 服務條款

## 效能優化

### 連線管理
- WebSocket 連線池
- 自動心跳維持
- 智能重連策略

### 訊息處理
- 非同步訊息處理
- 批次處理機制
- 記憶體使用優化