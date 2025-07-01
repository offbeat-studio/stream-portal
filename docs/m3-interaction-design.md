# M3 互動設計規範

## 使用者互動流程

### 主要使用情境

#### 情境 1: 首次使用者
```
開啟面板 → 看到歡迎畫面 → 點擊連線 → 輸入頻道 → OAuth 認證 → 開始聊天
```

#### 情境 2: 回訪使用者  
```
開啟面板 → 自動連線上次頻道 → 即時看到聊天 → 直接參與互動
```

#### 情境 3: 實況主使用
```
開始實況 → 開啟聊天面板 → 邊編碼邊查看觀眾互動 → 快速回應 → 專注開發
```

## 核心互動組件

### 1. 聊天訊息區域

#### 訊息項目設計
```
[時間] [徽章] 使用者名稱: 訊息內容 [表情符號]
14:30  [MOD] StreamerName: Hello everyone! 👋 Kappa
```

#### 互動功能
- **點擊使用者**: 顯示使用者資訊彈窗
- **右鍵選單**: 複製訊息、回覆、封鎖等
- **訊息懸停**: 顯示完整時間戳記
- **表情符號**: 點擊放大顯示

#### 滾動行為
```javascript
// 自動滾動邏輯
class AutoScroll {
  constructor(container) {
    this.container = container;
    this.isAutoScrollEnabled = true;
    this.scrollThreshold = 50; // 距離底部50px內才自動滾動
  }
  
  checkAutoScroll() {
    const { scrollTop, scrollHeight, clientHeight } = this.container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    this.isAutoScrollEnabled = distanceFromBottom <= this.scrollThreshold;
  }
  
  scrollToBottom() {
    if (this.isAutoScrollEnabled) {
      this.container.scrollTop = this.container.scrollHeight;
    }
  }
}
```

### 2. 訊息輸入區域

#### 輸入框功能
```html
<div class="input-container">
  <textarea 
    class="message-input" 
    placeholder="Type a message..." 
    maxlength="500"
    rows="1"
    style="resize: none;"
  ></textarea>
  <div class="input-counter">0/500</div>
  <button class="btn-send" disabled>Send</button>
</div>
```

#### 快捷鍵支援
- **Enter**: 發送訊息
- **Shift+Enter**: 換行
- **Ctrl+A**: 全選
- **↑/↓**: 瀏覽歷史訊息
- **Tab**: 自動完成 (使用者名稱、表情符號)

#### 輸入驗證
```javascript
class InputValidator {
  static validate(text) {
    const errors = [];
    
    if (!text || text.trim().length === 0) {
      errors.push('Message cannot be empty');
    }
    
    if (text.length > 500) {
      errors.push('Message too long (max 500 characters)');
    }
    
    if (text.includes('\n') && text.split('\n').length > 5) {
      errors.push('Too many lines (max 5)');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
```

### 3. 狀態指示器

#### 連線狀態顯示
```css
.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 8px;
  animation: pulse 2s infinite;
}

.status-indicator.connected {
  background-color: #4caf50;
}

.status-indicator.connecting {
  background-color: #ff9800;
  animation: pulse 1s infinite;
}

.status-indicator.disconnected {
  background-color: #f44336;
  animation: none;
}

.status-indicator.error {
  background-color: #f44336;
  animation: blink 0.5s infinite;
}
```

#### 訊息傳送狀態
```html
<div class="message-status">
  <span class="status sending">📤 Sending...</span>
  <span class="status sent">✅ Sent</span>
  <span class="status failed">❌ Failed</span>
</div>
```

### 4. 設定面板

#### 可調整選項
```html
<div class="settings-panel">
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
    <label>
      <input type="checkbox" id="mentionHighlight" checked>
      Highlight mentions
    </label>
  </div>
</div>
```

## 響應式設計

### 斷點系統
```css
/* 桌面版 (>= 1024px) */
@media (min-width: 1024px) {
  .chat-container {
    max-width: 400px;
  }
  
  .settings-panel {
    position: fixed;
    right: 0;
    top: 0;
    width: 300px;
  }
}

/* 平板版 (768px - 1023px) */
@media (min-width: 768px) and (max-width: 1023px) {
  .chat-container {
    max-width: 100%;
  }
  
  .settings-panel {
    position: absolute;
    right: 0;
    top: 50px;
    width: 250px;
  }
}

/* 手機版 (< 768px) */
@media (max-width: 767px) {
  .chat-header {
    flex-direction: column;
    padding: 8px;
  }
  
  .input-container {
    flex-direction: column;
  }
  
  .settings-panel {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
  }
}
```

### 觸控支援
```css
/* 增大觸控目標 */
@media (hover: none) and (pointer: coarse) {
  .btn-send,
  .btn-settings,
  .btn-disconnect {
    min-height: 44px;
    min-width: 44px;
  }
  
  .message-input {
    min-height: 44px;
    font-size: 16px; /* 防止 iOS 縮放 */
  }
}
```

## 效能優化

### 訊息列表虛擬化
```javascript
class VirtualizedMessageList {
  constructor(container, itemHeight = 60) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.visibleCount = Math.ceil(container.clientHeight / itemHeight) + 5;
    this.messages = [];
    this.startIndex = 0;
  }
  
  updateVisibleRange() {
    const scrollTop = this.container.scrollTop;
    this.startIndex = Math.floor(scrollTop / this.itemHeight);
    const endIndex = Math.min(
      this.startIndex + this.visibleCount, 
      this.messages.length
    );
    
    this.renderMessages(this.startIndex, endIndex);
  }
  
  renderMessages(start, end) {
    const fragment = document.createDocumentFragment();
    
    for (let i = start; i < end; i++) {
      const messageElement = this.createMessageElement(this.messages[i]);
      messageElement.style.transform = `translateY(${i * this.itemHeight}px)`;
      fragment.appendChild(messageElement);
    }
    
    this.container.innerHTML = '';
    this.container.appendChild(fragment);
  }
}
```

### 圖片與表情符號懶載入
```javascript
class LazyImageLoader {
  constructor() {
    this.observer = new IntersectionObserver(this.handleIntersection.bind(this));
  }
  
  observe(element) {
    this.observer.observe(element);
  }
  
  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.dataset.src;
        
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
          this.observer.unobserve(img);
        }
      }
    });
  }
}
```

## 無障礙設計

### 鍵盤導航
```javascript
class KeyboardNavigation {
  constructor(container) {
    this.container = container;
    this.focusableElements = [
      '.message-input',
      '.btn-send',
      '.btn-settings',
      '.message-item',
      '.setting-input'
    ];
  }
  
  handleKeydown(event) {
    switch (event.key) {
      case 'Tab':
        this.handleTabNavigation(event);
        break;
      case 'Escape':
        this.closeModals();
        break;
      case 'F6':
        this.cycleFocusAreas(event);
        break;
    }
  }
}
```

### ARIA 標籤
```html
<div class="chat-container" role="application" aria-label="Twitch Chat">
  <header class="chat-header" role="banner">
    <div class="connection-status" aria-live="polite" aria-atomic="true">
      <span class="status-text">Connected</span>
    </div>
  </header>
  
  <main class="messages-container" role="log" aria-live="polite" aria-label="Chat messages">
    <div class="messages-list" role="list">
      <!-- 訊息項目 -->
    </div>
  </main>
  
  <footer class="input-area" role="form" aria-label="Send message">
    <label for="messageInput" class="sr-only">Type your message</label>
    <textarea id="messageInput" aria-describedby="charCount"></textarea>
    <div id="charCount" aria-live="polite">0/500 characters</div>
  </footer>
</div>
```