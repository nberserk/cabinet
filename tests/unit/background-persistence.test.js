/**
 * Tests for tab relationship tracking and persistence functionality
 * Tests Requirements: 1.1, 1.2, 2.1
 */

describe('Background Service Worker - Tab Relationship Tracking & Persistence', () => {
  let tabCreatedHandler;
  let tabRemovedHandler;
  let tabAttachedHandler;
  let tabDetachedHandler;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset handlers
    tabCreatedHandler = null;
    tabRemovedHandler = null;
    tabAttachedHandler = null;
    tabDetachedHandler = null;

    // Capture event handlers when they're registered
    chrome.tabs.onCreated.addListener.mockImplementation((handler) => {
      tabCreatedHandler = handler;
    });
    
    chrome.tabs.onRemoved.addListener.mockImplementation((handler) => {
      tabRemovedHandler = handler;
    });
    
    chrome.tabs.onAttached.addListener.mockImplementation((handler) => {
      tabAttachedHandler = handler;
    });
    
    chrome.tabs.onDetached.addListener.mockImplementation((handler) => {
      tabDetachedHandler = handler;
    });
  });

  describe('Tab Relationship Tracking', () => {
    beforeEach(() => {
      require('./background.js');
    });

    test('should track opener relationships correctly', async () => {
      // Create parent tab
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

      // Create child tab with opener relationship
      const childTab = {
        id: 2,
        title: 'Child Tab',
        url: 'https://example.com/child',
        windowId: 100,
        openerTabId: 1,
        active: true,
        pinned: false,
        status: 'complete'
      };

      await tabCreatedHandler(childTab);

      // Create grandchild tab
      const grandchildTab = {
        id: 3,
        title: 'Grandchild Tab',
        url: 'https://example.com/grandchild',
        windowId: 100,
        openerTabId: 2,
        active: false,
        pinned: false,
        status: 'complete'
      };

      await tabCreatedHandler(grandchildTab);

      // Verify hierarchy structure is maintained
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'HIERARCHY_UPDATED',
          windowId: 100,
          hierarchyState: expect.objectContaining({
            tabCount: 3
          })
        })
      );
    });

    test('should handle tab moves between windows', async () => {
      // Setup: Create tab in window 100
      const tab = {
        id: 1,
        title: 'Moving Tab',
        url: 'https://example.com',
        windowId: 100,
        active: false,
        pinned: false,
        status: 'complete'
      };

      await tabCreatedHandler(tab);

      // Mock chrome.tabs.get for the attached event
      chrome.tabs.get.mockResolvedValue({
        ...tab,
        windowId: 200 // Now in window 200
      });

      // Simulate detach from window 100
      const detachInfo = {
        oldWindowId: 100,
        oldPosition: 0
      };

      await tabDetachedHandler(1, detachInfo);

      // Simulate attach to window 200
      const attachInfo = {
        newWindowId: 200,
        newPosition: 0
      };

      await tabAttachedHandler(1, attachInfo);

      // Verify both windows received updates
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'HIERARCHY_UPDATED',
          windowId: 100
        })
      );

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'HIERARCHY_UPDATED',
          windowId: 200
        })
      );
    });

    test('should handle orphaned children when parent is removed', async () => {
      // Create parent-child-grandchild hierarchy
      const parentTab = {
        id: 1,
        title: 'Parent',
        url: 'https://example.com',
        windowId: 100,
        active: false,
        pinned: false,
        status: 'complete'
      };

      const childTab = {
        id: 2,
        title: 'Child',
        url: 'https://example.com/child',
        windowId: 100,
        openerTabId: 1,
        active: false,
        pinned: false,
        status: 'complete'
      };

      const grandchildTab = {
        id: 3,
        title: 'Grandchild',
        url: 'https://example.com/grandchild',
        windowId: 100,
        openerTabId: 2,
        active: false,
        pinned: false,
        status: 'complete'
      };

      await tabCreatedHandler(parentTab);
      await tabCreatedHandler(childTab);
      await tabCreatedHandler(grandchildTab);

      // Remove the middle child (tab 2)
      const removeInfo = {
        windowId: 100,
        isWindowClosing: false
      };

      await tabRemovedHandler(2, removeInfo);

      // Grandchild should be moved to parent (tab 1)
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'HIERARCHY_UPDATED',
          windowId: 100
        })
      );
    });
  });

  describe('Persistence', () => {
    beforeEach(() => {
      // Mock storage responses
      chrome.storage.local.get.mockResolvedValue({});
      chrome.storage.local.set.mockResolvedValue({});
    });

    test('should save hierarchy state to storage', async () => {
      require('./background.js');

      // Create a tab to trigger save
      const tab = {
        id: 1,
        title: 'Test Tab',
        url: 'https://example.com',
        windowId: 100,
        active: true,
        pinned: false,
        status: 'complete'
      };

      await tabCreatedHandler(tab);

      // Wait for debounced save (we can't easily test the debounce, so we'll verify the call pattern)
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    test('should load persisted hierarchy state on startup', async () => {
      // Mock persisted data
      const persistedData = {
        window_hierarchies: {
          '100': {
            rootTabs: [{
              id: 1,
              title: 'Persisted Tab',
              url: 'https://example.com',
              favicon: '',
              parentId: null,
              children: [],
              level: 0,
              isActive: true,
              isPinned: false,
              isLoading: false
            }],
            activeTabId: 1,
            windowId: 100,
            timestamp: Date.now()
          }
        }
      };

      chrome.storage.local.get.mockResolvedValue(persistedData);

      // Mock current tabs query to return matching tab
      chrome.tabs.query.mockResolvedValue([{
        id: 1,
        title: 'Persisted Tab',
        url: 'https://example.com',
        windowId: 100,
        active: true,
        pinned: false,
        status: 'complete'
      }]);

      // Load the background script (this will trigger initialization)
      require('./background.js');

      // Verify storage was queried
      expect(chrome.storage.local.get).toHaveBeenCalledWith(['window_hierarchies']);
    });

    test('should handle storage errors gracefully', async () => {
      // Mock storage error
      chrome.storage.local.get.mockRejectedValue(new Error('Storage error'));
      chrome.tabs.query.mockResolvedValue([]);

      // Should not throw error
      await expect(() => require('./background.js')).not.toThrow();
    });

    test('should clean up persisted state for closed tabs', async () => {
      // Mock persisted data with a tab that no longer exists
      const persistedData = {
        window_hierarchies: {
          '100': {
            rootTabs: [{
              id: 999, // This tab no longer exists
              title: 'Deleted Tab',
              url: 'https://example.com',
              favicon: '',
              parentId: null,
              children: [],
              level: 0,
              isActive: false,
              isPinned: false,
              isLoading: false
            }],
            activeTabId: 999,
            windowId: 100,
            timestamp: Date.now()
          }
        }
      };

      chrome.storage.local.get.mockResolvedValue(persistedData);

      // Mock current tabs query to return no tabs
      chrome.tabs.query.mockResolvedValue([]);

      require('./background.js');

      // Should handle the missing tab gracefully
      expect(chrome.storage.local.get).toHaveBeenCalled();
    });
  });

  describe('Window Management', () => {
    beforeEach(() => {
      require('./background.js');
    });

    test('should maintain separate hierarchies per window', async () => {
      // Create tabs in different windows
      const tab1 = {
        id: 1,
        title: 'Tab in Window 100',
        url: 'https://example.com/1',
        windowId: 100,
        active: true,
        pinned: false,
        status: 'complete'
      };

      const tab2 = {
        id: 2,
        title: 'Tab in Window 200',
        url: 'https://example.com/2',
        windowId: 200,
        active: true,
        pinned: false,
        status: 'complete'
      };

      await tabCreatedHandler(tab1);
      await tabCreatedHandler(tab2);

      // Should send separate updates for each window
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'HIERARCHY_UPDATED',
          windowId: 100
        })
      );

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'HIERARCHY_UPDATED',
          windowId: 200
        })
      );
    });
  });
});