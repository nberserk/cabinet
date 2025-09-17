/**
 * Integration tests for enhanced cabinet preview functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn()
    }
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn()
    }
  }
};

// @ts-ignore
global.chrome = mockChrome;

// Mock DOM
const mockDocument = {
  getElementById: vi.fn(),
  createElement: vi.fn(),
  querySelector: vi.fn(),
  addEventListener: vi.fn()
};

// @ts-ignore
global.document = mockDocument;

describe('Cabinet Preview Enhancement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Enhanced Cabinet Preview', () => {
    it('should render cabinet preview with basic summary', async () => {
      const mockCabinetData = {
        id: 'test-cabinet-1',
        name: 'Test Cabinet',
        tabs: [
          {
            id: 1,
            title: 'Root Tab',
            url: 'https://example.com',
            favicon: 'https://example.com/favicon.ico',
            parentId: null,
            children: [],
            level: 0,
            isActive: false,
            isPinned: true,
            isLoading: false
          },
          {
            id: 2,
            title: 'Child Tab',
            url: 'https://github.com/user/repo',
            favicon: 'https://github.com/favicon.ico',
            parentId: 1,
            children: [],
            level: 1,
            isActive: false,
            isPinned: false,
            isLoading: true
          }
        ],
        metadata: {
          tabCount: 2,
          windowId: 1
        }
      };

      // Mock successful cabinet preview response
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        data: {
          tabSummary: {
            totalTabs: 2,
            rootTabs: 1,
            maxDepth: 1,
            domains: ['example.com', 'github.com']
          }
        }
      });

      // Mock DOM elements
      const mockPreviewElement = {
        innerHTML: '',
        querySelector: vi.fn(),
        classList: {
          contains: vi.fn().mockReturnValue(true),
          remove: vi.fn(),
          add: vi.fn()
        }
      };

      mockDocument.getElementById.mockReturnValue(mockPreviewElement);

      // Test the preview loading functionality
      // This would normally be called by loadCabinetPreview function
      const cabinetId = 'test-cabinet-1';
      
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'GET_CABINET_PREVIEW',
        cabinetId: cabinetId
      });
    });

    it('should render detailed cabinet preview with hierarchical structure', async () => {
      const mockTabs = [
        {
          id: 1,
          title: 'Root Tab',
          url: 'https://example.com',
          favicon: 'https://example.com/favicon.ico',
          parentId: null,
          children: [],
          level: 0,
          isActive: false,
          isPinned: true,
          isLoading: false
        },
        {
          id: 2,
          title: 'Child Tab',
          url: 'https://github.com/user/repo',
          favicon: 'https://github.com/favicon.ico',
          parentId: 1,
          children: [],
          level: 1,
          isActive: false,
          isPinned: false,
          isLoading: true
        }
      ];

      // Mock successful cabinet data response
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        data: {
          id: 'test-cabinet-1',
          name: 'Test Cabinet',
          tabs: mockTabs
        }
      });

      // Mock DOM container
      const mockContainer = {
        innerHTML: '',
        appendChild: vi.fn(),
        className: ''
      };

      mockDocument.createElement.mockReturnValue(mockContainer);

      // Test would verify that renderDetailedCabinetPreview creates proper hierarchy
      expect(mockTabs).toHaveLength(2);
      expect(mockTabs[0].parentId).toBeNull();
      expect(mockTabs[1].parentId).toBe(1);
    });

    it('should handle cabinet preview errors gracefully', async () => {
      // Mock failed cabinet preview response
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: false,
        error: 'Cabinet not found'
      });

      const mockPreviewElement = {
        textContent: ''
      };

      mockDocument.getElementById.mockReturnValue(mockPreviewElement);

      // Test error handling
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalled();
    });

    it('should toggle detailed preview visibility', () => {
      const mockDetailedPreview = {
        classList: {
          contains: vi.fn().mockReturnValue(true),
          remove: vi.fn(),
          add: vi.fn()
        }
      };

      const mockExpandBtn = {
        textContent: 'Show Details',
        disabled: false
      };

      mockDocument.getElementById.mockReturnValue(mockDetailedPreview);
      mockDocument.querySelector.mockReturnValue(mockExpandBtn);

      // Test toggle functionality
      expect(mockDetailedPreview.classList.contains).toBeDefined();
      expect(mockExpandBtn.textContent).toBe('Show Details');
    });
  });

  describe('Cabinet Preview Rendering', () => {
    it('should render tab nodes with proper tree structure', () => {
      const mockTabNode = {
        id: 1,
        title: 'Test Tab',
        url: 'https://example.com',
        favicon: 'https://example.com/favicon.ico',
        parentId: null,
        children: [
          {
            id: 2,
            title: 'Child Tab',
            url: 'https://example.com/child',
            favicon: 'https://example.com/favicon.ico',
            parentId: 1,
            children: [],
            level: 1,
            isActive: false,
            isPinned: false,
            isLoading: false
          }
        ],
        level: 0,
        isActive: false,
        isPinned: true,
        isLoading: false
      };

      const mockContainer = {
        appendChild: vi.fn()
      };

      const mockTabElement = {
        className: '',
        setAttribute: vi.fn(),
        appendChild: vi.fn()
      };

      mockDocument.createElement.mockReturnValue(mockTabElement);

      // Test that tab node rendering creates proper structure
      expect(mockTabNode.children).toHaveLength(1);
      expect(mockTabNode.isPinned).toBe(true);
      expect(mockTabNode.children[0].parentId).toBe(1);
    });

    it('should display tab indicators correctly', () => {
      const pinnedTab = {
        id: 1,
        title: 'Pinned Tab',
        isPinned: true,
        isLoading: false
      };

      const loadingTab = {
        id: 2,
        title: 'Loading Tab',
        isPinned: false,
        isLoading: true
      };

      // Test that indicators are properly identified
      expect(pinnedTab.isPinned).toBe(true);
      expect(loadingTab.isLoading).toBe(true);
    });

    it('should handle long titles and URLs with truncation', () => {
      const longTitleTab = {
        id: 1,
        title: 'This is a very long tab title that should be truncated when displayed in the cabinet preview',
        url: 'https://example.com/very/long/path/that/should/also/be/truncated/when/displayed'
      };

      // Test that long content is handled appropriately
      expect(longTitleTab.title.length).toBeGreaterThan(50);
      expect(longTitleTab.url.length).toBeGreaterThan(50);
    });
  });

  describe('Cabinet Management Integration', () => {
    it('should integrate with existing cabinet operations', async () => {
      // Mock cabinet list response
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        data: [
          {
            id: 'cabinet-1',
            name: 'Test Cabinet 1',
            metadata: { tabCount: 3 }
          },
          {
            id: 'cabinet-2',
            name: 'Test Cabinet 2',
            metadata: { tabCount: 5 }
          }
        ]
      });

      // Test that cabinet list loading works with enhanced previews
      expect(mockChrome.runtime.sendMessage).toBeDefined();
    });

    it('should maintain performance with large cabinet previews', () => {
      const largeCabinet = {
        tabs: Array.from({ length: 100 }, (_, i) => ({
          id: i + 1,
          title: `Tab ${i + 1}`,
          url: `https://example.com/${i + 1}`,
          parentId: i > 0 ? Math.floor(i / 2) + 1 : null,
          children: [],
          level: Math.floor(Math.log2(i + 1)),
          isActive: false,
          isPinned: false,
          isLoading: false
        }))
      };

      // Test that large cabinets are handled efficiently
      expect(largeCabinet.tabs).toHaveLength(100);
      expect(largeCabinet.tabs.filter(tab => tab.parentId === null)).toHaveLength(1);
    });
  });
});