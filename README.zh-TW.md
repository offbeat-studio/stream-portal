# StreamPortal - VSCode Twitch 聊天擴充套件

> **[English Version](README.md)** | **[AI 開發指南](CLAUDE.md)**

一個強大的 VSCode 擴充套件，將 Twitch 聊天功能無縫整合到您的開發環境中。非常適合希望在編程時與觀眾互動的實況主，無需在應用程式之間切換。

## ✨ 功能特色

- 🔐 **安全的 OAuth 2.0 認證** - 安全可靠的 Twitch 整合
- 💬 **即時聊天整合** - 連接到任何 Twitch 頻道聊天室
- 🔄 **智慧頻道切換** - 輕鬆在多個頻道之間切換
- 📱 **Webview 聊天面板** - VSCode 內專用聊天介面
- 📊 **連線狀態顯示** - 狀態列即時連線狀態
- 🔄 **自動重連** - 具有指數退避的穩定連線
- ⚡ **效能優化** - 記憶體高效，支援訊息批次處理
- 🎨 **主題整合** - 無縫適配您的 VSCode 主題
- 🔧 **全面配置** - 豐富的自訂選項

## 🚀 快速開始

### 1. 安裝擴充套件

從 VSCode 市集安裝或從 GitHub 下載最新版本。

### 2. 設定 Twitch 應用程式

1. 造訪 [Twitch 開發者控制台](https://dev.twitch.tv/console)
2. 建立新應用程式，使用以下設定：
   - **名稱**：您的選擇（例如："VSCode StreamPortal"）
   - **OAuth 重新導向 URLs**：`http://localhost:7777/auth/callback`
   - **類別**：開發者工具
3. 儲存您的 **Client ID** 和 **Client Secret**

### 3. 配置擴充套件

開啟 VSCode 設定（`Ctrl+,` 或 `Cmd+,`）並配置 StreamPortal：

```json
{
  "streamPortal.username": "您的_twitch_使用者名稱",
  "streamPortal.clientId": "您的_client_id",
  "streamPortal.clientSecret": "您的_client_secret",
  "streamPortal.redirectUri": "http://localhost:7777/auth/callback"
}
```

### 4. 開始使用 StreamPortal

1. **開啟聊天面板**：檢視 → StreamPortal Chat
2. **身份驗證**：在聊天面板中點擊「使用 Twitch 驗證」
3. **連接頻道**：輸入頻道名稱並點擊「連接」
4. **開始聊天**：直接從 VSCode 發送訊息！🎉

## 📋 可用指令

透過命令選擇器（`Ctrl+Shift+P` 或 `Cmd+Shift+P`）存取這些指令：

| 指令 | 說明 |
|------|------|
| `StreamPortal: Connect to Channel` | 連接到特定的 Twitch 頻道 |
| `StreamPortal: Disconnect` | 從目前聊天室斷線 |
| `StreamPortal: Send Message` | 向目前頻道發送訊息 |
| `StreamPortal: Logout` | 登出並清除身份驗證 |

## 🎛️ 聊天面板功能

**StreamPortal Chat** 面板提供：

- **即時訊息顯示**：即時查看聊天訊息
- **頻道切換器**：快速下拉選單切換頻道
- **訊息輸入**：使用 Enter 鍵發送訊息
- **連線控制**：身份驗證、連接和斷線按鈕
- **狀態指示器**：連線狀態的視覺回饋
- **響應式設計**：適應不同面板大小

### 面板控制

- **身份驗證**：點擊「使用 Twitch 驗證」進行 OAuth 流程
- **頻道連線**：從下拉選單選擇頻道或輸入新頻道
- **發送訊息**：在輸入欄位中輸入並按 Enter
- **設定**：配置偏好設定和查看狀態

## ⚙️ 配置選項

| 設定 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `streamPortal.username` | string | "" | 您的 Twitch 使用者名稱（必填） |
| `streamPortal.clientId` | string | "" | Twitch 應用程式 Client ID（必填） |
| `streamPortal.clientSecret` | string | "" | Twitch 應用程式 Client Secret（必填） |
| `streamPortal.redirectUri` | string | "http://localhost:7777/auth/callback" | OAuth 重新導向 URI |
| `streamPortal.autoConnect` | boolean | false | 啟動時自動連接到上次頻道 |
| `streamPortal.recentChannels` | array | [] | 最近連接的頻道清單 |

## 🏗️ 架構

StreamPortal 遵循模組化架構，清楚分離關注點：

```
┌─────────────────────────────────────────────────────────────┐
│                   StreamPortal 擴充套件                      │
├─────────────────┬───────────────────┬─────────────────────┤
│      身份驗證    │     IRC 連線      │     UI 整合         │
│                 │                   │                     │
│ • OAuth 2.0     │ • WebSocket IRC   │ • Webview 面板      │
│ • Token 管理    │ • 自動重連        │ • 命令選擇器        │
│ • 安全儲存      │ • 頻道管理        │ • 狀態列           │
│ • 驗證         │ • 訊息解析        │ • 主題支援          │
└─────────────────┴───────────────────┴─────────────────────┘
```

### 核心元件

- **TwitchChatManager**：所有聊天功能的中央協調器
- **AuthManager**：OAuth 2.0 身份驗證和 token 生命週期管理
- **IRCConnectionManager**：與 Twitch IRC 伺服器的 WebSocket 連線
- **IRCProtocolHandler**：IRC 訊息解析與 Twitch 特定功能
- **ChatPanelProvider**：Webview UI 管理和使用者互動
- **ErrorHandler**：集中式錯誤管理和使用者回饋

## 🔐 安全性與隱私

- **安全 Token 儲存**：所有身份驗證 token 使用 VSCode SecretStorage 儲存
- **OAuth 2.0 合規**：業界標準身份驗證，具 CSRF 保護
- **最小權限**：僅請求必要範圍（`chat:read`、`chat:edit`）
- **無資料收集**：擴充套件不收集或傳輸個人資料
- **安全連線**：所有網路通訊透過 HTTPS/WSS

## 🧪 測試與品質

StreamPortal 包含完整的測試基礎設施：

- **單元測試**：個別元件測試，覆蓋率 96%+
- **整合測試**：端到端工作流程驗證
- **Mock 系統**：WebSocket 和 VSCode API 模擬
- **效能測試**：記憶體使用和連線穩定性
- **錯誤處理**：全面的錯誤場景覆蓋

執行測試：`npm test`

## 🔧 開發

### 前置條件

- Node.js 18+ 和 npm
- VSCode 1.85.0+
- TypeScript 5.3+

### 設定開發環境

```bash
# 複製儲存庫
git clone https://github.com/yourusername/vscode-twitch-chatroom.git
cd vscode-twitch-chatroom

# 安裝相依套件
npm install

# 編譯 TypeScript
npm run compile

# 執行測試
npm test

# 啟動擴充套件開發主機
npm run dev
# 或在 VSCode 中按 F5
```

### 專案結構

```
src/
├── core/                    # 核心工具和錯誤處理
├── commands/               # VSCode 命令實作
├── twitch/                # Twitch 整合模組
│   ├── auth/              # 身份驗證系統
│   ├── irc/               # IRC 協定實作
│   └── types/             # TypeScript 定義
├── ui/                    # 使用者介面元件
└── extension.ts           # 主要擴充套件進入點

tests/                     # 完整測試套件
├── unit/                  # 單元測試
├── integration/           # 整合測試
└── helpers/               # 測試工具和 mock

media/                     # 前端資源
├── chatPanel.js          # Webview 前端
└── styles.css           # UI 樣式
```

### 建置指令

```bash
npm run compile      # 編譯 TypeScript
npm run lint         # 執行 ESLint
npm run test         # 執行測試套件
npm run package      # 建立 .vsix 套件
```

## 🐛 疑難排解

### 常見問題

#### 身份驗證問題
- **憑證無效**：在 Twitch 開發者控制台中驗證 Client ID 和 Secret
- **重新導向 URI 不符**：確保重新導向 URI 完全符合：`http://localhost:7777/auth/callback`
- **OAuth 逾時**：嘗試登出並重新驗證

#### 連線問題
- **網路問題**：檢查網際網路連線和防火牆設定
- **無效頻道**：驗證頻道名稱存在且可存取
- **頻率限制**：等待幾分鐘後再嘗試重新連線

#### 效能問題
- **記憶體使用**：擴充套件自動管理記憶體，具訊息限制
- **回應緩慢**：檢查 VSCode 開發者工具控制台是否有錯誤
- **UI 問題**：嘗試重新載入 webview 面板

### 除錯步驟

1. **檢查擴充套件輸出**：檢視 → 輸出 → StreamPortal
2. **開啟開發者工具**：說明 → 切換開發者工具
3. **驗證配置**：檢查所有必要設定是否已配置
4. **測試網路**：確保可存取 Twitch.tv
5. **重新啟動擴充套件**：重新載入 VSCode 視窗

### 獲得協助

- 📖 **文件**：查看 [CLAUDE.md](CLAUDE.md) 取得技術詳情
- 🐞 **錯誤報告**：在 GitHub 上開啟 issue 並提供詳細資訊
- 💡 **功能要求**：透過 GitHub issues 建議改進
- 🔧 **配置協助**：參閱上述配置範例

## 🗺️ 路線圖

- [x] **M1**：VSCode 擴充套件基礎設施和基本功能
- [x] **M2**：Twitch IRC 整合與 OAuth 身份驗證
- [x] **M3**：互動式 webview 聊天 UI 和使用者體驗
- [x] **M4**：效能優化和全面測試
- [ ] **M5**：VSCode 市集發布和文件
- [ ] **未來**：進階功能（審核工具、聊天指令、主題）

## 🤝 貢獻

我們歡迎貢獻！請查看我們的[貢獻指南](CONTRIBUTING.md)了解詳情。

### 開發流程

1. Fork 儲存庫
2. 建立功能分支（`git checkout -b feature/amazing-feature`）
3. 進行變更並加入測試
4. 確保所有測試通過（`npm test`）
5. 提交變更（`git commit -m 'Add amazing feature'`）
6. 推送到分支（`git push origin feature/amazing-feature`）
7. 開啟 Pull Request

## 📄 授權

此專案採用 MIT 授權 - 詳見 [LICENSE](LICENSE) 檔案。

## 🙏 致謝

- **Twitch**：提供 IRC 介面和開發者 API
- **VSCode 團隊**：優秀的擴充套件開發平台
- **社群**：回饋、測試和貢獻

## 📞 支援

- **文件**：[CLAUDE.md](CLAUDE.md) 提供完整技術詳情
- **問題**：[GitHub Issues](https://github.com/yourusername/vscode-twitch-chatroom/issues)
- **討論**：[GitHub Discussions](https://github.com/yourusername/vscode-twitch-chatroom/discussions)

---

**快樂實況和編程！** 🎮💻✨

*用 ❤️ 為實況開發者社群製作*