/**
 * Comprehensive tests for Cabinet restoration functionality
 */

import { CabinetSystem } from './cabinet-system';
import { Cabinet, TabNode } from './types';

// Mock Chrome APIs
const mockChrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      getBytesInUse: jest.fn(),
      QUOTA_BYTES: 10 * 1024 * 1024
    }
  },
  tabs: {
    create: jest.fn(),
    remove: jest.fn(),
    query: jest.fn()
  },
  windows: {
    getCurrent: jest.fn()
  }
};

// @ts-ignore
global.chrome = mockChrome;

describe('Cabinet Restoration', () => {
  let cabinetSystem: CabinetSystem;
  let mockCabinet: Cabinet;

  beforeEach(() => {
    cabinetSystem = CabinetSystem.getInstance();
    jest.clearAllMocks();

    // Create a complex hierarchy for testing
    const childTab: TabNode = {
      id: 2,
      title: 'Child Tab',
      url: 'https://example.com/child',
      favicon: 'https://example.com/favicon.ico',
      parentId: 1,
      children: [
        {
          id: 3,
          title: 'Grandchild Tab',
          url: 'https://example.com/grandchild',
          favicon: 'https://example.com/favicon.ico',
          parentId: 2,
          children: [],
          level: 2,
          isActive: false,
          isPinned: false,
          isLoading: false
        }
      ],
      level: 1,
      isActive: false,
      isPinned: false,
      isLoading: false
    };

    const parentTab: TabNode = {
      id: 1,
      title: 'Parent Tab',
      url: 'https://example.com',
      favicon: 'https://example.com/favicon.ico',
      parentId: null,
      children: [childTab],
      level: 0,
      isActive: true,
      isPinned: false,
      isLoading: false
    };

    mockCabinet = {
      id: 'test_cabinet',
      name: 'Test Cabinet',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
      tabs: [parentTab],
      metadata: {
        tabCount: 3,
        windowId: 123,
        originalWindowTitle: 'Test Window'
      }
    };

    // Default mocks
    mockChrome.storage.local.get.mockResolvedValue({
      tab_hierarchy_cabinets: [mockCabinet]
    });
    mockChrome.windows.getCurrent.mockResolvedValue({ id: 456 });
    mockChrome.tabs.query.mockResolvedValue([]);
    mockChrome.tabs.create.mockImplementation((props) => 
      Promise.resolve({ 
        id: Math.floor(Math.random() * 1000) + 100, 
        ...props 
      })
    );
  });

  describe('restoreCabinet', () => {
    it('should restore hierarchical tabs in correct order', async () => {
      const createCalls: any[] = [];
      mockChrome.tabs.create.mockImplementation((props) => {
        createCalls.push(props);
        return Promise.resolve({ 
          id: createCalls.length + 100, 
          ...props 
        });
      });

      const result = await cabinetSystem.restoreCabinet('test_cabinet');

      expect(result.success).toBe(true);
      expect(result.summary.totalTabs).toBe(1); // Only root tabs count in the array
      expect(createCalls.length).toBe(3); // But all tabs should be created

      // Verify hierarchy is maintained through openerTabId
      expect(createCalls[0].url).toBe('https://example.com');
      expect(createCalls[0].openerTabId).toBeUndefined();
      
      expect(createCalls[1].url).toBe('https://example.com/child');
      expect(createCalls[1].openerTabId).toBe(101); // Parent's new ID
      
      expect(createCalls[2].url).toBe('https://example.com/grandchild');
      expect(createCalls[2].openerTabId).toBe(102); // Child's new ID
    });

    it('should handle tab creation failures gracefully', async () => {
      mockChrome.tabs.create
        .mockResolvedValueOnce({ id: 101, url: 'https://example.com' })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ id: 103, url: 'https://example.com/grandchild' });

      const result = await cabinetSystem.restoreCabinet('test_cabinet');

      expect(result.success).toBe(true); // Still successful if some tabs restored
      expect(result.summary.successfulTabs).toBe(2);
      expect(result.summary.failedTabs).toBe(1);
      expect(result.failedUrls).toContain('https://example.com/child');
      expect(result.errors.some(error => error.includes('Network error'))).toBe(true);
    });

    it('should skip restricted URLs during restoration', async () => {
      const restrictedCabinet = {
        ...mockCabinet,
        tabs: [
          {
            id: 1,
            title: 'Chrome Settings',
            url: 'chrome://settings',
            favicon: '',
            parentId: null,
            children: [
              {
                id: 2,
                title: 'Normal Tab',
                url: 'https://example.com',
                favicon: '',
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
            isPinned: false,
            isLoading: false
          }
        ]
      };

      mockChrome.storage.local.get.mockResolvedValue({
        tab_hierarchy_cabinets: [restrictedCabinet]
      });

      const result = await cabinetSystem.restoreCabinet('test_cabinet');

      expect(result.failedUrls).toContain('chrome://settings');
      expect(result.errors.some(error => error.includes('restricted URL'))).toBe(true);
      expect(mockChrome.tabs.create).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'https://example.com' })
      );
    });

    it('should close existing tabs when requested', async () => {
      mockChrome.tabs.query.mockResolvedValue([
        { id: 50, pinned: false, url: 'https://old-tab.com' },
        { id: 51, pinned: true, url: 'https://pinned-tab.com' },
        { id: 52, pinned: false, url: 'https://another-old-tab.com' }
      ]);

      const result = await cabinetSystem.restoreCabinet('test_cabinet', true);

      expect(mockChrome.tabs.remove).toHaveBeenCalledWith([50, 52]);
      expect(result.success).toBe(true);
    });

    it('should preserve pinned tabs when closing existing tabs', async () => {
      mockChrome.tabs.query.mockResolvedValue([
        { id: 50, pinned: false },
        { id: 51, pinned: true }
      ]);

      await cabinetSystem.restoreCabinet('test_cabinet', true);

      expect(mockChrome.tabs.remove).toHaveBeenCalledWith([50]);
      expect(mockChrome.tabs.remove).not.toHaveBeenCalledWith(
        expect.arrayContaining([51])
      );
    });

    it('should create new tab before closing all tabs to prevent window closure', async () => {
      mockChrome.tabs.query.mockResolvedValue([
        { id: 50, pinned: false }
      ]);

      await cabinetSystem.restoreCabinet('test_cabinet', true);

      // Should create a new tab first, then close the old one
      expect(mockChrome.tabs.create).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'chrome://newtab/' })
      );
      expect(mockChrome.tabs.remove).toHaveBeenCalledWith([50]);
    });

    it('should handle window access errors', async () => {
      mockChrome.windows.getCurrent.mockRejectedValue(new Error('Window access denied'));

      const result = await cabinetSystem.restoreCabinet('test_cabinet');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Could not access current window');
    });

    it('should restore pinned tabs as pinned', async () => {
      const pinnedCabinet = {
        ...mockCabinet,
        tabs: [
          {
            ...mockCabinet.tabs[0],
            isPinned: true,
            children: []
          }
        ]
      };

      mockChrome.storage.local.get.mockResolvedValue({
        tab_hierarchy_cabinets: [pinnedCabinet]
      });

      await cabinetSystem.restoreCabinet('test_cabinet');

      expect(mockChrome.tabs.create).toHaveBeenCalledWith(
        expect.objectContaining({ pinned: true })
      );
    });

    it('should not activate tabs during restoration', async () => {
      await cabinetSystem.restoreCabinet('test_cabinet');

      const createCalls = mockChrome.tabs.create.mock.calls;
      createCalls.forEach(call => {
        expect(call[0].active).toBe(false);
      });
    });
  });

  describe('validateCabinetRestoration', () => {
    it('should validate normal Cabinet restoration', async () => {
      const result = await cabinetSystem.validateCabinetRestoration('test_cabinet');

      expect(result.canRestore).toBe(true);
      expect(result.totalTabs).toBe(1);
      expect(result.restorableTabs).toBe(3); // All tabs in hierarchy
      expect(result.restrictedUrls).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect restricted URLs in validation', async () => {
      const mixedCabinet = {
        ...mockCabinet,
        tabs: [
          {
            id: 1,
            title: 'Chrome Settings',
            url: 'chrome://settings',
            favicon: '',
            parentId: null,
            children: [
              {
                id: 2,
                title: 'Extension Page',
                url: 'chrome-extension://abc123/popup.html',
                favicon: '',
                parentId: 1,
                children: [],
                level: 1,
                isActive: false,
                isPinned: false,
                isLoading: false
              },
              {
                id: 3,
                title: 'Normal Page',
                url: 'https://example.com',
                favicon: '',
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
            isPinned: false,
            isLoading: false
          }
        ]
      };

      mockChrome.storage.local.get.mockResolvedValue({
        tab_hierarchy_cabinets: [mixedCabinet]
      });

      const result = await cabinetSystem.validateCabinetRestoration('test_cabinet');

      expect(result.restrictedUrls).toContain('chrome://settings');
      expect(result.restrictedUrls).toContain('chrome-extension://abc123/popup.html');
      expect(result.restorableTabs).toBe(1);
      expect(result.warnings.some(w => w.includes('cannot be restored due to browser restrictions'))).toBe(true);
    });

    it('should warn about existing tabs that will be closed', async () => {
      mockChrome.tabs.query.mockResolvedValue([
        { id: 50, pinned: false },
        { id: 51, pinned: false },
        { id: 52, pinned: true }
      ]);

      const result = await cabinetSystem.validateCabinetRestoration('test_cabinet');

      expect(result.warnings.some(w => w.includes('2 existing tabs will be closed'))).toBe(true);
    });

    it('should handle Cabinet with no restorable tabs', async () => {
      const restrictedOnlyCabinet = {
        ...mockCabinet,
        tabs: [
          {
            id: 1,
            title: 'Chrome Settings',
            url: 'chrome://settings',
            favicon: '',
            parentId: null,
            children: [],
            level: 0,
            isActive: false,
            isPinned: false,
            isLoading: false
          }
        ]
      };

      mockChrome.storage.local.get.mockResolvedValue({
        tab_hierarchy_cabinets: [restrictedOnlyCabinet]
      });

      const result = await cabinetSystem.validateCabinetRestoration('test_cabinet');

      expect(result.canRestore).toBe(false);
      expect(result.restorableTabs).toBe(0);
      expect(result.warnings).toContain('No tabs can be restored from this Cabinet');
    });

    it('should handle non-existent Cabinet', async () => {
      const result = await cabinetSystem.validateCabinetRestoration('non_existent');

      expect(result.canRestore).toBe(false);
      expect(result.warnings).toContain('Cabinet not found or invalid');
    });

    it('should handle empty Cabinet', async () => {
      const emptyCabinet = {
        ...mockCabinet,
        tabs: []
      };

      mockChrome.storage.local.get.mockResolvedValue({
        tab_hierarchy_cabinets: [emptyCabinet]
      });

      const result = await cabinetSystem.validateCabinetRestoration('test_cabinet');

      expect(result.canRestore).toBe(false);
      expect(result.warnings).toContain('Cabinet contains no tabs');
    });
  });

  describe('getCabinetPreview', () => {
    it('should generate comprehensive preview', async () => {
      const result = await cabinetSystem.getCabinetPreview('test_cabinet');

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Test Cabinet');
      expect(result.data.tabSummary.totalTabs).toBe(3);
      expect(result.data.tabSummary.rootTabs).toBe(1);
      expect(result.data.tabSummary.maxDepth).toBe(2);
      expect(result.data.tabSummary.restrictedTabs).toBe(0);
      expect(result.data.tabSummary.pinnedTabs).toBe(0);
      expect(result.data.tabSummary.domains).toContain('example.com');
    });

    it('should analyze restricted tabs in preview', async () => {
      const mixedCabinet = {
        ...mockCabinet,
        tabs: [
          {
            id: 1,
            title: 'Chrome Settings',
            url: 'chrome://settings',
            favicon: '',
            parentId: null,
            children: [
              {
                id: 2,
                title: 'Normal Tab',
                url: 'https://example.com',
                favicon: '',
                parentId: 1,
                children: [],
                level: 1,
                isActive: false,
                isPinned: true,
                isLoading: false
              }
            ],
            level: 0,
            isActive: false,
            isPinned: false,
            isLoading: false
          }
        ]
      };

      mockChrome.storage.local.get.mockResolvedValue({
        tab_hierarchy_cabinets: [mixedCabinet]
      });

      const result = await cabinetSystem.getCabinetPreview('test_cabinet');

      expect(result.data.tabSummary.restrictedTabs).toBe(1);
      expect(result.data.tabSummary.pinnedTabs).toBe(1);
      expect(result.data.tabSummary.domains).toContain('example.com');
    });

    it('should limit domains in preview', async () => {
      const manyDomainsCabinet = {
        ...mockCabinet,
        tabs: Array.from({ length: 15 }, (_, i) => ({
          id: i + 1,
          title: `Tab ${i}`,
          url: `https://domain${i}.com`,
          favicon: '',
          parentId: null,
          children: [],
          level: 0,
          isActive: false,
          isPinned: false,
          isLoading: false
        }))
      };

      mockChrome.storage.local.get.mockResolvedValue({
        tab_hierarchy_cabinets: [manyDomainsCabinet]
      });

      const result = await cabinetSystem.getCabinetPreview('test_cabinet');

      expect(result.data.tabSummary.domains).toHaveLength(10); // Limited to 10
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle storage errors during restoration', async () => {
      mockChrome.storage.local.get.mockRejectedValue(new Error('Storage unavailable'));

      const result = await cabinetSystem.restoreCabinet('test_cabinet');

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.includes('Storage unavailable'))).toBe(true);
    });

    it('should handle tab creation quota exceeded', async () => {
      mockChrome.tabs.create.mockRejectedValue(new Error('Too many tabs'));

      const result = await cabinetSystem.restoreCabinet('test_cabinet');

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.includes('Too many tabs'))).toBe(true);
    });

    it('should provide restoration progress feedback', async () => {
      const result = await cabinetSystem.restoreCabinet('test_cabinet');

      expect(result.summary).toBeDefined();
      expect(result.summary.totalTabs).toBeGreaterThan(0);
      expect(result.summary.successfulTabs).toBeGreaterThanOrEqual(0);
      expect(result.summary.failedTabs).toBeGreaterThanOrEqual(0);
      expect(result.summary.successfulTabs + result.summary.failedTabs).toBeLessThanOrEqual(3);
    });

    it('should handle malformed URLs gracefully', async () => {
      const malformedCabinet = {
        ...mockCabinet,
        tabs: [
          {
            id: 1,
            title: 'Malformed URL',
            url: 'not-a-valid-url',
            favicon: '',
            parentId: null,
            children: [],
            level: 0,
            isActive: false,
            isPinned: false,
            isLoading: false
          }
        ]
      };

      mockChrome.storage.local.get.mockResolvedValue({
        tab_hierarchy_cabinets: [malformedCabinet]
      });

      const result = await cabinetSystem.restoreCabinet('test_cabinet');

      // Should attempt to restore even malformed URLs (Chrome will handle the error)
      expect(mockChrome.tabs.create).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'not-a-valid-url' })
      );
    });
  });
});