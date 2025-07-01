# VSCode Twitch Chatroom 本地測試指南

## 快速開始

### 1. 啟動開發模式
```bash
# 確保編譯完成
npm run compile

# 在 VSCode 中按 F5 啟動 Extension Development Host
```

### 2. 基本測試 (無需 Twitch 設定)
在新的 VSCode 窗口中：
- 查看左側邊欄的 "Twitch Chat" 面板
- 測試命令：`Ctrl+Shift+P` → "Twitch Chatroom: Hello World"
- 檢查聊天面板的 UI 是否正確顯示

## 完整聊天功能測試

### 3. 建立 Twitch 應用程式
1. 前往 [Twitch Developers Console](https://dev.twitch.tv/console)
2. 登入你的 Twitch 帳號
3. 點擊 "Register Your Application"
4. 填寫以下資訊：
   - **Name**: VSCode Twitch Chatroom (或任何名稱)
   - **OAuth Redirect URLs**: `http://localhost:7777/auth/callback`
   - **Category**: Chat Bot
5. 點擊 "Create"
6. 記下 **Client ID** 和 **Client Secret**

### 4. 配置 VSCode 設定
在 Extension Development Host 窗口中：
1. 開啟設定：`Ctrl+,` (Windows/Linux) 或 `Cmd+,` (Mac)
2. 搜尋 "twitch"
3. 設定以下項目：
   ```
   Twitch Chatroom: Client Id: 你的_CLIENT_ID
   Twitch Chatroom: Client Secret: 你的_CLIENT_SECRET
   Twitch Chatroom: Username: 你的_TWITCH_用戶名
   Twitch Chatroom: Channel: 要加入的頻道名稱
   ```

### 5. 測試完整流程
1. **開啟聊天面板**：
   - `Ctrl+Shift+P` → "Show Chat Panel"

2. **連線到 Twitch**：
   - 在聊天面板中點擊 "Connect to Twitch" 按鈕
   - 或使用命令：`Ctrl+Shift+P` → "Connect to Twitch Chat"

3. **OAuth 認證**：
   - 瀏覽器會開啟 Twitch 授權頁面
   - 登入並授權應用程式
   - 認證成功後會自動連線到聊天室

4. **測試聊天功能**：
   - 觀察即時聊天訊息
   - 在輸入框中輸入訊息並發送
   - 測試設定面板功能

## 偵錯技巧

### 查看日誌
- **Extension Console**:
  - 在 Extension Development Host 中按 `Ctrl+Shift+I`
  - 查看 Console 分頁的錯誤訊息

- **Webview Console**:
  - 在聊天面板上右鍵 → "Inspect"
  - 查看 Webview 的 Console 日誌

### 常見問題

#### 1. 聊天面板不顯示
- 檢查左側邊欄是否有 "Twitch Chat" 項目
- 嘗試重新啟動 Extension Development Host (F5)

#### 2. OAuth 認證失敗
- 檢查 Client ID 和 Client Secret 是否正確
- 確認 Redirect URL 設定為 `http://localhost:7777/auth/callback`
- 檢查 Twitch 應用程式狀態是否為 Active

#### 3. 無法連線聊天室
- 檢查網路連線
- 確認頻道名稱正確 (不需要 # 前綴)
- 查看 Extension Console 的錯誤訊息

#### 4. 訊息不顯示
- 檢查 Webview Console 是否有錯誤
- 確認聊天室有足夠的活動
- 測試發送訊息功能

### 測試不同情境

#### 測試連線狀態
- 正常連線
- 網路中斷後的重連
- Token 過期處理
- 聊天室離線狀態

#### 測試 UI 功能
- 不同主題 (明亮/暗色)
- 視窗大小調整
- 設定變更
- 大量訊息滾動

#### 測試 Twitch 功能
- 不同類型用戶 (一般/MOD/SUB/VIP)
- 表情符號顯示
- 徽章顯示
- 特殊訊息格式

## 效能測試

### 記憶體使用
- 長時間運行 (1小時以上)
- 大量訊息處理
- 多次連線/斷線

### CPU 使用率
- 活躍聊天室
- 動畫效果
- 滾動效能

## 重新載入擴充套件

當你修改程式碼後：
1. 在原始 VSCode 窗口中重新編譯：`npm run compile`
2. 在 Extension Development Host 中重新載入：
   - `Ctrl+Shift+P` → "Developer: Reload Window"
   - 或直接重新啟動 (關閉後再按 F5)

## 打包測試

如果想測試打包後的擴充套件：
```bash
# 安裝 vsce (如果還沒有)
npm install -g @vscode/vsce

# 打包擴充套件
npm run package

# 會產生 .vsix 檔案，可以手動安裝測試
```
