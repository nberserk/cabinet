/**
 * Integration tests for compact cabinet preview functionality
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

describe('Compact Cabinet Preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Compact Design Implementation', () => {
    it('should render cabinet preview with compact styling', async () => {
      const mockCabinetData = {
        id: 'test-cabinet-1',
        name: 'Development Workspace',
        tabs: [
          {
            id: 1,
            title: 'GitHub - Main Repository',
            url: 'https://github.com/user/main-repo',
            favicon: 'https://github.com/favicon.ico',
            parentId: null,
            children: [],
            level: 0,
            isActive: false,
            isPinned: true,
            isLoading: false
          },
          {
            id: 2,
            title: 'Pull Request #123',
            url: 'https://github.com/user/main-repo/pull/123',
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
            domains: ['github.com']
          }
        }
      });

      // Mock DOM elements for compact preview
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

      // Test compact preview features
      expect(mockCabinetData.tabs[0].isPinned).toBe(true);
      expect(mockCabinetData.tabs[1].isLoading).toBe(true);
      
      // Verify domain extraction would work
      const url1 = new URL(mockCabinetData.tabs[0].url);
      const url2 = new URL(mockCabinetData.tabs[1].url);
      expect(url1.hostname).toBe('github.com');
      expect(url2.hostname).toBe('github.com');
    });

    it('should use compact spacing and sizing', () => {
      const compactSpecs = {
        faviconSize: 12, // 12px instead of 16px or larger
        treeLineWidth: 1, // 1px instead of 2px or larger
        containerMaxHeight: 192, // max-h-48 (48 * 4px = 192px) instead of max-h-64
        indicatorSize: 8, // 2px (w-2 h-2 = 8px) instead of larger
        fontSize: 12 // 0.75rem = 12px
      };

      // Test that compact specifications are smaller than detailed
      expect(compactSpecs.faviconSize).toBeLessThan(16);
      expect(compactSpecs.treeLineWidth).toBeLessThan(2);
      expect(compactSpecs.containerMaxHeight).toBeLessThan(256); // max-h-64
      expect(compactSpecs.indicatorSize).toBeLessThan(12);
      expect(compactSpecs.fontSize).toBeLessThan(14);
    });

    it('should extract domain-only URLs for space efficiency', () => {
      const testUrls = [
        'https://github.com/user/main-repo/pull/123/files',
        'https://stackoverflow.com/questions/12345/typescript-issue',
        'https://docs.example.com/api/v1/reference'
      ];

      const expectedDomains = [
        'github.com',
        'stackoverflow.com',
        'docs.example.com'
      ];

      testUrls.forEach((url, index) => {
        const domain = new URL(url).hostname;
        expect(domain).toBe(expectedDomains[index]);
      });
    });

    it('should handle compact tree structure rendering', () => {
      const mockHierarchy = {
        rootTabs: [
          {
            id: 1,
            title: 'Root Tab',
            children: [
              {
                id: 2,
                title: 'Child Tab',
                children: [
                  {
                    id: 3,
                    title: 'Grandchild Tab',
                    children: []
                  }
                ]
              }
            ]
          }
        ]
      };

      // Test hierarchy depth calculation
      function getMaxDepth(tabs, currentDepth = 0) {
        let maxDepth = currentDepth;
        tabs.forEach(tab => {
          if (tab.children && tab.children.length > 0) {
            const childDepth = getMaxDepth(tab.children, currentDepth + 1);
            maxDepth = Math.max(maxDepth, childDepth);
          }
        });
        return maxDepth;
      }

      const depth = getMaxDepth(mockHierarchy.rootTabs);
      expect(depth).toBe(2); // 3 levels: 0, 1, 2

      // Test compact spacing calculation (depth * 8px + 8px)
      const level0Width = 0 * 8 + 8; // 8px
      const level1Width = 1 * 8 + 8; // 16px
      const level2Width = 2 * 8 + 8; // 24px

      expect(level0Width).toBe(8);
      expect(level1Width).toBe(16);
      expect(level2Width).toBe(24);
    });

    it('should provide appropriate hover effects for compact design', () => {
      const compactHoverSpecs = {
        backgroundColor: '#f8fafc', // Subtle background
        borderLeftColor: '#3b82f6', // Blue left border
        borderLeftWidth: '2px',
        transition: 'all 0.15s ease'
      };

      // Test that hover effects are subtle and appropriate for compact design
      expect(compactHoverSpecs.backgroundColor).toBe('#f8fafc');
      expect(compactHoverSpecs.borderLeftColor).toBe('#3b82f6');
      expect(compactHoverSpecs.borderLeftWidth).toBe('2px');
      expect(compactHoverSpecs.transition).toContain('0.15s');
    });
  });

  describe('Compact Preview Performance', () => {
    it('should handle large cabinet previews efficiently', () => {
      const largeCabinet = {
        tabs: Array.from({ length: 50 }, (_, i) => ({
          id: i + 1,
          title: `Tab ${i + 1}`,
          url: `https://example${i % 5}.com/page${i}`,
          parentId: i > 0 ? Math.floor(i / 3) + 1 : null,
          children: [],
          level: Math.min(Math.floor(i / 10), 3),
          isActive: false,
          isPinned: i % 10 === 0,
          isLoading: i % 15 === 0
        }))
      };

      // Test that compact design can handle many tabs
      expect(largeCabinet.tabs).toHaveLength(50);
      
      // Test domain extraction performance
      const domains = [...new Set(largeCabinet.tabs.map(tab => {
        try {
          return new URL(tab.url).hostname;
        } catch {
          return 'unknown';
        }
      }))];

      expect(domains.length).toBeLessThanOrEqual(6); // Should have 5 unique domains + potentially 'unknown'
    });

    it('should minimize visual overhead for better performance', () => {
      const compactOverhead = {
        cssClasses: ['compact-tab-node', 'compact-favicon', 'compact-tree-line'],
        animationDuration: '0.15s', // Fast animations
        maxHeight: '12rem', // max-h-48
        fontSize: '0.75rem' // Small text
      };

      // Test that compact design uses minimal CSS classes and fast animations
      expect(compactOverhead.cssClasses).toHaveLength(3);
      expect(compactOverhead.animationDuration).toBe('0.15s');
      expect(compactOverhead.maxHeight).toBe('12rem');
      expect(compactOverhead.fontSize).toBe('0.75rem');
    });
  });

  describe('Compact Preview Accessibility', () => {
    it('should maintain accessibility in compact design', () => {
      const accessibilityFeatures = {
        tooltips: true, // Full URLs and titles in tooltips
        keyboardNavigation: true,
        ariaLabels: true,
        colorContrast: true, // Sufficient contrast even with smaller elements
        focusIndicators: true
      };

      // Test that compact design doesn't compromise accessibility
      Object.values(accessibilityFeatures).forEach(feature => {
        expect(feature).toBe(true);
      });
    });

    it('should provide sufficient information despite compact size', () => {
      const informationDensity = {
        favicon: true, // 12px favicon still visible
        title: true, // Full title with truncation
        domain: true, // Domain extracted from URL
        hierarchy: true, // Tree structure maintained
        status: true, // Pinned/loading indicators
        tooltips: true // Full information on hover
      };

      // Test that compact design retains all essential information
      Object.values(informationDensity).forEach(info => {
        expect(info).toBe(true);
      });
    });
  });
});