# VSCode Twitch Chatroom Extension 設定指南

## 🚀 快速開始

### 1. 註冊 Twitch 開發者應用程式

1. 前往 [Twitch Developer Console](https://dev.twitch.tv/console)
2. 登入你的 Twitch 帳號
3. 點擊 "Create App" 或 "Register Your Application"
4. 填寫應用程式資訊：
   - **Name**: `VSCode Twitch Chatroom` (或任何你喜歡的名稱)
   - **OAuth Redirect URLs**: `http://localhost:7777/auth/callback`
   - **Category**: `Application Integration`
5. 儲存應用程式並記下 **Client ID** 和 **Client Secret**

### 2. 配置 VSCode 設定

1. 開啟 VSCode
2. 按 `Ctrl+,` (Windows/Linux) 或 `Cmd+,` (Mac) 開啟設定
3. 搜尋 "twitch chatroom"
4. 設定以下項目：

   ```json
   {
     "twitchChatroom.clientId": "your_client_id_here",
     "twitchChatroom.clientSecret": "your_client_secret_here",
     "twitchChatroom.username": "your_twitch_username",
     "twitchChatroom.channel": "target_channel_name",
     "twitchChatroom.redirectUri": "http://localhost:7777/auth/callback"
   }
   ```

### 3. 使用擴充套件

1. 打開命令面板 (`Ctrl+Shift+P` 或 `Cmd+Shift+P`)
2. 輸入 "Twitch Chatroom: Connect to Twitch Chat"
3. 首次使用會開啟瀏覽器進行 OAuth 認證
4. 複製授權碼並貼回 VSCode
5. 連線成功後即可開始使用

## 📋 可用命令

| 命令 | 說明 |
|------|------|
| `Twitch Chatroom: Connect to Twitch Chat` | 連接到 Twitch 聊天室 |
| `Twitch Chatroom: Disconnect from Twitch Chat` | 斷開聊天室連線 |
| `Twitch Chatroom: Send Message to Chat` | 發送訊息到聊天室 |
| `Twitch Chatroom: Logout from Twitch` | 登出 Twitch 帳號 |

## ⚙️ 詳細設定說明

### 必要設定

- **clientId**: Twitch 應用程式的 Client ID
- **clientSecret**: Twitch 應用程式的 Client Secret
- **username**: 你的 Twitch 使用者名稱

### 選用設定

- **channel**: 預設要連接的頻道名稱
- **redirectUri**: OAuth 重定向 URI (預設: `http://localhost:7777/auth/callback`)
- **autoConnect**: 是否在擴充套件啟動時自動連線 (預設: false)

## 🔧 疑難排解

### 常見問題

**Q: 認證失敗怎麼辦？**
A:
1. 確認 Client ID 和 Client Secret 正確
2. 檢查 Redirect URI 是否與 Twitch 應用程式設定一致
3. 嘗試重新認證：`Twitch Chatroom: Logout from Twitch`

**Q: 無法連接到聊天室**
A:
1. 確認已完成 OAuth 認證
2. 檢查網路連線
3. 確認頻道名稱正確
4. 查看 VSCode 開發者工具的 Console 了解詳細錯誤

**Q: 狀態列顯示錯誤**
A:
1. 點擊狀態列項目重新連線
2. 檢查 Token 是否過期
3. 重新啟動 VSCode

### 除錯模式

1. 開啟 VSCode 開發者工具：`Help > Toggle Developer Tools`
2. 查看 Console 標籤頁的錯誤訊息
3. 搜尋以 `[Twitch]` 開頭的日誌

## 🔐 安全性注意事項

- **Client Secret 保護**: 不要將 Client Secret 分享給他人
- **Token 存儲**: 所有認證 Token 都安全地存儲在 VSCode 的加密存儲中
- **權限範圍**: 擴充套件只請求聊天相關權限 (`chat:read`, `chat:edit`)

## 🆘 取得幫助

如果遇到問題，請：

1. 查看本文件的疑難排解部分
2. 檢查 VSCode 輸出面板的錯誤訊息
3. 在 GitHub 建立 Issue 並提供詳細的錯誤資訊

## 📝 OAuth 流程說明

1. **授權請求**: 擴充套件開啟瀏覽器到 Twitch 授權頁面
2. **使用者授權**: 使用者登入並同意權限請求
3. **授權碼取得**: Twitch 重定向到指定 URI 並提供授權碼
4. **Token 交換**: 擴充套件使用授權碼交換 Access Token
5. **安全存儲**: Token 加密存儲在 VSCode 中
6. **自動刷新**: Token 過期時自動刷新

## 🎯 使用建議

- 第一次設定後，Token 會自動管理，無需重複認證
- 建議設定常用頻道名稱以快速連線
- 可以透過狀態列快速查看連線狀態
- 使用命令面板快速執行相關操作
