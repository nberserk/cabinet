/**
 * Integration tests for background service worker tab event handling
 * Tests Chrome tabs API event listeners and hierarchy state management
 */

describe('Background Service Worker - Tab Event Handling', () => {
  let tabCreatedHandler;
  let tabRemovedHandler;
  let tabUpdatedHandler;
  let tabActivatedHandler;
  let tabMovedHandler;
  let messageHandler;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset handlers
    tabCreatedHandler = null;
    tabRemovedHandler = null;
    tabUpdatedHandler = null;
    tabActivatedHandler = null;
    tabMovedHandler = null;
    messageHandler = null;

    // Capture event handlers when they're registered
    chrome.tabs.onCreated.addListener.mockImplementation((handler) => {
      tabCreatedHandler = handler;
    });
    
    chrome.tabs.onRemoved.addListener.mockImplementation((handler) => {
      tabRemovedHandler = handler;
    });
    
    chrome.tabs.onUpdated.addListener.mockImplementation((handler) => {
      tabUpdatedHandler = handler;
    });
    
    chrome.tabs.onActivated.addListener.mockImplementation((handler) => {
      tabActivatedHandler = handler;
    });
    
    chrome.tabs.onMoved.addListener.mockImplementation((handler) => {
      tabMovedHandler = handler;
    });
    
    chrome.runtime.onMessage.addListener.mockImplementation((handler) => {
      messageHandler = handler;
    });
  });

  describe('Tab Creation Events', () => {
    beforeEach(() => {
      // Load the background script to register handlers
      require('./background.js');
    });

    test('should handle tab creation with opener relationship', async () => {
      // Setup: Create parent tab first
      const parentTab = {
        id: 1,
        title: 'Parent Tab',
        url: 'https://example.com',
        windowId: 100,
        active: false,
        pinned: false,
        status: 'complete'
      };

      await tabCreatedHandler(parentTab);

      // Test: Create child tab
      const childTab = {
        id: 2,
        title: 'Child Tab',
        url: 'https://example.com/child',
        windowId: 100,
        openerTabId: 1,
        active: true,
        pinned: false,
        status: 'loading'
      };

      await tabCreatedHandler(childTab);

      // Verify: Message should be sent with hierarchy update
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'HIERARCHY_UPDATED',
          windowId: 100
        })
      );
    });

    test('should handle tab creation without opener (root tab)', async () => {
      const rootTab = {
        id: 1,
        title: 'Root Tab',
        url: 'https://example.com',
        windowId: 100,
        active: true,
        pinned: false,
        status: 'complete'
      };

      await tabCreatedHandler(rootTab);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'HIERARCHY_UPDATED',
          windowId: 100
        })
      );
    });

    test('should handle restricted tab creation gracefully', async () => {
      const restrictedTab = {
        id: 1,
        title: 'Chrome Settings',
        url: 'chrome://settings/',
        windowId: 100,
        active: false,
        pinned: false,
        status: 'complete'
      };

      // Should not throw error
      await expect(tabCreatedHandler(restrictedTab)).resolves.not.toThrow();
    });

    test('should handle tab creation without ID gracefully', async () => {
      const invalidTab = {
        title: 'Invalid Tab',
        url: 'https://example.com',
        windowId: 100,
        active: false,
        pinned: false,
        status: 'complete'
      };

      // Should not throw error and should log warning
      await expect(tabCreatedHandler(invalidTab)).resolves.not.toThrow();
    });
  });

  describe('Tab Removal Events', () => {
    beforeEach(() => {
      require('./background.js');
    });

    test('should handle tab removal with children (orphaning)', async () => {
      // Setup: Create parent and child tabs
      const parentTab = {
        id: 1,
        title: 'Parent Tab',
        url: 'https://example.com',
        windowId: 100,
        active: false,
        pinned: false,
        status: 'complete'
      };

      const childTab = {
        id: 2,
        title: 'Child Tab',
        url: 'https://example.com/child',
        windowId: 100,
        openerTabId: 1,
        active: false,
        pinned: false,
        status: 'complete'
      };

      await tabCreatedHandler(parentTab);
      await tabCreatedHandler(childTab);

      // Test: Remove parent tab
      const removeInfo = {
        windowId: 100,
        isWindowClosing: false
      };

      await tabRemovedHandler(1, removeInfo);

      // Verify: Child should be orphaned and moved to root
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'HIERARCHY_UPDATED',
          windowId: 100
        })
      );
    });

    test('should handle removal of non-existent tab gracefully', async () => {
      const removeInfo = {
        windowId: 100,
        isWindowClosing: false
      };

      // Should not throw error
      await expect(tabRemovedHandler(999, removeInfo)).resolves.not.toThrow();
    });
  });

  describe('Tab Update Events', () => {
    beforeEach(() => {
      require('./background.js');
    });

    test('should handle tab title updates', async () => {
      // Setup: Create tab
      const tab = {
        id: 1,
        title: 'Original Title',
        url: 'https://example.com',
        windowId: 100,
        active: false,
        pinned: false,
        status: 'complete'
      };

      await tabCreatedHandler(tab);

      // Test: Update tab title
      const changeInfo = {
        title: 'Updated Title'
      };

      const updatedTab = { ...tab, title: 'Updated Title' };

      await tabUpdatedHandler(1, changeInfo, updatedTab);

      // Should trigger hierarchy update
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'HIERARCHY_UPDATED',
          windowId: 100
        })
      );
    });

    test('should handle tab loading status changes', async () => {
      // Setup: Create tab
      const tab = {
        id: 1,
        title: 'Test Tab',
        url: 'https://example.com',
        windowId: 100,
        active: false,
        pinned: false,
        status: 'complete'
      };

      await tabCreatedHandler(tab);

      // Test: Update loading status
      const changeInfo = {
        status: 'loading'
      };

      const updatedTab = { ...tab, status: 'loading' };

      await tabUpdatedHandler(1, changeInfo, updatedTab);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'HIERARCHY_UPDATED',
          windowId: 100
        })
      );
    });
  });

  describe('Tab Activation Events', () => {
    beforeEach(() => {
      require('./background.js');
    });

    test('should handle tab activation', async () => {
      // Setup: Create tabs
      const tab1 = {
        id: 1,
        title: 'Tab 1',
        url: 'https://example.com/1',
        windowId: 100,
        active: true,
        pinned: false,
        status: 'complete'
      };

      const tab2 = {
        id: 2,
        title: 'Tab 2',
        url: 'https://example.com/2',
        windowId: 100,
        active: false,
        pinned: false,
        status: 'complete'
      };

      await tabCreatedHandler(tab1);
      await tabCreatedHandler(tab2);

      // Test: Activate second tab
      const activeInfo = {
        tabId: 2,
        windowId: 100
      };

      await tabActivatedHandler(activeInfo);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'HIERARCHY_UPDATED',
          windowId: 100
        })
      );
    });
  });

  describe('Message Handling', () => {
    beforeEach(() => {
      require('./background.js');
    });

    test('should handle GET_HIERARCHY_STATE message', async () => {
      const message = {
        type: 'GET_HIERARCHY_STATE',
        windowId: 100
      };

      const sender = {};
      const sendResponse = jest.fn();

      await messageHandler(message, sender, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          hierarchyState: expect.any(Object)
        })
      );
    });

    test('should handle SWITCH_TO_TAB message', async () => {
      const message = {
        type: 'SWITCH_TO_TAB',
        tabId: 1
      };

      const sender = {};
      const sendResponse = jest.fn();

      await messageHandler(message, sender, sendResponse);

      expect(chrome.tabs.update).toHaveBeenCalledWith(1, { active: true });
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('should handle CLOSE_TAB message', async () => {
      const message = {
        type: 'CLOSE_TAB',
        tabId: 1
      };

      const sender = {};
      const sendResponse = jest.fn();

      await messageHandler(message, sender, sendResponse);

      expect(chrome.tabs.remove).toHaveBeenCalledWith(1);
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('should handle unknown message type', async () => {
      const message = {
        type: 'UNKNOWN_MESSAGE'
      };

      const sender = {};
      const sendResponse = jest.fn();

      await messageHandler(message, sender, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Unknown message type'
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      require('./background.js');
    });

    test('should handle Chrome API errors gracefully', async () => {
      // Mock Chrome API to throw error
      chrome.tabs.update.mockRejectedValue(new Error('Tab not found'));

      const message = {
        type: 'SWITCH_TO_TAB',
        tabId: 999
      };

      const sender = {};
      const sendResponse = jest.fn();

      await messageHandler(message, sender, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Tab not found'
      });
    });

    test('should handle permission errors', async () => {
      // Mock permission error
      chrome.tabs.query.mockRejectedValue(new Error('Permission denied'));

      // Should not crash the service worker
      await expect(tabCreatedHandler({
        id: 1,
        title: 'Test',
        url: 'https://example.com',
        windowId: 100
      })).resolves.not.toThrow();
    });
  });
});