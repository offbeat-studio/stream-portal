/**
 * Test Data Fixtures
 * Reusable test data for consistent testing
 */

import { ChatMessage, UserType, Badge, Emote } from '../../src/twitch/types/twitch';

export const testData = {
  // Valid IRC messages
  validIRCMessages: [
    ':testuser!testuser@testuser.tmi.twitch.tv PRIVMSG #testchannel :Hello world!',
    ':tmi.twitch.tv 001 testuser :Welcome, GLHF!',
    ':tmi.twitch.tv 002 testuser :Your host is tmi.twitch.tv',
    ':tmi.twitch.tv 003 testuser :This server is rather new',
    ':tmi.twitch.tv 004 testuser :-',
    ':tmi.twitch.tv 375 testuser :-',
    ':tmi.twitch.tv 372 testuser :You are in a maze of twisty passages, all alike.',
    ':tmi.twitch.tv 376 testuser :>',
    ':testuser!testuser@testuser.tmi.twitch.tv JOIN #testchannel',
    ':testuser!testuser@testuser.tmi.twitch.tv PART #testchannel'
  ],

  // Invalid channel names
  invalidChannelNames: [
    '',
    '  ',
    '#',
    '###invalid',
    'channel with spaces',
    'channel@invalid',
    'channel#invalid',
    '1234567890123456789012345678901' // too long
  ],

  // Valid channel names
  validChannelNames: [
    'testchannel',
    'test_channel',
    'test123',
    'channel_with_underscores',
    'a', // minimum length
    'averylongchannelname123' // reasonable length
  ],

  // Mock chat messages
  mockChatMessages: [
    {
      id: 'test-1',
      channel: 'testchannel',
      username: 'testuser',
      displayName: 'TestUser',
      message: 'Hello world!',
      timestamp: new Date('2024-01-01T00:00:00Z'),
      badges: [],
      emotes: [],
      color: undefined,
      userType: UserType.VIEWER,
      isSelf: false
    } as ChatMessage,
    {
      id: 'test-2',
      channel: 'testchannel',
      username: 'moderator',
      displayName: 'Moderator',
      message: 'Welcome to the stream!',
      timestamp: new Date('2024-01-01T00:01:00Z'),
      badges: [{ name: 'moderator', version: '1' }] as Badge[],
      emotes: [],
      color: '#FF0000',
      userType: UserType.MODERATOR,
      isSelf: false
    } as ChatMessage,
    {
      id: 'test-3',
      channel: 'testchannel',
      username: 'testuser',
      displayName: 'TestUser',
      message: 'This is my message',
      timestamp: new Date('2024-01-01T00:02:00Z'),
      badges: [],
      emotes: [],
      color: undefined,
      userType: UserType.VIEWER,
      isSelf: true
    } as ChatMessage
  ],

  // Authentication responses
  authResponses: {
    success: {
      access_token: 'test-access-token-12345',
      refresh_token: 'test-refresh-token-67890',
      expires_in: 3600,
      scope: ['chat:read', 'chat:edit'],
      token_type: 'bearer'
    },
    failure: {
      error: 'invalid_client',
      error_description: 'Client authentication failed'
    },
    refreshSuccess: {
      access_token: 'new-access-token-54321',
      refresh_token: 'new-refresh-token-09876',
      expires_in: 3600,
      scope: ['chat:read', 'chat:edit'],
      token_type: 'bearer'
    }
  },

  // Configuration test data
  configurations: {
    valid: {
      username: 'testuser',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:7777/auth/callback'
    },
    missingUsername: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:7777/auth/callback'
    },
    missingClientId: {
      username: 'testuser',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:7777/auth/callback'
    },
    empty: {}
  },

  // Error scenarios
  errorScenarios: {
    networkError: new Error('ENOTFOUND api.twitch.tv'),
    authenticationError: new Error('Unauthorized'),
    connectionTimeout: new Error('Connection timeout'),
    invalidToken: new Error('Invalid access token'),
    rateLimited: new Error('Rate limit exceeded')
  },

  // WebSocket events
  websocketEvents: {
    connectionOpen: 'open',
    connectionClose: 'close',
    connectionError: 'error',
    message: 'message'
  },

  // Sample emotes
  sampleEmotes: [
    {
      id: '25',
      name: 'Kappa',
      positions: [{ start: 0, end: 4 }]
    } as Emote,
    {
      id: '354',
      name: 'kreygasm',
      positions: [{ start: 6, end: 14 }]
    } as Emote
  ],

  // Sample badges
  sampleBadges: [
    { name: 'broadcaster', version: '1' } as Badge,
    { name: 'moderator', version: '1' } as Badge,
    { name: 'vip', version: '1' } as Badge,
    { name: 'subscriber', version: '12' } as Badge
  ],

  // Test timeouts and delays
  timeouts: {
    short: 100,
    medium: 500,
    long: 1000,
    veryLong: 5000
  }
};

// Helper functions for creating test data
export const createMockChatMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: `test-${Date.now()}`,
  channel: 'testchannel',
  username: 'testuser',
  displayName: 'TestUser',
  message: 'Test message',
  timestamp: new Date(),
  badges: [],
  emotes: [],
  color: undefined,
  userType: UserType.VIEWER,
  isSelf: false,
  ...overrides
});

export const createMockBadge = (name: string, version: string = '1'): Badge => ({
  name,
  version
});

export const createMockEmote = (id: string, name: string, start: number, end: number): Emote => ({
  id,
  name,
  positions: [{ start, end }]
});