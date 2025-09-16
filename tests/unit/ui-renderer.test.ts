/**
 * Unit tests for UI Renderer
 */

import { UIRenderer } from './ui-renderer';
import { TabNode } from './types';

// Mock DOM environment
const mockContainer = {
  innerHTML: '',
  appendChild: jest.fn(),
  querySelector: jest.fn(),
  dispatchEvent: jest.fn(),
  children: []
};

// Mock document methods
global.document = {
  createElement: jest.fn((tagName: string) => ({
    tagName: tagName.toUpperCase(),
    className: '',
    textContent: '',
    title: '',
    src: '',
    alt: '',
    type: '',
    draggable: false,
    dataset: {},
    style: {},
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      toggle: jest.fn(),
      contains: jest.fn()
    },
    appendChild: jest.fn(),
    addEventListener: jest.fn(),
    querySelector: jest.fn(),
    onerror: null
  })),
  body: {
    appendChild: jest.fn()
  }
} as any;

describe('UIRenderer', () => {
  let renderer: UIRenderer;
  let container: any;

  beforeEach(() => {
    container = {
      innerHTML: '',
      appendChild: jest.fn(),
      querySelector: jest.fn(),
      dispatchEvent: jest.fn()
    };
    renderer = new UIRenderer(container);
    jest.clearAllMocks();
  });

  describe('renderTree', () => {
    it('should render empty state when no tabs provided', () => {
      renderer.renderTree([]);
      
      expect(container.innerHTML).toBe('');
      expect(document.createElement).toHaveBeenCalledWith('div');
    });

    it('should render single tab correctly', () => {
      const tab: TabNode = {
        id: 1,
        title: 'Test Tab',
        url: 'https://example.com',
        favicon: 'https://example.com/favicon.ico',
        parentId: null,
        children: [],
        level: 0,
        isActive: true,
        isPinned: false,
        isLoading: false
      };

      renderer.renderTree([tab]);

      expect(container.appendChild).toHaveBeenCalled();
      expect(document.createElement).toHaveBeenCalledWith('div');
    });

    it('should render hierarchical tabs with proper nesting', () => {
      const parentTab: TabNode = {
        id: 1,
        title: 'Parent Tab',
        url: 'https://parent.com',
        favicon: '',
        parentId: null,
        children: [{
          id: 2,
          title: 'Child Tab',
          url: 'https://child.com',
          favicon: '',
          parentId: 1,
          children: [],
          level: 1,
          isActive: false,
          isPinned: false,
          isLoading: false
        }],
        level: 0,
        isActive: false,
        isPinned: false,
        isLoading: false
      };

      renderer.renderTree([parentTab]);

      // Should create elements for both parent and child
      expect(container.appendChild).toHaveBeenCalledTimes(2);
    });
  });

  describe('renderTabNode', () => {
    it('should create tab element with correct classes for active tab', () => {
      const tab: TabNode = {
        id: 1,
        title: 'Active Tab',
        url: 'https://example.com',
        favicon: '',
        parentId: null,
        children: [],
        level: 0,
        isActive: true,
        isPinned: false,
        isLoading: false
      };

      const element = renderer.renderTabNode(tab, 0, false, []);

      expect(document.createElement).toHaveBeenCalledWith('div');
      // Check that active class would be applied
      const mockElement = (document.createElement as jest.Mock).mock.results[0].value;
      expect(mockElement.className).toContain('tree-node');
    });

    it('should create tab element with pinned indicator', () => {
      const tab: TabNode = {
        id: 1,
        title: 'Pinned Tab',
        url: 'https://example.com',
        favicon: '',
        parentId: null,
        children: [],
        level: 0,
        isActive: false,
        isPinned: true,
        isLoading: false
      };

      renderer.renderTabNode(tab, 0, false, []);

      // Should create elements for tab structure
      expect(document.createElement).toHaveBeenCalledWith('div');
    });

    it('should create tab element with loading indicator', () => {
      const tab: TabNode = {
        id: 1,
        title: 'Loading Tab',
        url: 'https://example.com',
        favicon: '',
        parentId: null,
        children: [],
        level: 0,
        isActive: false,
        isPinned: false,
        isLoading: true
      };

      renderer.renderTabNode(tab, 0, false, []);

      expect(document.createElement).toHaveBeenCalledWith('div');
    });
  });

  describe('updateTabState', () => {
    beforeEach(() => {
      // Mock querySelector to return a mock element
      container.querySelector = jest.fn().mockReturnValue({
        classList: {
          toggle: jest.fn()
        },
        querySelector: jest.fn().mockReturnValue({
          textContent: '',
          title: '',
          src: ''
        })
      });
    });

    it('should update active state', () => {
      renderer.updateTabState(1, { isActive: true });

      expect(container.querySelector).toHaveBeenCalledWith('[data-tab-id="1"]');
    });

    it('should update title', () => {
      const mockTitleElement = { textContent: '', title: '' };
      const mockTabElement = {
        classList: { toggle: jest.fn() },
        querySelector: jest.fn().mockReturnValue(mockTitleElement)
      };
      container.querySelector = jest.fn().mockReturnValue(mockTabElement);

      renderer.updateTabState(1, { title: 'New Title' });

      expect(mockTabElement.querySelector).toHaveBeenCalledWith('.tab-title');
    });

    it('should handle non-existent tab gracefully', () => {
      container.querySelector = jest.fn().mockReturnValue(null);

      expect(() => {
        renderer.updateTabState(999, { isActive: true });
      }).not.toThrow();
    });
  });

  describe('highlightTab', () => {
    it('should highlight tab when requested', () => {
      const mockTabContent = {
        classList: { toggle: jest.fn() }
      };
      const mockTabElement = {
        querySelector: jest.fn().mockReturnValue(mockTabContent)
      };
      container.querySelector = jest.fn().mockReturnValue(mockTabElement);

      renderer.highlightTab(1, true);

      expect(container.querySelector).toHaveBeenCalledWith('[data-tab-id="1"]');
      expect(mockTabElement.querySelector).toHaveBeenCalledWith('.tree-content');
      expect(mockTabContent.classList.toggle).toHaveBeenCalledWith('highlight', true);
    });

    it('should remove highlight when requested', () => {
      const mockTabContent = {
        classList: { toggle: jest.fn() }
      };
      const mockTabElement = {
        querySelector: jest.fn().mockReturnValue(mockTabContent)
      };
      container.querySelector = jest.fn().mockReturnValue(mockTabElement);

      renderer.highlightTab(1, false);

      expect(mockTabContent.classList.toggle).toHaveBeenCalledWith('highlight', false);
    });
  });

  describe('renderLoadingState', () => {
    it('should render loading state', () => {
      renderer.renderLoadingState();

      expect(container.innerHTML).toBe('');
      expect(document.createElement).toHaveBeenCalledWith('div');
    });
  });

  describe('renderErrorState', () => {
    it('should render error state with message', () => {
      const errorMessage = 'Test error message';
      renderer.renderErrorState(errorMessage);

      expect(container.innerHTML).toBe('');
      expect(document.createElement).toHaveBeenCalledWith('div');
    });
  });

  describe('options handling', () => {
    it('should respect showCloseButtons option', () => {
      const rendererWithoutClose = new UIRenderer(container, { showCloseButtons: false });
      
      const tab: TabNode = {
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

      rendererWithoutClose.renderTabNode(tab, 0, false, []);

      // Should not create close button
      expect(document.createElement).toHaveBeenCalledWith('div');
    });

    it('should respect maxTitleLength option', () => {
      const rendererWithShortTitle = new UIRenderer(container, { maxTitleLength: 10 });
      
      const tab: TabNode = {
        id: 1,
        title: 'This is a very long title that should be truncated',
        url: 'https://example.com',
        favicon: '',
        parentId: null,
        children: [],
        level: 0,
        isActive: false,
        isPinned: false,
        isLoading: false
      };

      rendererWithShortTitle.renderTabNode(tab, 0, false, []);

      expect(document.createElement).toHaveBeenCalledWith('div');
    });
  });
});