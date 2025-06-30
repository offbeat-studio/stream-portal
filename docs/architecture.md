# VSCode Twitch Chatroom Extension - 架構設計

## 系統架構圖

```mermaid
graph TB
    subgraph "VSCode Extension Host"
        A[extension.ts] --> B[Command Manager]
        A --> C[Configuration Manager]
        A --> D[Lifecycle Manager]
        
        B --> E[Commands/]
        E --> F[Connect Command]
        E --> G[Disconnect Command]
        E --> H[Settings Command]
        
        C --> I[User Settings]
        C --> J[Default Config]
        
        D --> K[Activate Handler]
        D --> L[Deactivate Handler]
    end
    
    subgraph "Development Tools"
        M[TypeScript Compiler] --> N[Webpack Bundler]
        N --> O[Extension Bundle]
        P[ESLint] --> Q[Code Quality]
        R[Mocha Tests] --> S[Test Reports]
    end
    
    subgraph "VSCode API"
        T[Commands API] --> B
        U[Configuration API] --> C
        V[Window API] --> W[Status Bar]
        X[Workspace API] --> Y[Settings Storage]
    end
    
    A --> T
    C --> U
    D --> V
    I --> X
```

## 模組依賴關係

```mermaid
graph LR
    A[package.json] --> B[TypeScript Config]
    B --> C[Webpack Config]
    C --> D[Extension Bundle]
    
    E[Extension Entry] --> F[Command Registry]
    E --> G[Config Manager]
    
    F --> H[Individual Commands]
    G --> I[Settings Schema]
    
    J[Test Suite] --> K[Extension Tester]
    K --> L[Integration Tests]
```

## 檔案結構規劃

```
vscode-twitch-chatroom/
├── src/
│   ├── extension.ts                 # 主要入口點
│   ├── commands/
│   │   ├── index.ts                # 命令匯出
│   │   ├── connect.ts              # 連線命令
│   │   ├── disconnect.ts           # 斷線命令
│   │   └── settings.ts             # 設定命令
│   ├── config/
│   │   ├── constants.ts            # 常數定義
│   │   └── defaults.ts             # 預設設定
│   ├── types/
│   │   └── extension.ts            # 類型定義
│   └── utils/
│       ├── logger.ts               # 日誌工具
│       └── validation.ts           # 驗證工具
├── test/
│   ├── suite/
│   │   ├── extension.test.ts       # 擴充套件測試
│   │   └── commands.test.ts        # 命令測試
│   └── runTest.ts                  # 測試執行器
├── docs/
│   ├── architecture.md             # 架構文件
│   └── development.md              # 開發指南
├── .vscode/
│   ├── launch.json                 # 除錯配置
│   ├── settings.json               # 工作區設定
│   └── tasks.json                  # 任務配置
├── package.json                    # 套件定義
├── tsconfig.json                   # TypeScript 配置
├── webpack.config.js               # 打包配置
├── .eslintrc.json                  # ESLint 規則
└── README.md                       # 專案說明
```

## 核心類別設計

```mermaid
classDiagram
    class Extension {
        +activate(context: ExtensionContext)
        +deactivate()
        -registerCommands()
        -initializeConfiguration()
    }
    
    class CommandManager {
        +registerCommand(id: string, handler: Function)
        +executeCommand(id: string, ...args: any[])
        +dispose()
    }
    
    class ConfigurationManager {
        +getConfiguration(key: string)
        +updateConfiguration(key: string, value: any)
        +onConfigurationChanged(listener: Function)
    }
    
    class BaseCommand {
        <<abstract>>
        +execute(context: ExtensionContext)
        #validate()
        #handleError(error: Error)
    }
    
    class ConnectCommand {
        +execute(context: ExtensionContext)
        -validateConnection()
    }
    
    class DisconnectCommand {
        +execute(context: ExtensionContext)
        -cleanupConnection()
    }
    
    Extension --> CommandManager
    Extension --> ConfigurationManager
    CommandManager --> BaseCommand
    BaseCommand <|-- ConnectCommand
    BaseCommand <|-- DisconnectCommand
```