// jest.setup.js

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-worker-url');
global.URL.revokeObjectURL = jest.fn();

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  group: jest.fn(),
  groupEnd: jest.fn(),
  groupCollapsed: jest.fn(),
  info: jest.fn(),
  table: jest.fn(),
};