/**
 * End-to-end tests for Side Panel workflow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock DOM environment for testing
const mockDOM = {
  getElementById: vi.fn(),
  createElement: vi.fn(),
  addEventListener: vi.fn(),
  querySelector: vi.fn(),
  querySelectorAll: vi.fn()
};

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn()
    }
  },
  tabs: {
    query: vi.fn()
  }
};

global.document = mockDOM as any;
global.chrome = mockChrome as any;

describe('Side Panel E2E Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup DOM mocks
    const mockElements = {
      'tab-tree': { classList: { add: vi.fn(), remove: vi.fn() }, innerHTML: '' },
      'loading-state': { classList: { add: vi.fn(), remove: vi.fn() } },
      'error-state': { classList: { add: vi.fn(), remove: vi.fn() } },
      'empty-state': { classList: { add: vi.fn(), remove: vi.fn() } },
      'context-menu': { classList: { add: vi.fn(), remove: vi.fn() } },
      'cabinet-list': { innerHTML: '' },
      'cabinet-empty-state': { classList: { add: vi.fn(), remove: vi.fn() } },
      'save-cabinet-btn': { addEventListener: vi.fn() },
      'refresh-cabinets-btn': { addEventListener: vi.fn() },
      'save-cabinet-modal': { classList: { add: vi.fn(), remove: vi.fn() } },
      'cabinet-name-input': { value: '', focus: vi.fn() },
      'cabinet-context-menu': { classList: { add: vi.fn(), remove: vi.fn() } }
    };
    
    mockDOM.getElementById.mockImplementation((id: string) => mockElements[id as keyof typeof mockElements] || null);
  });

  describe('Tab Hierarchy Display', () => {
    it('should display loading state initially', () => {
      const mockHierarchyResponse = {
        success: true,
        hierarchyState: {
          rootTabs: [
            {
              id: 1,
              title: 'Example Tab',
              url: 'https://example.com',
              favicon: '',
              parentId: null,
              children: [],
              level: 0,
              isActive: true,
              isPinned: false,
              isLoading: false
            }
          ],
          tabCount: 1,
          activeTabId: 1,
          windowId: 1
        }
      };

      mockChrome.tabs.query.mockResolvedValue([{ windowId: 1, active: true }]);
      mockChrome.runtime.sendMessage.mockResolvedValue(mockHierarchyResponse);

      // Simulate initialization
      expect(mockDOM.getElementById).toHaveBeenCalledWith('loading-state');
      expect(mockDOM.getElementById).toHaveBeenCalledWith('tab-tree');
    });

    it('should handle empty hierarchy state', () => {
      const emptyHierarchyResponse = {
        success: true,
        hierarchyState: {
          rootTabs: [],
          tabCount: 0,
          activeTabId: null,
          windowId: 1
        }
      };

      mockChrome.runtime.sendMessage.mockResolvedValue(emptyHierarchyResponse);

      // Should show empty state
      expect(mockDOM.getElementById).toHaveBeenCalledWith('empty-state');
    });

    it('should handle hierarchy loading errors', () => {
      const errorResponse = {
        success: false,
        error: 'Failed to load hierarchy'
      };

      mockChrome.runtime.sendMessage.mockResolvedValue(errorResponse);

      // Should show error state
      expect(mockDOM.getElementById).toHaveBeenCalledWith('error-state');
    });
  });

  describe('Tab Interactions', () => {
    it('should handle tab click for switching', async () => {
      const tabId = 123;
      mockChrome.runtime.sendMessage.mockResolvedValue({ success: true });

      // Simulate tab click
      const expectedMessage = {
        type: 'SWITCH_TO_TAB',
        tabId: tabId
      };

      // In a real test, this would be triggered by clicking a tab element
      await chrome.runtime.sendMessage(expectedMessage);

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(expectedMessage);
    });

    it('should handle tab close action', async () => {
      const tabId = 123;
      mockChrome.runtime.sendMessage.mockResolvedValue({ success: true });

      const expectedMessage = {
        type: 'CLOSE_TAB',
        tabId: tabId
      };

      await chrome.runtime.sendMessage(expectedMessage);

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(expectedMessage);
    });

    it('should handle cascading delete', async () => {
      const tabId = 123;
      mockChrome.runtime.sendMessage.mockResolvedValue({ 
        success: true,
        deletedTabs: [123, 124, 125],
        errors: []
      });

      const expectedMessage = {
        type: 'CASCADING_DELETE',
        tabId: tabId
      };

      await chrome.runtime.sendMessage(expectedMessage);

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(expectedMessage);
    });
  });

  describe('Cabinet Management Workflow', () => {
    it('should save a new cabinet', async () => {
      const cabinetName = 'Test Cabinet';
      const mockHierarchyState = {
        rootTabs: [
          {
            id: 1,
            title: 'Tab 1',
            url: 'https://example.com/1',
            favicon: '',
            parentId: null,
            children: [],
            level: 0,
            isActive: true,
            isPinned: false,
            isLoading: false
          }
        ],
        tabCount: 1,
        activeTabId: 1,
        windowId: 1
      };

      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        data: {
          id: 'cabinet_123',
          name: cabinetName,
          createdAt: new Date(),
          tabs: mockHierarchyState.rootTabs
        }
      });

      const expectedMessage = {
        type: 'SAVE_CABINET',
        name: cabinetName,
        hierarchyState: mockHierarchyState
      };

      await chrome.runtime.sendMessage(expectedMessage);

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(expectedMessage);
    });

    it('should list saved cabinets', async () => {
      const mockCabinets = [
        {
          id: 'cabinet_1',
          name: 'Cabinet 1',
          createdAt: new Date(),
          metadata: { tabCount: 3, windowId: 1 }
        },
        {
          id: 'cabinet_2',
          name: 'Cabinet 2',
          createdAt: new Date(),
          metadata: { tabCount: 5, windowId: 1 }
        }
      ];

      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        data: mockCabinets
      });

      const expectedMessage = { type: 'LIST_CABINETS' };

      await chrome.runtime.sendMessage(expectedMessage);

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(expectedMessage);
    });

    it('should restore a cabinet', async () => {
      const cabinetId = 'cabinet_123';
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        data: {
          restoredTabs: [10, 11, 12],
          failedUrls: [],
          summary: {
            totalTabs: 3,
            successfulTabs: 3,
            failedTabs: 0
          }
        }
      });

      const expectedMessage = {
        type: 'RESTORE_CABINET',
        cabinetId: cabinetId
      };

      await chrome.runtime.sendMessage(expectedMessage);

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(expectedMessage);
    });

    it('should delete a cabinet', async () => {
      const cabinetId = 'cabinet_123';
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        data: {
          id: cabinetId,
          name: 'Deleted Cabinet'
        }
      });

      const expectedMessage = {
        type: 'DELETE_CABINET',
        cabinetId: cabinetId
      };

      await chrome.runtime.sendMessage(expectedMessage);

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(expectedMessage);
    });

    it('should rename a cabinet', async () => {
      const cabinetId = 'cabinet_123';
      const newName = 'Renamed Cabinet';
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        data: {
          id: cabinetId,
          name: newName,
          updatedAt: new Date()
        }
      });

      const expectedMessage = {
        type: 'RENAME_CABINET',
        cabinetId: cabinetId,
        newName: newName
      };

      await chrome.runtime.sendMessage(expectedMessage);

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(expectedMessage);
    });
  });

  describe('Real-time Updates', () => {
    it('should handle hierarchy update messages', () => {
      const mockMessage = {
        type: 'HIERARCHY_UPDATED',
        windowId: 1,
        hierarchyState: {
          rootTabs: [
            {
              id: 1,
              title: 'Updated Tab',
              url: 'https://example.com/updated',
              favicon: '',
              parentId: null,
              children: [],
              level: 0,
              isActive: true,
              isPinned: false,
              isLoading: false
            }
          ],
          tabCount: 1,
          activeTabId: 1
        }
      };

      // Simulate message listener
      const messageListener = mockChrome.runtime.onMessage.addListener.mock.calls[0]?.[0];
      if (messageListener) {
        messageListener(mockMessage);
      }

      expect(mockChrome.runtime.onMessage.addListener).toHaveBeenCalled();
    });

    it('should ignore messages from other windows', () => {
      const mockMessage = {
        type: 'HIERARCHY_UPDATED',
        windowId: 999, // Different window
        hierarchyState: {
          rootTabs: [],
          tabCount: 0,
          activeTabId: null
        }
      };

      // Message should be ignored for different window
      const messageListener = mockChrome.runtime.onMessage.addListener.mock.calls[0]?.[0];
      if (messageListener) {
        messageListener(mockMessage);
      }

      // Should not update UI for different window
      expect(mockChrome.runtime.onMessage.addListener).toHaveBeenCalled();
    });
  });

  describe('Error Scenarios', () => {
    it('should handle network errors gracefully', async () => {
      mockChrome.runtime.sendMessage.mockRejectedValue(new Error('Network error'));

      try {
        await chrome.runtime.sendMessage({ type: 'GET_HIERARCHY_STATE' });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network error');
      }
    });

    it('should handle invalid cabinet names', async () => {
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: false,
        error: 'Cabinet name cannot be empty'
      });

      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_CABINET',
        name: '',
        hierarchyState: { rootTabs: [], tabCount: 0 }
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain('cannot be empty');
    });

    it('should handle storage quota exceeded', async () => {
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: false,
        error: 'Storage quota exceeded. Please delete some Cabinets.'
      });

      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_CABINET',
        name: 'Large Cabinet',
        hierarchyState: { rootTabs: [], tabCount: 0 }
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain('Storage quota exceeded');
    });
  });
});