/**
 * Tests for IRCProtocolHandler
 * Comprehensive testing of IRC message parsing and protocol handling
 */

import { IRCProtocolHandler } from '../../../../src/twitch/irc/ircProtocol';
import { UserType } from '../../../../src/twitch/types/twitch';
import { testData, createMockChatMessage } from '../../../fixtures/test-data';

describe('IRCProtocolHandler', () => {
  let protocolHandler: IRCProtocolHandler;

  beforeEach(() => {
    protocolHandler = new IRCProtocolHandler();
  });

  describe('Message Parsing', () => {
    it('should parse basic IRC messages correctly', () => {
      const rawMessage = ':testuser!testuser@testuser.tmi.twitch.tv PRIVMSG #testchannel :Hello world!';
      
      const parsed = protocolHandler.parseMessage(rawMessage);

      expect(parsed.prefix).toBe('testuser!testuser@testuser.tmi.twitch.tv');
      expect(parsed.command).toBe('PRIVMSG');
      expect(parsed.params).toEqual(['#testchannel', 'Hello world!']);
      expect(parsed.raw).toBe(rawMessage);
    });

    it('should parse messages without prefix', () => {
      const rawMessage = 'PING :tmi.twitch.tv';
      
      const parsed = protocolHandler.parseMessage(rawMessage);

      expect(parsed.prefix).toBeUndefined();
      expect(parsed.command).toBe('PING');
      expect(parsed.params).toEqual(['tmi.twitch.tv']);
      expect(parsed.raw).toBe(rawMessage);
    });

    it('should parse messages with tags', () => {
      const rawMessage = '@badge-info=;badges=;client-nonce=test;color=#FF0000;display-name=TestUser;emotes=;first-msg=0;flags=;id=test-id;mod=0;returning-chatter=0;room-id=123;subscriber=0;tmi-sent-ts=1234567890;turbo=0;user-id=456;user-type= :testuser!testuser@testuser.tmi.twitch.tv PRIVMSG #testchannel :Hello world!';
      
      const parsed = protocolHandler.parseMessage(rawMessage);

      expect(parsed.tags).toBeDefined();
      expect(parsed.tags!['display-name']).toBe('TestUser');
      expect(parsed.tags!['color']).toBe('#FF0000');
      expect(parsed.tags!['user-id']).toBe('456');
      expect(parsed.command).toBe('PRIVMSG');
    });

    it('should handle malformed messages gracefully', () => {
      const malformedMessage = 'INVALID MESSAGE FORMAT';
      
      const parsed = protocolHandler.parseMessage(malformedMessage);

      expect(parsed.command).toBe('INVALID');
      expect(parsed.params).toEqual(['MESSAGE', 'FORMAT']);
      expect(parsed.raw).toBe(malformedMessage);
    });

    it('should parse empty messages', () => {
      const emptyMessage = '';
      
      const parsed = protocolHandler.parseMessage(emptyMessage);

      expect(parsed.command).toBe('');
      expect(parsed.params).toEqual([]);
      expect(parsed.raw).toBe(emptyMessage);
    });
  });

  describe('PRIVMSG Detection', () => {
    it('should identify PRIVMSG messages correctly', () => {
      const privmsgMessage = {
        command: 'PRIVMSG',
        params: ['#testchannel', 'Hello world!'],
        raw: ':testuser!testuser@testuser.tmi.twitch.tv PRIVMSG #testchannel :Hello world!'
      };

      const isPrivate = protocolHandler.isPrivateMessage(privmsgMessage);

      expect(isPrivate).toBe(true);
    });

    it('should reject non-PRIVMSG messages', () => {
      const joinMessage = {
        command: 'JOIN',
        params: ['#testchannel'],
        raw: ':testuser!testuser@testuser.tmi.twitch.tv JOIN #testchannel'
      };

      const isPrivate = protocolHandler.isPrivateMessage(joinMessage);

      expect(isPrivate).toBe(false);
    });

    it('should handle case-insensitive command matching', () => {
      const privmsgMessage = {
        command: 'privmsg',
        params: ['#testchannel', 'Hello world!'],
        raw: ':testuser!testuser@testuser.tmi.twitch.tv privmsg #testchannel :Hello world!'
      };

      const isPrivate = protocolHandler.isPrivateMessage(privmsgMessage);

      expect(isPrivate).toBe(true);
    });
  });

  describe('PRIVMSG Parsing', () => {
    it('should parse basic PRIVMSG into ChatMessage', () => {
      const ircMessage = {
        command: 'PRIVMSG',
        params: ['#testchannel', 'Hello world!'],
        prefix: 'testuser!testuser@testuser.tmi.twitch.tv',
        raw: ':testuser!testuser@testuser.tmi.twitch.tv PRIVMSG #testchannel :Hello world!'
      };

      const chatMessage = protocolHandler.parsePrivMsg(ircMessage);

      expect(chatMessage.username).toBe('testuser');
      expect(chatMessage.displayName).toBe('testuser');
      expect(chatMessage.channel).toBe('testchannel');
      expect(chatMessage.message).toBe('Hello world!');
      expect(chatMessage.userType).toBe(UserType.VIEWER);
      expect(chatMessage.isSelf).toBe(false);
    });

    it('should parse PRIVMSG with tags', () => {
      const ircMessage = {
        command: 'PRIVMSG',
        params: ['#testchannel', 'Hello world!'],
        prefix: 'testuser!testuser@testuser.tmi.twitch.tv',
        tags: {
          'display-name': 'TestUser',
          'color': '#FF0000',
          'user-id': '123456',
          'subscriber': '1',
          'mod': '0',
          'badges': 'subscriber/12',
          'emotes': '25:0-4',
          'id': 'test-message-id',
          'tmi-sent-ts': '1234567890123'
        },
        raw: '@display-name=TestUser;color=#FF0000;user-id=123456;subscriber=1;mod=0;badges=subscriber/12;emotes=25:0-4;id=test-message-id;tmi-sent-ts=1234567890123 :testuser!testuser@testuser.tmi.twitch.tv PRIVMSG #testchannel :Hello world!'
      };

      const chatMessage = protocolHandler.parsePrivMsg(ircMessage);

      expect(chatMessage.displayName).toBe('TestUser');
      expect(chatMessage.color).toBe('#FF0000');
      expect(chatMessage.id).toBe('test-message-id');
      expect(chatMessage.badges).toHaveLength(1);
      expect(chatMessage.badges[0].name).toBe('subscriber');
      expect(chatMessage.badges[0].version).toBe('12');
      expect(chatMessage.emotes).toHaveLength(1);
      expect(chatMessage.emotes[0].id).toBe('25');
      expect(chatMessage.timestamp).toBeInstanceOf(Date);
    });

    it('should detect moderator status', () => {
      const ircMessage = {
        command: 'PRIVMSG',
        params: ['#testchannel', 'Moderator message'],
        prefix: 'moderator!moderator@moderator.tmi.twitch.tv',
        tags: {
          'display-name': 'Moderator',
          'mod': '1',
          'badges': 'moderator/1'
        },
        raw: '@display-name=Moderator;mod=1;badges=moderator/1 :moderator!moderator@moderator.tmi.twitch.tv PRIVMSG #testchannel :Moderator message'
      };

      const chatMessage = protocolHandler.parsePrivMsg(ircMessage);

      expect(chatMessage.userType).toBe(UserType.MODERATOR);
      expect(chatMessage.badges).toHaveLength(1);
      expect(chatMessage.badges[0].name).toBe('moderator');
    });

    it('should detect broadcaster status', () => {
      const ircMessage = {
        command: 'PRIVMSG',
        params: ['#testchannel', 'Broadcaster message'],
        prefix: 'broadcaster!broadcaster@broadcaster.tmi.twitch.tv',
        tags: {
          'display-name': 'Broadcaster',
          'badges': 'broadcaster/1'
        },
        raw: '@display-name=Broadcaster;badges=broadcaster/1 :broadcaster!broadcaster@broadcaster.tmi.twitch.tv PRIVMSG #testchannel :Broadcaster message'
      };

      const chatMessage = protocolHandler.parsePrivMsg(ircMessage);

      expect(chatMessage.userType).toBe(UserType.BROADCASTER);
      expect(chatMessage.badges).toHaveLength(1);
      expect(chatMessage.badges[0].name).toBe('broadcaster');
    });

    it('should detect VIP status', () => {
      const ircMessage = {
        command: 'PRIVMSG',
        params: ['#testchannel', 'VIP message'],
        prefix: 'vip!vip@vip.tmi.twitch.tv',
        tags: {
          'display-name': 'VIP',
          'badges': 'vip/1'
        },
        raw: '@display-name=VIP;badges=vip/1 :vip!vip@vip.tmi.twitch.tv PRIVMSG #testchannel :VIP message'
      };

      const chatMessage = protocolHandler.parsePrivMsg(ircMessage);

      expect(chatMessage.userType).toBe(UserType.VIP);
      expect(chatMessage.badges).toHaveLength(1);
      expect(chatMessage.badges[0].name).toBe('vip');
    });

    it('should parse multiple badges correctly', () => {
      const ircMessage = {
        command: 'PRIVMSG',
        params: ['#testchannel', 'Multi-badge message'],
        prefix: 'user!user@user.tmi.twitch.tv',
        tags: {
          'display-name': 'User',
          'badges': 'subscriber/24,vip/1,premium/1'
        },
        raw: '@display-name=User;badges=subscriber/24,vip/1,premium/1 :user!user@user.tmi.twitch.tv PRIVMSG #testchannel :Multi-badge message'
      };

      const chatMessage = protocolHandler.parsePrivMsg(ircMessage);

      expect(chatMessage.badges).toHaveLength(3);
      expect(chatMessage.badges[0]).toEqual({ name: 'subscriber', version: '24' });
      expect(chatMessage.badges[1]).toEqual({ name: 'vip', version: '1' });
      expect(chatMessage.badges[2]).toEqual({ name: 'premium', version: '1' });
    });

    it('should parse emotes correctly', () => {
      const ircMessage = {
        command: 'PRIVMSG',
        params: ['#testchannel', 'Kappa Test kreygasm'],
        prefix: 'user!user@user.tmi.twitch.tv',
        tags: {
          'display-name': 'User',
          'emotes': '25:0-4/354:11-19'
        },
        raw: '@display-name=User;emotes=25:0-4/354:11-19 :user!user@user.tmi.twitch.tv PRIVMSG #testchannel :Kappa Test kreygasm'
      };

      const chatMessage = protocolHandler.parsePrivMsg(ircMessage);

      expect(chatMessage.emotes).toHaveLength(2);
      expect(chatMessage.emotes[0]).toEqual({
        id: '25',
        name: 'Kappa',
        positions: [{ start: 0, end: 4 }]
      });
      expect(chatMessage.emotes[1]).toEqual({
        id: '354',
        name: 'kreygasm',
        positions: [{ start: 11, end: 19 }]
      });
    });

    it('should handle empty emotes field', () => {
      const ircMessage = {
        command: 'PRIVMSG',
        params: ['#testchannel', 'No emotes here'],
        prefix: 'user!user@user.tmi.twitch.tv',
        tags: {
          'display-name': 'User',
          'emotes': ''
        },
        raw: '@display-name=User;emotes= :user!user@user.tmi.twitch.tv PRIVMSG #testchannel :No emotes here'
      };

      const chatMessage = protocolHandler.parsePrivMsg(ircMessage);

      expect(chatMessage.emotes).toEqual([]);
    });

    it('should handle malformed emotes gracefully', () => {
      const ircMessage = {
        command: 'PRIVMSG',
        params: ['#testchannel', 'Malformed emotes'],
        prefix: 'user!user@user.tmi.twitch.tv',
        tags: {
          'display-name': 'User',
          'emotes': '25:invalid/354:11-'
        },
        raw: '@display-name=User;emotes=25:invalid/354:11- :user!user@user.tmi.twitch.tv PRIVMSG #testchannel :Malformed emotes'
      };

      const chatMessage = protocolHandler.parsePrivMsg(ircMessage);

      // Should skip malformed emotes but not crash
      expect(chatMessage.emotes).toEqual([]);
    });

    it('should handle missing prefix gracefully', () => {
      const ircMessage = {
        command: 'PRIVMSG',
        params: ['#testchannel', 'No prefix message'],
        raw: 'PRIVMSG #testchannel :No prefix message'
      };

      const chatMessage = protocolHandler.parsePrivMsg(ircMessage);

      expect(chatMessage.username).toBe('unknown');
      expect(chatMessage.displayName).toBe('unknown');
      expect(chatMessage.message).toBe('No prefix message');
    });

    it('should handle missing channel parameter', () => {
      const ircMessage = {
        command: 'PRIVMSG',
        params: ['Missing channel message'],
        prefix: 'user!user@user.tmi.twitch.tv',
        raw: ':user!user@user.tmi.twitch.tv PRIVMSG :Missing channel message'
      };

      const chatMessage = protocolHandler.parsePrivMsg(ircMessage);

      expect(chatMessage.channel).toBe('');
      expect(chatMessage.message).toBe('Missing channel message');
    });

    it('should parse timestamp from tmi-sent-ts tag', () => {
      const timestamp = '1234567890123';
      const ircMessage = {
        command: 'PRIVMSG',
        params: ['#testchannel', 'Timestamped message'],
        prefix: 'user!user@user.tmi.twitch.tv',
        tags: {
          'tmi-sent-ts': timestamp
        },
        raw: `@tmi-sent-ts=${timestamp} :user!user@user.tmi.twitch.tv PRIVMSG #testchannel :Timestamped message`
      };

      const chatMessage = protocolHandler.parsePrivMsg(ircMessage);

      expect(chatMessage.timestamp.getTime()).toBe(parseInt(timestamp));
    });

    it('should generate unique message IDs when missing', () => {
      const ircMessage = {
        command: 'PRIVMSG',
        params: ['#testchannel', 'No ID message'],
        prefix: 'user!user@user.tmi.twitch.tv',
        raw: ':user!user@user.tmi.twitch.tv PRIVMSG #testchannel :No ID message'
      };

      const chatMessage1 = protocolHandler.parsePrivMsg(ircMessage);
      const chatMessage2 = protocolHandler.parsePrivMsg(ircMessage);

      expect(chatMessage1.id).toBeDefined();
      expect(chatMessage2.id).toBeDefined();
      expect(chatMessage1.id).not.toBe(chatMessage2.id);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(500);
      const ircMessage = {
        command: 'PRIVMSG',
        params: ['#testchannel', longMessage],
        prefix: 'user!user@user.tmi.twitch.tv',
        raw: `:user!user@user.tmi.twitch.tv PRIVMSG #testchannel :${longMessage}`
      };

      const chatMessage = protocolHandler.parsePrivMsg(ircMessage);

      expect(chatMessage.message).toBe(longMessage);
      expect(chatMessage.message.length).toBe(500);
    });

    it('should handle unicode characters in messages', () => {
      const unicodeMessage = '你好 🎉 тест';
      const ircMessage = {
        command: 'PRIVMSG',
        params: ['#testchannel', unicodeMessage],
        prefix: 'user!user@user.tmi.twitch.tv',
        raw: `:user!user@user.tmi.twitch.tv PRIVMSG #testchannel :${unicodeMessage}`
      };

      const chatMessage = protocolHandler.parsePrivMsg(ircMessage);

      expect(chatMessage.message).toBe(unicodeMessage);
    });

    it('should handle special characters in usernames', () => {
      const specialUsername = 'test_user123';
      const ircMessage = {
        command: 'PRIVMSG',
        params: ['#testchannel', 'Hello'],
        prefix: `${specialUsername}!${specialUsername}@${specialUsername}.tmi.twitch.tv`,
        raw: `:${specialUsername}!${specialUsername}@${specialUsername}.tmi.twitch.tv PRIVMSG #testchannel :Hello`
      };

      const chatMessage = protocolHandler.parsePrivMsg(ircMessage);

      expect(chatMessage.username).toBe(specialUsername);
    });
  });
});