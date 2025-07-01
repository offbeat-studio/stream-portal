// Webview Script for Twitch Chat Panel
(function() {
    'use strict';

    // Get VS Code API
    const vscode = acquireVsCodeApi();
    
    // DOM Elements
    let elements = {};
    
    // State
    let state = {
        connectionState: 'disconnected',
        channel: '',
        isAuthenticated: false,
        messages: [],
        settings: {
            fontSize: 14,
            showTimestamps: true,
            showBadges: true,
            autoScroll: true,
            soundNotifications: false
        },
        isAutoScrollEnabled: true,
        messageHistory: [],
        historyIndex: -1,
        recentChannels: []
    };

    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        initializeElements();
        setupEventListeners();
        notifyReady();
    });

    function initializeElements() {
        elements = {
            // Header elements
            channelName: document.getElementById('channelName'),
            viewerCount: document.getElementById('viewerCount'),
            channelInput: document.getElementById('channelInput'),
            btnChannelGo: document.getElementById('btnChannelGo'),
            channelSelect: document.getElementById('channelSelect'),
            recentChannels: document.getElementById('recentChannels'),
            statusIndicator: document.getElementById('statusIndicator'),
            statusText: document.getElementById('statusText'),
            btnSettings: document.getElementById('btnSettings'),
            btnConnect: document.getElementById('btnConnect'),
            
            // Messages elements
            messagesList: document.getElementById('messagesList'),
            btnScrollBottom: document.getElementById('btnScrollBottom'),
            
            // Input elements
            messageInput: document.getElementById('messageInput'),
            btnSend: document.getElementById('btnSend'),
            
            // Welcome elements
            btnWelcomeConnect: document.getElementById('btnWelcomeConnect'),
            
            // Settings elements
            settingsPanel: document.getElementById('settingsPanel'),
            btnCloseSettings: document.getElementById('btnCloseSettings'),
            fontSize: document.getElementById('fontSize'),
            fontSizeValue: document.getElementById('fontSizeValue'),
            showTimestamps: document.getElementById('showTimestamps'),
            showBadges: document.getElementById('showBadges'),
            autoScroll: document.getElementById('autoScroll'),
            soundNotifications: document.getElementById('soundNotifications'),
            
            // Info elements
            btnInfo: document.getElementById('btnInfo'),
            infoPanel: document.getElementById('infoPanel'),
            btnCloseInfo: document.getElementById('btnCloseInfo')
        };
    }

    function setupEventListeners() {
        // Connection buttons
        elements.btnConnect?.addEventListener('click', handleConnect);
        elements.btnWelcomeConnect?.addEventListener('click', handleConnect);
        
        // Channel switcher
        elements.channelInput?.addEventListener('keydown', handleChannelInputKeydown);
        elements.btnChannelGo?.addEventListener('click', handleChannelGo);
        elements.channelSelect?.addEventListener('change', handleChannelSelect);
        
        // Settings
        elements.btnSettings?.addEventListener('click', toggleSettings);
        elements.btnCloseSettings?.addEventListener('click', closeSettings);
        
        // Info panel
        elements.btnInfo?.addEventListener('click', toggleInfo);
        elements.btnCloseInfo?.addEventListener('click', closeInfo);
        
        // Close panels when clicking outside
        document.addEventListener('click', handleOutsideClick);
        
        // Message input
        elements.messageInput?.addEventListener('input', handleInputChange);
        elements.messageInput?.addEventListener('keydown', handleInputKeydown);
        elements.btnSend?.addEventListener('click', handleSendMessage);
        
        // Quick actions
        elements.btnScrollBottom?.addEventListener('click', scrollToBottom);
        
        // Settings controls
        elements.fontSize?.addEventListener('input', handleFontSizeChange);
        elements.showTimestamps?.addEventListener('change', handleSettingsChange);
        elements.showBadges?.addEventListener('change', handleSettingsChange);
        elements.autoScroll?.addEventListener('change', handleSettingsChange);
        elements.soundNotifications?.addEventListener('change', handleSettingsChange);
        
        // Scroll detection
        elements.messagesList?.addEventListener('scroll', handleScroll);
        
        // Listen for messages from extension
        window.addEventListener('message', handleExtensionMessage);
    }

    function notifyReady() {
        vscode.postMessage({ type: 'ready' });
    }

    // Extension message handlers
    function handleExtensionMessage(event) {
        const message = event.data;
        
        switch (message.type) {
            case 'initialState':
                handleInitialState(message.state);
                break;
            case 'newMessage':
                handleNewMessage(message.message);
                break;
            case 'connectionStateChanged':
                handleConnectionStateChanged(message);
                break;
            case 'messageSent':
                handleMessageSent(message);
                break;
            case 'clearMessages':
                clearMessages();
                break;
            default:
                console.warn('Unknown message type:', message.type);
        }
    }

    function handleInitialState(initialState) {
        state = { ...state, ...initialState };
        if (initialState.recentChannels) {
            loadRecentChannels(initialState.recentChannels);
        }
        updateUI();
        updateSettings();
    }

    function handleNewMessage(message) {
        state.messages.push(message);
        
        // Limit message history
        if (state.messages.length > 500) {
            state.messages = state.messages.slice(-400);
            // Re-render all messages
            renderAllMessages();
        } else {
            // Just append the new message
            appendMessage(message);
        }
        
        if (state.settings.autoScroll && state.isAutoScrollEnabled) {
            scrollToBottom();
        } else {
            showScrollIndicator();
        }
        
        if (state.settings.soundNotifications) {
            playNotificationSound();
        }
    }

    function handleConnectionStateChanged(data) {
        state.connectionState = data.state;
        state.channel = data.channel || '';
        state.isAuthenticated = data.isAuthenticated;
        updateUI();
    }

    function handleMessageSent(data) {
        if (data.success) {
            // Clear input and add to history
            const messageText = elements.messageInput.value.trim();
            if (messageText) {
                addToMessageHistory(messageText);
            }
            elements.messageInput.value = '';
            updateSendButton();
        } else {
            // Show error
            console.error('Failed to send message:', data.error);
        }
    }

    // UI Event handlers
    function handleConnect() {
        vscode.postMessage({ type: 'connect' });
    }

    function handleChannelInputKeydown(event) {
        // Check if user is composing text (IME)
        if (event.isComposing || event.keyCode === 229) {
            return;
        }
        
        if (event.key === 'Enter') {
            event.preventDefault();
            handleChannelGo();
        }
    }

    function handleChannelGo() {
        const channel = elements.channelInput?.value?.trim();
        if (channel) {
            connectToChannel(channel);
        }
    }

    function handleChannelSelect() {
        const selectedChannel = elements.channelSelect?.value;
        if (selectedChannel) {
            connectToChannel(selectedChannel);
            elements.channelSelect.value = ''; // Reset selection
        }
    }

    function connectToChannel(channel) {
        // Clean channel name (remove # if present)
        const cleanChannel = channel.replace(/^#/, '');
        
        // If switching to a different channel, clear chat first
        if (state.channel && state.channel !== cleanChannel) {
            clearMessages();
            // Show switching indicator
            addSystemMessage(`Switching to #${cleanChannel}...`);
        }
        
        // Add to recent channels
        addToRecentChannels(cleanChannel);
        
        // Clear input
        if (elements.channelInput) {
            elements.channelInput.value = '';
        }
        
        // Send connect message to extension
        vscode.postMessage({ 
            type: 'connectToChannel', 
            channel: cleanChannel 
        });
    }

    function addSystemMessage(text) {
        if (!elements.messagesList) return;
        
        const systemMessage = document.createElement('div');
        systemMessage.className = 'system-message';
        systemMessage.textContent = text;
        
        // Hide welcome message if it exists
        const welcomeMessage = elements.messagesList.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
        
        elements.messagesList.appendChild(systemMessage);
        
        if (state.settings.autoScroll && state.isAutoScrollEnabled) {
            scrollToBottom();
        }
    }

    function handleInputChange() {
        updateSendButton();
        autoResizeInput();
    }

    function handleInputKeydown(event) {
        // Check if user is composing text (e.g., using IME for Chinese, Japanese, Korean)
        if (event.isComposing || event.keyCode === 229) {
            return; // Don't handle Enter while composing
        }
        
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        } else if (event.key === 'ArrowUp' && !event.shiftKey) {
            event.preventDefault();
            navigateMessageHistory(-1);
        } else if (event.key === 'ArrowDown' && !event.shiftKey) {
            event.preventDefault();
            navigateMessageHistory(1);
        }
    }

    function handleSendMessage() {
        const text = elements.messageInput?.value?.trim();
        if (text && text.length > 0) {
            vscode.postMessage({ 
                type: 'sendMessage', 
                text: text 
            });
        }
    }


    function toggleSettings(event) {
        if (event) {
            event.stopPropagation();
        }
        elements.settingsPanel?.classList.toggle('hidden');
    }

    function closeSettings() {
        elements.settingsPanel?.classList.add('hidden');
    }

    function toggleInfo(event) {
        if (event) {
            event.stopPropagation();
        }
        // Close settings panel if open
        elements.settingsPanel?.classList.add('hidden');
        elements.infoPanel?.classList.toggle('hidden');
    }

    function closeInfo() {
        elements.infoPanel?.classList.add('hidden');
    }

    function handleOutsideClick(event) {
        // Check settings panel
        if (!elements.settingsPanel?.classList.contains('hidden')) {
            if (!elements.settingsPanel?.contains(event.target) && 
                !elements.btnSettings?.contains(event.target)) {
                elements.settingsPanel?.classList.add('hidden');
            }
        }
        
        // Check info panel
        if (!elements.infoPanel?.classList.contains('hidden')) {
            if (!elements.infoPanel?.contains(event.target) && 
                !elements.btnInfo?.contains(event.target)) {
                elements.infoPanel?.classList.add('hidden');
            }
        }
    }

    function handleScroll() {
        if (!elements.messagesList) return;
        
        const { scrollTop, scrollHeight, clientHeight } = elements.messagesList;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        
        state.isAutoScrollEnabled = distanceFromBottom <= 50;
        
        if (state.isAutoScrollEnabled) {
            hideScrollIndicator();
        } else {
            showScrollIndicator();
        }
    }

    function handleFontSizeChange() {
        const fontSize = elements.fontSize?.value || 14;
        elements.fontSizeValue.textContent = fontSize + 'px';
        
        // Apply font size immediately to CSS custom property
        document.documentElement.style.setProperty('--chat-font-size', fontSize + 'px');
        
        // Also apply directly to message elements for immediate effect
        const messages = document.querySelectorAll('.message-item');
        messages.forEach(msg => {
            msg.style.fontSize = fontSize + 'px';
        });
        
        handleSettingsChange();
    }

    function handleSettingsChange() {
        const settings = {
            fontSize: parseInt(elements.fontSize?.value || 14),
            showTimestamps: elements.showTimestamps?.checked || false,
            showBadges: elements.showBadges?.checked || false,
            autoScroll: elements.autoScroll?.checked || false,
            soundNotifications: elements.soundNotifications?.checked || false
        };
        
        state.settings = { ...state.settings, ...settings };
        updateChatDisplay();
        
        vscode.postMessage({ 
            type: 'settingsChanged', 
            settings: settings 
        });
    }

    // UI Update functions
    function updateUI() {
        updateConnectionStatus();
        updateChannelInfo();
        updateInputState();
        updateChatDisplay();
    }

    function updateConnectionStatus() {
        if (!elements.statusIndicator || !elements.statusText) return;
        
        // Remove all status classes
        elements.statusIndicator.className = 'status-indicator';
        
        switch (state.connectionState) {
            case 'connected':
                elements.statusIndicator.classList.add('connected');
                elements.statusText.textContent = 'Connected';
                break;
            case 'connecting':
            case 'authenticating':
                elements.statusIndicator.classList.add('connecting');
                elements.statusText.textContent = 'Connecting...';
                break;
            case 'reconnecting':
                elements.statusIndicator.classList.add('connecting');
                elements.statusText.textContent = 'Reconnecting...';
                break;
            case 'error':
                elements.statusIndicator.classList.add('error');
                elements.statusText.textContent = 'Error';
                break;
            default:
                elements.statusIndicator.classList.add('disconnected');
                elements.statusText.textContent = 'Disconnected';
        }
    }

    function updateChannelInfo() {
        if (!elements.channelName) return;
        
        if (state.connectionState === 'connected' && state.channel) {
            // Create clickable link to Twitch channel
            elements.channelName.innerHTML = `<a href="https://www.twitch.tv/${state.channel}" 
                                                target="_blank" 
                                                title="Open ${state.channel} on Twitch" 
                                                class="channel-link">#${state.channel}</a>`;
        } else if (state.connectionState === 'connecting' || state.connectionState === 'authenticating') {
            elements.channelName.textContent = 'Connecting...';
        } else if (state.channel && state.connectionState === 'disconnected') {
            elements.channelName.textContent = `#${state.channel} (disconnected)`;
        } else {
            elements.channelName.textContent = state.isAuthenticated ? 'Ready to connect' : 'Not connected';
        }
    }

    function updateInputState() {
        const isConnected = state.connectionState === 'connected';
        
        if (elements.messageInput) {
            elements.messageInput.disabled = !isConnected;
            elements.messageInput.placeholder = isConnected 
                ? 'Type a message...' 
                : 'Connect to start chatting';
        }
        
        
        updateSendButton();
    }

    function updateSendButton() {
        if (!elements.btnSend) return;
        
        const isConnected = state.connectionState === 'connected';
        const hasText = elements.messageInput?.value?.trim().length > 0;
        
        elements.btnSend.disabled = !isConnected || !hasText;
    }


    function updateChatDisplay() {
        const container = document.querySelector('.chat-container');
        if (!container) return;
        
        // Apply timestamp visibility
        if (state.settings.showTimestamps) {
            container.classList.add('show-timestamps');
            container.classList.remove('hide-timestamps');
        } else {
            container.classList.add('hide-timestamps');
            container.classList.remove('show-timestamps');
        }
        
        // Apply badge visibility
        if (state.settings.showBadges) {
            container.classList.add('show-badges');
            container.classList.remove('hide-badges');
        } else {
            container.classList.add('hide-badges');
            container.classList.remove('show-badges');
        }
    }

    function updateSettings() {
        if (elements.fontSize) {
            elements.fontSize.value = state.settings.fontSize;
            elements.fontSizeValue.textContent = state.settings.fontSize + 'px';
            // Apply font size immediately
            document.documentElement.style.setProperty('--chat-font-size', state.settings.fontSize + 'px');
        }
        if (elements.showTimestamps) {
            elements.showTimestamps.checked = state.settings.showTimestamps;
        }
        if (elements.showBadges) {
            elements.showBadges.checked = state.settings.showBadges;
        }
        if (elements.autoScroll) {
            elements.autoScroll.checked = state.settings.autoScroll;
        }
        if (elements.soundNotifications) {
            elements.soundNotifications.checked = state.settings.soundNotifications;
        }
        
        updateChatDisplay();
    }

    // Message rendering
    function appendMessage(message) {
        if (!elements.messagesList) return;
        
        const messageElement = createMessageElement(message);
        
        // Hide welcome message if it exists
        const welcomeMessage = elements.messagesList.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
        
        elements.messagesList.appendChild(messageElement);
    }

    function renderAllMessages() {
        if (!elements.messagesList) return;
        
        // Clear existing messages (except welcome)
        const welcomeMessage = elements.messagesList.querySelector('.welcome-message');
        elements.messagesList.innerHTML = '';
        
        if (state.messages.length === 0 && welcomeMessage) {
            elements.messagesList.appendChild(welcomeMessage);
            welcomeMessage.style.display = 'block';
        } else {
            state.messages.forEach(message => {
                const messageElement = createMessageElement(message);
                elements.messagesList.appendChild(messageElement);
            });
        }
    }

    function createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message-item';
        if (message.isSelf) {
            messageDiv.classList.add('self-message');
        }
        messageDiv.setAttribute('data-user-type', message.userType);
        messageDiv.setAttribute('data-message-id', message.id);
        
        // Timestamp
        const timestampSpan = document.createElement('div');
        timestampSpan.className = 'message-timestamp';
        const time = new Date(message.timestamp);
        timestampSpan.textContent = time.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        timestampSpan.title = time.toLocaleString(); // Full timestamp on hover
        
        // User info container
        const userDiv = document.createElement('div');
        userDiv.className = 'message-user';
        
        // Badges
        const badgesDiv = document.createElement('div');
        badgesDiv.className = 'user-badges';
        if (message.badges && message.badges.length > 0) {
            message.badges.forEach(badge => {
                const badgeSpan = document.createElement('span');
                badgeSpan.className = `badge ${badge.name}`;
                badgeSpan.title = `${badge.name} (${badge.version})`;
                
                // Map badge names to display text
                const badgeText = getBadgeDisplayText(badge.name);
                badgeSpan.textContent = badgeText;
                badgesDiv.appendChild(badgeSpan);
            });
        }
        
        // Username with colon
        const usernameSpan = document.createElement('span');
        usernameSpan.className = `user-name ${message.userType}`;
        usernameSpan.textContent = message.displayName + ':';
        usernameSpan.title = `@${message.username}`;
        
        // Apply custom color if provided
        if (message.color) {
            usernameSpan.style.color = message.color;
        }
        
        userDiv.appendChild(badgesDiv);
        userDiv.appendChild(usernameSpan);
        
        // Message content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Process message text with emotes
        const processedContent = processMessageContent(message.message, message.emotes);
        contentDiv.appendChild(processedContent);
        
        // Assemble message
        messageDiv.appendChild(timestampSpan);
        messageDiv.appendChild(userDiv);
        messageDiv.appendChild(contentDiv);
        
        // Add click handler for username
        usernameSpan.addEventListener('click', () => handleUsernameClick(message));
        
        return messageDiv;
    }

    function getBadgeDisplayText(badgeName) {
        const badgeMap = {
            'broadcaster': 'LIVE',
            'moderator': 'MOD',
            'vip': 'VIP',
            'subscriber': 'SUB',
            'premium': 'PRIME',
            'staff': 'STAFF',
            'admin': 'ADMIN',
            'global_mod': 'GMOD'
        };
        
        return badgeMap[badgeName] || badgeName.toUpperCase().slice(0, 4);
    }

    function processMessageContent(messageText, emotes) {
        const contentSpan = document.createElement('span');
        contentSpan.className = 'message-text';
        
        if (!emotes || emotes.length === 0) {
            // No emotes, just return plain text
            contentSpan.textContent = messageText;
            return contentSpan;
        }
        
        // Sort emotes by position to process them in order
        const sortedEmotes = emotes.flatMap(emote => 
            emote.positions.map(pos => ({
                ...emote,
                start: pos.start,
                end: pos.end
            }))
        ).sort((a, b) => a.start - b.start);
        
        let lastIndex = 0;
        
        sortedEmotes.forEach(emote => {
            // Add text before emote
            if (emote.start > lastIndex) {
                const textNode = document.createTextNode(messageText.slice(lastIndex, emote.start));
                contentSpan.appendChild(textNode);
            }
            
            // Add emote
            const emoteSpan = document.createElement('span');
            emoteSpan.className = 'emote';
            emoteSpan.textContent = emote.name;
            emoteSpan.title = emote.name;
            emoteSpan.setAttribute('data-emote-id', emote.id);
            
            // Try to load emote image
            const emoteImg = document.createElement('img');
            emoteImg.src = `https://static-cdn.jtvnw.net/emoticons/v2/${emote.id}/default/dark/1.0`;
            emoteImg.alt = emote.name;
            emoteImg.className = 'emote-image';
            emoteImg.title = emote.name;
            
            emoteImg.onerror = function() {
                // If image fails to load, show text instead
                emoteSpan.removeChild(emoteImg);
                emoteSpan.textContent = emote.name;
            };
            
            emoteSpan.appendChild(emoteImg);
            contentSpan.appendChild(emoteSpan);
            
            lastIndex = emote.end + 1;
        });
        
        // Add remaining text after last emote
        if (lastIndex < messageText.length) {
            const textNode = document.createTextNode(messageText.slice(lastIndex));
            contentSpan.appendChild(textNode);
        }
        
        return contentSpan;
    }

    function handleUsernameClick(message) {
        // Show user info tooltip or context menu
        const userInfo = `User: ${message.displayName}\n` +
                        `Type: ${message.userType}\n` +
                        `Badges: ${message.badges?.map(b => b.name).join(', ') || 'None'}\n` +
                        `Click time: ${new Date(message.timestamp).toLocaleString()}`;
        
        // For now, just show an alert. In a full implementation, 
        // this could show a user card or context menu
        console.log(userInfo);
    }

    function clearMessages() {
        state.messages = [];
        renderAllMessages();
    }

    // Utility functions
    function scrollToBottom() {
        if (elements.messagesList) {
            elements.messagesList.scrollTop = elements.messagesList.scrollHeight;
        }
        hideScrollIndicator();
    }

    function showScrollIndicator() {
        if (elements.btnScrollBottom) {
            elements.btnScrollBottom.parentElement.style.display = 'block';
        }
    }

    function hideScrollIndicator() {
        if (elements.btnScrollBottom) {
            elements.btnScrollBottom.parentElement.style.display = 'none';
        }
    }

    function autoResizeInput() {
        if (!elements.messageInput) return;
        
        elements.messageInput.style.height = 'auto';
        const newHeight = Math.min(elements.messageInput.scrollHeight, 120);
        elements.messageInput.style.height = newHeight + 'px';
    }

    function addToMessageHistory(message) {
        state.messageHistory.unshift(message);
        if (state.messageHistory.length > 20) {
            state.messageHistory = state.messageHistory.slice(0, 20);
        }
        state.historyIndex = -1;
    }

    function navigateMessageHistory(direction) {
        if (state.messageHistory.length === 0) return;
        
        const newIndex = state.historyIndex + direction;
        
        if (newIndex >= -1 && newIndex < state.messageHistory.length) {
            state.historyIndex = newIndex;
            
            if (state.historyIndex === -1) {
                elements.messageInput.value = '';
            } else {
                elements.messageInput.value = state.messageHistory[state.historyIndex];
            }
            
            updateSendButton();
        }
    }

    // Recent channels management
    function addToRecentChannels(channel) {
        if (!channel) return;
        
        // Remove if already exists
        state.recentChannels = state.recentChannels.filter(c => c !== channel);
        
        // Add to beginning
        state.recentChannels.unshift(channel);
        
        // Keep only last 10 channels
        if (state.recentChannels.length > 10) {
            state.recentChannels = state.recentChannels.slice(0, 10);
        }
        
        // Update UI
        updateRecentChannelsSelect();
        
        // Save to storage
        saveRecentChannels();
    }

    function updateRecentChannelsSelect() {
        if (!elements.channelSelect) return;
        
        // Clear existing options except first
        while (elements.channelSelect.children.length > 1) {
            elements.channelSelect.removeChild(elements.channelSelect.lastChild);
        }
        
        // Add recent channels
        state.recentChannels.forEach(channel => {
            const option = document.createElement('option');
            option.value = channel;
            option.textContent = `#${channel}`;
            elements.channelSelect.appendChild(option);
        });
        
        // Show/hide recent channels dropdown
        if (elements.recentChannels) {
            elements.recentChannels.style.display = state.recentChannels.length > 0 ? 'block' : 'none';
        }
    }

    function saveRecentChannels() {
        vscode.postMessage({
            type: 'saveRecentChannels',
            channels: state.recentChannels
        });
    }

    function loadRecentChannels(channels) {
        state.recentChannels = channels || [];
        updateRecentChannelsSelect();
    }

    function playNotificationSound() {
        // Simple beep using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            console.warn('Could not play notification sound:', error);
        }
    }
})();