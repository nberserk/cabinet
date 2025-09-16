/**
 * Unit tests for Tab Manager
 */

import { TabManager, TabAction } from './tab-manager';
import { TabNode } from './types';

// Mock DOM environment
const mockElement = {
  addEventListener: jest.fn(),
  querySelector: jest.fn(),
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn()
  },
  style: {},
  tabIndex: 0,
  dataset: {},
  draggable: false,
  getBoundingClientRect: jest.fn(() => ({
    left: 100,
    top: 100,
    width: 200,
    height: 30,
    right: 300,
    bottom: 130
  }))
};

const mockDocument = {
  addEventListener: jest.fn(),
  createElement: jest.fn(() => mockElement),
  body: {
    appendChild: jest.fn()
  },
  querySelectorAll: jest.fn(() => []),
  dispatchEvent: jest.fn()
};

global.document = mockDocument as any;
global.window = {
  innerWidth: 1024,
  innerHeight: 768,
  setTimeout: jest.fn((fn, delay) => {
    fn();
    return 1;
  }),
  clearTimeout: jest.fn(),
  close: jest.fn()
} as any;

describe('TabManager', () => {
  let tabManager: TabManager;
  let mockOnAction: jest.Mock;

  beforeEach(() => {
    tabManager = new TabManager();
    mockOnAction = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    tabManager.destroy();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      expect(tabManager).toBeInstanceOf(TabManager);
      expect(mockDocument.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockDocument.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should initialize with custom options', () => {
      const customManager = new TabManager({
        enableContextMenu: false,
        enableDragDrop: false,
        enableHoverEffects: false,
        autoClosePopup: true
      });

      expect(customManager).toBeInstanceOf(TabManager);
      customManager.destroy();
    });
  });

  describe('attachTabEventListeners', () => {
    let mockTabElement: any;
    let mockTab: TabNode;

    beforeEach(() => {
      mockTabElement = {
        ...mockElement,
        querySelector: jest.fn(() => mockElement)
      };

      mockTab = {
        id: 1,
        title: 'Test Tab',
        url: 'https://example.com',
        favicon: '',
        parentId: null,
        children: [],
        level: 0,
        isActive: false,
        isPinned: false,
        isLoading: false
      };
    });

    it('should attach click handler for regular tabs', () => {
      tabManager.attachTabEventListeners(mockTabElement, mockTab, mockOnAction);

      expect(mockTabElement.querySelector).toHaveBeenCalledWith('.tree-content');
      expect(mockElement.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should not attach click handler for restricted tabs', () => {
      const restrictedTab = {
        ...mockTab,
        url: 'chrome://settings/'
      };

      tabManager.attachTabEventListeners(mockTabElement, restrictedTab, mockOnAction);

      // Should still query for content but set cursor to default
      expect(mockTabElement.querySelector).toHaveBeenCalledWith('.tree-content');
    });

    it('should attach context menu handler when enabled', () => {
      tabManager.attachTabEventListeners(mockTabElement, mockTab, mockOnAction);

      expect(mockElement.addEventListener).toHaveBeenCalledWith('contextmenu', expect.any(Function));
    });

    it('should attach hover handlers when enabled', () => {
      tabManager.attachTabEventListeners(mockTabElement, mockTab, mockOnAction);

      expect(mockElement.addEventListener).toHaveBeenCalledWith('mouseenter', expect.any(Function));
      expect(mockElement.addEventListener).toHaveBeenCalledWith('mouseleave', expect.any(Function));
    });

    it('should attach drag and drop handlers when enabled', () => {
      tabManager.attachTabEventListeners(mockTabElement, mockTab, mockOnAction);

      expect(mockTabElement.addEventListener).toHaveBeenCalledWith('dragstart', expect.any(Function));
      expect(mockTabElement.addEventListener).toHaveBeenCalledWith('dragend', expect.any(Function));
      expect(mockTabElement.addEventListener).toHaveBeenCalledWith('dragover', expect.any(Function));
      expect(mockTabElement.addEventListener).toHaveBeenCalledWith('drop', expect.any(Function));
    });

    it('should attach keyboard handlers', () => {
      tabManager.attachTabEventListeners(mockTabElement, mockTab, mockOnAction);

      expect(mockTabElement.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(mockTabElement.tabIndex).toBe(0);
    });
  });

  describe('click handling', () => {
    it('should trigger switch action on tab click', () => {
      const mockTabElement = {
        ...mockElement,
        querySelector: jest.fn(() => ({
          ...mockElement,
          addEventListener: jest.fn((event, handler) => {
            if (event === 'click') {
              // Simulate click
              handler({ target: mockElement, stopPropagation: jest.fn() });
            }
          })
        }))
      };

      const mockTab = {
        id: 1,
        title: 'Test Tab',
        url: 'https://example.com',
        favicon: '',
        parentId: null,
        children: [],
        level: 0,
        isActive: false,
        isPinned: false,
        isLoading: false
      };

      tabManager.attachTabEventListeners(mockTabElement, mockTab, mockOnAction);

      expect(mockOnAction).toHaveBeenCalledWith({
        type: 'switch',
        tabId: 1
      });
    });
  });

  describe('context menu', () => {
    it('should show context menu on right click', () => {
      const mockTabElement = {
        ...mockElement,
        querySelector: jest.fn(() => ({
          ...mockElement,
          addEventListener: jest.fn((event, handler) => {
            if (event === 'contextmenu') {
              // Simulate right click
              handler({
                preventDefault: jest.fn(),
                pageX: 150,
                pageY: 150
              });
            }
          })
        }))
      };

      const mockTab = {
        id: 1,
        title: 'Test Tab',
        url: 'https://example.com',
        favicon: '',
        parentId: null,
        children: [],
        level: 0,
        isActive: false,
        isPinned: false,
        isLoading: false
      };

      tabManager.attachTabEventListeners(mockTabElement, mockTab, mockOnAction);

      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(mockDocument.body.appendChild).toHaveBeenCalled();
    });

    it('should generate correct context menu items for regular tab', () => {
      const mockTab = {
        id: 1,
        title: 'Test Tab',
        url: 'https://example.com',
        favicon: '',
        parentId: null,
        children: [],
        level: 0,
        isActive: false,
        isPinned: false,
        isLoading: false
      };

      // Access private method through any cast for testing
      const items = (tabManager as any).getContextMenuItems(mockTab);

      expect(items).toHaveLength(5);
      expect(items[0].label).toBe('Switch to tab');
      expect(items[1].label).toBe('Close tab');
      expect(items[2].label).toBe('Close children');
      expect(items[3].label).toBe('Duplicate tab');
      expect(items[4].label).toBe('Pin tab');
    });

    it('should disable actions for restricted tabs', () => {
      const restrictedTab = {
        id: 1,
        title: 'Chrome Settings',
        url: 'chrome://settings/',
        favicon: '',
        parentId: null,
        children: [],
        level: 0,
        isActive: false,
        isPinned: false,
        isLoading: false
      };

      const items = (tabManager as any).getContextMenuItems(restrictedTab);

      expect(items[0].disabled).toBe(true); // Switch to tab
      expect(items[1].disabled).toBe(true); // Close tab
      expect(items[3].disabled).toBe(true); // Duplicate tab
    });
  });

  describe('keyboard navigation', () => {
    it('should handle Enter key to switch tab', () => {
      const mockTabElement = {
        ...mockElement,
        addEventListener: jest.fn((event, handler) => {
          if (event === 'keydown') {
            // Simulate Enter key
            handler({
              key: 'Enter',
              preventDefault: jest.fn()
            });
          }
        })
      };

      const mockTab = {
        id: 1,
        title: 'Test Tab',
        url: 'https://example.com',
        favicon: '',
        parentId: null,
        children: [],
        level: 0,
        isActive: false,
        isPinned: false,
        isLoading: false
      };

      tabManager.attachTabEventListeners(mockTabElement, mockTab, mockOnAction);

      expect(mockOnAction).toHaveBeenCalledWith({
        type: 'switch',
        tabId: 1
      });
    });

    it('should handle Delete key to close tab', () => {
      const mockTabElement = {
        ...mockElement,
        addEventListener: jest.fn((event, handler) => {
          if (event === 'keydown') {
            // Simulate Delete key
            handler({
              key: 'Delete',
              preventDefault: jest.fn()
            });
          }
        })
      };

      const mockTab = {
        id: 1,
        title: 'Test Tab',
        url: 'https://example.com',
        favicon: '',
        parentId: null,
        children: [],
        level: 0,
        isActive: false,
        isPinned: false,
        isLoading: false
      };

      tabManager.attachTabEventListeners(mockTabElement, mockTab, mockOnAction);

      expect(mockOnAction).toHaveBeenCalledWith({
        type: 'close',
        tabId: 1
      });
    });
  });

  describe('drag and drop', () => {
    it('should set draggable attribute for non-restricted tabs', () => {
      const mockTabElement = {
        ...mockElement,
        draggable: false
      };

      const mockTab = {
        id: 1,
        title: 'Test Tab',
        url: 'https://example.com',
        favicon: '',
        parentId: null,
        children: [],
        level: 0,
        isActive: false,
        isPinned: false,
        isLoading: false
      };

      tabManager.attachTabEventListeners(mockTabElement, mockTab, mockOnAction);

      expect(mockTabElement.draggable).toBe(true);
    });

    it('should not set draggable for restricted tabs', () => {
      const mockTabElement = {
        ...mockElement,
        draggable: false
      };

      const restrictedTab = {
        id: 1,
        title: 'Chrome Settings',
        url: 'chrome://settings/',
        favicon: '',
        parentId: null,
        children: [],
        level: 0,
        isActive: false,
        isPinned: false,
        isLoading: false
      };

      tabManager.attachTabEventListeners(mockTabElement, restrictedTab, mockOnAction);

      expect(mockTabElement.draggable).toBe(false);
    });
  });

  describe('hover effects', () => {
    it('should add hover class on mouse enter', () => {
      const mockTabContent = {
        ...mockElement,
        classList: {
          add: jest.fn(),
          remove: jest.fn()
        }
      };

      const mockTabElement = {
        ...mockElement,
        querySelector: jest.fn(() => mockTabContent)
      };

      const mockTab = {
        id: 1,
        title: 'Test Tab',
        url: 'https://example.com',
        favicon: '',
        parentId: null,
        children: [],
        level: 0,
        isActive: false,
        isPinned: false,
        isLoading: false
      };

      // Mock the hover handler
      let hoverHandler: Function;
      mockTabContent.addEventListener = jest.fn((event, handler) => {
        if (event === 'mouseenter') {
          hoverHandler = handler;
        }
      });

      tabManager.attachTabEventListeners(mockTabElement, mockTab, mockOnAction);

      // Simulate hover
      if (hoverHandler) {
        hoverHandler();
      }

      expect(mockTabContent.classList.add).toHaveBeenCalledWith('hover');
    });
  });

  describe('cleanup', () => {
    it('should clean up resources on destroy', () => {
      tabManager.destroy();

      // Should not throw any errors
      expect(() => tabManager.destroy()).not.toThrow();
    });
  });
});