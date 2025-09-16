// Jest setup file for Chrome extension testing

// Mock Chrome APIs globally
global.chrome = {
  tabs: {
    query: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    get: jest.fn(),
    onCreated: { addListener: jest.fn() },
    onRemoved: { addListener: jest.fn() },
    onUpdated: { addListener: jest.fn() },
    onActivated: { addListener: jest.fn() },
    onMoved: { addListener: jest.fn() },
    onAttached: { addListener: jest.fn() },
    onDetached: { addListener: jest.fn() }
  },
  windows: {
    onRemoved: { addListener: jest.fn() }
  },
  runtime: {
    onStartup: { addListener: jest.fn() },
    onInstalled: { addListener: jest.fn() },
    onMessage: { addListener: jest.fn() },
    sendMessage: jest.fn().mockResolvedValue({})
  },
  action: {
    onClicked: { addListener: jest.fn() }
  },
  sidePanel: {
    open: jest.fn()
  },
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue({})
    }
  }
};

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};