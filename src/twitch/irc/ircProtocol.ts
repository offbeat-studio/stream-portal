import { IRCMessage, ChatMessage, UserType, Badge, Emote } from '../types/twitch';

export class IRCProtocolHandler {
    private static readonly IRC_CAPABILITIES = [
        'twitch.tv/commands',
        'twitch.tv/membership',
        'twitch.tv/tags'
    ];

    parseMessage(rawMessage: string): IRCMessage {
        const message: IRCMessage = {
            command: '',
            params: [],
            raw: rawMessage.trim()
        };

        let msgContent = rawMessage.trim();

        // Parse tags (if present)
        if (msgContent.startsWith('@')) {
            const spaceIndex = msgContent.indexOf(' ');
            const tagsString = msgContent.substring(1, spaceIndex);
            message.tags = this.parseTags(tagsString);
            msgContent = msgContent.substring(spaceIndex + 1);
        }

        // Parse prefix (if present)
        if (msgContent.startsWith(':')) {
            const spaceIndex = msgContent.indexOf(' ');
            message.prefix = msgContent.substring(1, spaceIndex);
            msgContent = msgContent.substring(spaceIndex + 1);
        }

        // Parse command and parameters
        const parts = msgContent.split(' ');
        message.command = parts[0].toUpperCase();

        // Handle parameters
        for (let i = 1; i < parts.length; i++) {
            if (parts[i].startsWith(':')) {
                // Rest of the message is a single parameter
                message.params.push(parts.slice(i).join(' ').substring(1));
                break;
            } else {
                message.params.push(parts[i]);
            }
        }

        return message;
    }

    parsePrivMsg(ircMessage: IRCMessage): ChatMessage | null {
        if (ircMessage.command !== 'PRIVMSG' || ircMessage.params.length < 2) {
            return null;
        }

        const channel = ircMessage.params[0];
        const messageText = ircMessage.params[1];
        const tags = ircMessage.tags || {};

        // Extract username from prefix or tags
        const username = tags['display-name'] || this.extractUsernameFromPrefix(ircMessage.prefix) || 'unknown';
        const displayName = tags['display-name'] || username;

        return {
            id: tags['id'] || this.generateMessageId(),
            channel,
            username: username.toLowerCase(),
            displayName,
            message: messageText,
            timestamp: new Date(),
            badges: this.parseBadges(tags['badges']),
            emotes: this.parseEmotes(tags['emotes'], messageText),
            color: tags['color'] || undefined,
            userType: this.parseUserType(tags)
        };
    }

    formatAuthMessage(token: string, username: string): string {
        return `PASS oauth:${token}\r\nNICK ${username.toLowerCase()}\r\n`;
    }

    formatCapabilityRequest(): string {
        return `CAP REQ :${IRCProtocolHandler.IRC_CAPABILITIES.join(' ')}\r\n`;
    }

    formatJoinMessage(channel: string): string {
        const formattedChannel = channel.startsWith('#') ? channel : `#${channel}`;
        return `JOIN ${formattedChannel}\r\n`;
    }

    formatPartMessage(channel: string): string {
        const formattedChannel = channel.startsWith('#') ? channel : `#${channel}`;
        return `PART ${formattedChannel}\r\n`;
    }

    formatPrivMsg(channel: string, message: string): string {
        const formattedChannel = channel.startsWith('#') ? channel : `#${channel}`;
        return `PRIVMSG ${formattedChannel} :${message}\r\n`;
    }

    formatPongMessage(server: string): string {
        return `PONG :${server}\r\n`;
    }

    private parseTags(tagsString: string): Record<string, string> {
        const tags: Record<string, string> = {};
        
        tagsString.split(';').forEach(tag => {
            const [key, value] = tag.split('=', 2);
            if (key) {
                tags[key] = value || '';
            }
        });

        return tags;
    }

    private parseBadges(badgesString?: string): Badge[] {
        if (!badgesString) {
            return [];
        }

        return badgesString.split(',').map(badge => {
            const [name, version] = badge.split('/');
            return { name, version: version || '1' };
        });
    }

    private parseEmotes(emotesString?: string, messageText?: string): Emote[] {
        if (!emotesString || !messageText) {
            return [];
        }

        const emotes: Emote[] = [];
        
        emotesString.split('/').forEach(emoteData => {
            const [id, positions] = emoteData.split(':');
            if (id && positions) {
                const emotePositions = positions.split(',').map(pos => {
                    const [start, end] = pos.split('-').map(Number);
                    return { start, end };
                });

                // Get emote name from the first position
                if (emotePositions.length > 0) {
                    const firstPos = emotePositions[0];
                    const name = messageText.substring(firstPos.start, firstPos.end + 1);
                    
                    emotes.push({
                        id,
                        name,
                        positions: emotePositions
                    });
                }
            }
        });

        return emotes;
    }

    private parseUserType(tags: Record<string, string>): UserType {
        const badges = tags['badges'] || '';
        
        if (badges.includes('broadcaster')) {
            return UserType.BROADCASTER;
        }
        if (badges.includes('moderator')) {
            return UserType.MODERATOR;
        }
        if (badges.includes('vip')) {
            return UserType.VIP;
        }
        if (badges.includes('subscriber')) {
            return UserType.SUBSCRIBER;
        }
        
        return UserType.VIEWER;
    }

    private extractUsernameFromPrefix(prefix?: string): string | null {
        if (!prefix) {
            return null;
        }

        // Prefix format: nickname!user@host or just nickname
        const exclamationIndex = prefix.indexOf('!');
        if (exclamationIndex !== -1) {
            return prefix.substring(0, exclamationIndex);
        }
        
        return prefix;
    }

    private generateMessageId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    isCapabilityMessage(ircMessage: IRCMessage): boolean {
        return ircMessage.command === 'CAP';
    }

    isPingMessage(ircMessage: IRCMessage): boolean {
        return ircMessage.command === 'PING';
    }

    isJoinMessage(ircMessage: IRCMessage): boolean {
        return ircMessage.command === 'JOIN';
    }

    isPartMessage(ircMessage: IRCMessage): boolean {
        return ircMessage.command === 'PART';
    }

    isPrivateMessage(ircMessage: IRCMessage): boolean {
        return ircMessage.command === 'PRIVMSG';
    }
}