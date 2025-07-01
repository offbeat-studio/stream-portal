/**
 * Jest Test Setup
 * Global test configuration and mocks
 */

import { jest } from '@jest/globals';

// Mock VSCode API globally
const mockStatusBarItem = {
  text: '',
  tooltip: '',
  backgroundColor: undefined,
  show: jest.fn(),
  hide: jest.fn(),
  dispose: jest.fn()
};

const mockConfiguration = {
  get: jest.fn((key: string, defaultValue?: any) => {
    const config: Record<string, any> = {
      'username': 'testuser',
      'clientId': 'test-client-id',
      'clientSecret': 'test-client-secret',
      'redirectUri': 'http://localhost:7777/auth/callback',
      'autoConnect': false,
      'fontSize': 14,
      'showTimestamps': true,
      'showBadges': true,
      'autoScroll': true,
      'soundNotifications': false,
      'recentChannels': ['testchannel1', 'testchannel2']
    };
    return config[key] ?? defaultValue;
  }),
  update: jest.fn(() => Promise.resolve()),
  inspect: jest.fn()
};

const mockVSCode = {
  window: {
    showInformationMessage: jest.fn(() => Promise.resolve()),
    showErrorMessage: jest.fn(() => Promise.resolve()),
    showWarningMessage: jest.fn(() => Promise.resolve()),
    showInputBox: jest.fn(() => Promise.resolve('testchannel')),
    createStatusBarItem: jest.fn(() => mockStatusBarItem),
    registerWebviewViewProvider: jest.fn(),
    activeColorTheme: { kind: 1 }
  },
  workspace: {
    getConfiguration: jest.fn(() => mockConfiguration)
  },
  commands: {
    registerCommand: jest.fn(),
    executeCommand: jest.fn(() => Promise.resolve())
  },
  StatusBarAlignment: {
    Right: 2,
    Left: 1
  },
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3
  },
  ThemeColor: jest.fn((color: string) => ({ id: color })),
  Uri: {
    joinPath: jest.fn((...paths: any[]) => ({ 
      toString: () => paths.join('/'),
      fsPath: paths.join('/')
    }))
  }
};

// Mock the vscode module
jest.mock('vscode', () => mockVSCode, { virtual: true });

// Mock WebSocket
(global as any).WebSocket = jest.fn().mockImplementation(() => ({
  readyState: 1, // WebSocket.OPEN
  send: jest.fn(),
  close: jest.fn(),
  on: jest.fn(),
  removeAllListeners: jest.fn()
}));

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Global test utilities
declare global {
  var testUtils: {
    mockVSCode: typeof mockVSCode;
    mockConfiguration: typeof mockConfiguration;
    mockStatusBarItem: typeof mockStatusBarItem;
    createMockWebSocket: () => any;
    sleep: (ms: number) => Promise<void>;
  };
}

global.testUtils = {
  mockVSCode,
  mockConfiguration,
  mockStatusBarItem,
  createMockWebSocket: () => ({
    readyState: 1, // WebSocket.OPEN
    send: jest.fn(),
    close: jest.fn(),
    on: jest.fn(),
    removeAllListeners: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }),
  sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
};

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});