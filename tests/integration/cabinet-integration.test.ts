/**
 * Integration tests for Cabinet System
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CabinetSystem } from '../../cabinet-system';
import { TabHierarchyEngine } from '../../tab-hierarchy-engine';

// Mock Chrome APIs
const mockChrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      getBytesInUse: vi.fn().mockResolvedValue(1024),
      QUOTA_BYTES: 5242880 // 5MB
    }
  },
  tabs: {
    create: vi.fn(),
    remove: vi.fn(),
    query: vi.fn()
  },
  windows: {
    getCurrent: vi.fn()
  }
};

global.chrome = mockChrome as any;

describe('Cabinet System Integration', () => {
  let cabinetSystem: CabinetSystem;
  let hierarchyEngine: TabHierarchyEngine;

  beforeEach(() => {
    cabinetSystem = CabinetSystem.getInstance();
    hierarchyEngine = new TabHierarchyEngine();
    
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup default mock responses
    mockChrome.storage.local.get.mockResolvedValue({ tab_hierarchy_cabinets: [] });
    mockChrome.storage.local.set.mockResolvedValue(undefined);
    mockChrome.windows.getCurrent.mockResolvedValue({ id: 1 });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Cabinet CRUD Operations', () => {
    it('should save and retrieve a cabinet', async () => {
      // Create a test hierarchy
      const mockTabs = [
        { id: 1, title: 'Tab 1', url: 'https://example.com/1', active: true, windowId: 1, index: 0 },
        { id: 2, title: 'Tab 2', url: 'https://example.com/2', openerTabId: 1, windowId: 1, index: 1 }
      ] as chrome.tabs.Tab[];

      const hierarchy = hierarchyEngine.buildHierarchyFromTabs(mockTabs);

      // Save cabinet
      const saveResult = await cabinetSystem.saveCabinet('Test Cabinet', hierarchy);
      expect(saveResult.success).toBe(true);
      expect(saveResult.data).toBeDefined();
      expect(saveResult.data?.name).toBe('Test Cabinet');

      // Verify storage was called
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        tab_hierarchy_cabinets: expect.arrayContaining([
          expect.objectContaining({
            name: 'Test Cabinet',
            tabs: expect.any(Array)
          })
        ])
      });
    });

    it('should list saved cabinets', async () => {
      const mockCabinets = [
        {
          id: 'cabinet_1',
          name: 'Cabinet 1',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
          tabs: [],
          metadata: { tabCount: 2, windowId: 1 }
        }
      ];

      mockChrome.storage.local.get.mockResolvedValue({
        tab_hierarchy_cabinets: mockCabinets
      });

      const listResult = await cabinetSystem.listCabinets();
      expect(listResult.success).toBe(true);
      expect(listResult.data).toHaveLength(1);
      expect(listResult.data?.[0].name).toBe('Cabinet 1');
    });

    it('should delete a cabinet', async () => {
      const mockCabinets = [
        {
          id: 'cabinet_1',
          name: 'Cabinet 1',
          createdAt: new Date(),
          updatedAt: new Date(),
          tabs: [],
          metadata: { tabCount: 0, windowId: 1 }
        }
      ];

      mockChrome.storage.local.get.mockResolvedValue({
        tab_hierarchy_cabinets: mockCabinets
      });

      const deleteResult = await cabinetSystem.deleteCabinet('cabinet_1');
      expect(deleteResult.success).toBe(true);
      expect(deleteResult.data?.name).toBe('Cabinet 1');

      // Verify storage was updated
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        tab_hierarchy_cabinets: []
      });
    });
  });

  describe('Cabinet Restoration', () => {
    it('should restore tabs from a cabinet', async () => {
      const mockCabinet = {
        id: 'cabinet_1',
        name: 'Test Cabinet',
        createdAt: new Date(),
        updatedAt: new Date(),
        tabs: [
          {
            id: 1,
            title: 'Tab 1',
            url: 'https://example.com/1',
            favicon: '',
            parentId: null,
            children: [
              {
                id: 2,
                title: 'Tab 2',
                url: 'https://example.com/2',
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
            isActive: true,
            isPinned: false,
            isLoading: false
          }
        ],
        metadata: { tabCount: 2, windowId: 1 }
      };

      mockChrome.storage.local.get.mockResolvedValue({
        tab_hierarchy_cabinets: [mockCabinet]
      });

      mockChrome.tabs.query.mockResolvedValue([]);
      mockChrome.tabs.create
        .mockResolvedValueOnce({ id: 10 } as chrome.tabs.Tab)
        .mockResolvedValueOnce({ id: 11 } as chrome.tabs.Tab);

      const restoreResult = await cabinetSystem.restoreCabinet('cabinet_1');
      expect(restoreResult.success).toBe(true);
      expect(restoreResult.restoredTabs).toHaveLength(2);
      expect(restoreResult.summary.successfulTabs).toBe(2);

      // Verify tabs were created
      expect(mockChrome.tabs.create).toHaveBeenCalledTimes(2);
    });

    it('should handle restricted URLs during restoration', async () => {
      const mockCabinet = {
        id: 'cabinet_1',
        name: 'Test Cabinet',
        createdAt: new Date(),
        updatedAt: new Date(),
        tabs: [
          {
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
          },
          {
            id: 2,
            title: 'Normal Tab',
            url: 'https://example.com/',
            favicon: '',
            parentId: null,
            children: [],
            level: 0,
            isActive: false,
            isPinned: false,
            isLoading: false
          }
        ],
        metadata: { tabCount: 2, windowId: 1 }
      };

      mockChrome.storage.local.get.mockResolvedValue({
        tab_hierarchy_cabinets: [mockCabinet]
      });

      mockChrome.tabs.query.mockResolvedValue([]);
      mockChrome.tabs.create.mockResolvedValue({ id: 10 } as chrome.tabs.Tab);

      const restoreResult = await cabinetSystem.restoreCabinet('cabinet_1');
      expect(restoreResult.success).toBe(true);
      expect(restoreResult.restoredTabs).toHaveLength(1);
      expect(restoreResult.failedUrls).toContain('chrome://settings/');
      expect(restoreResult.summary.failedTabs).toBe(1);
    });
  });

  describe('Cabinet Validation', () => {
    it('should validate cabinet data structure', () => {
      const validCabinet = {
        id: 'cabinet_1',
        name: 'Valid Cabinet',
        createdAt: new Date(),
        updatedAt: new Date(),
        tabs: [],
        metadata: { tabCount: 0, windowId: 1 }
      };

      const validation = cabinetSystem.validateCabinet(validCabinet);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid cabinet data', () => {
      const invalidCabinet = {
        id: 'cabinet_1',
        name: '', // Invalid: empty name
        createdAt: 'invalid-date', // Invalid: not a Date object
        updatedAt: new Date(),
        tabs: 'not-an-array', // Invalid: not an array
        metadata: { tabCount: -1, windowId: 1 } // Invalid: negative tab count
      };

      const validation = cabinetSystem.validateCabinet(invalidCabinet as any);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Storage Management', () => {
    it('should get storage information', async () => {
      const storageInfo = await cabinetSystem.getStorageInfo();
      expect(storageInfo.used).toBeDefined();
      expect(storageInfo.available).toBeDefined();
      expect(storageInfo.cabinetCount).toBeDefined();
      expect(typeof storageInfo.isNearLimit).toBe('boolean');
    });

    it('should prevent saving when storage limit is reached', async () => {
      // Mock storage quota exceeded error
      mockChrome.storage.local.set.mockRejectedValue(
        new Error('QUOTA_BYTES quota exceeded')
      );

      const mockTabs = [
        { id: 1, title: 'Tab 1', url: 'https://example.com/1', active: true, windowId: 1, index: 0 }
      ] as chrome.tabs.Tab[];

      const hierarchy = hierarchyEngine.buildHierarchyFromTabs(mockTabs);
      const saveResult = await cabinetSystem.saveCabinet('Test Cabinet', hierarchy);

      expect(saveResult.success).toBe(false);
      expect(saveResult.error).toContain('Storage quota exceeded');
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      mockChrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

      const listResult = await cabinetSystem.listCabinets();
      expect(listResult.success).toBe(false);
      expect(listResult.error).toContain('Failed to list Cabinets');
    });

    it('should prevent duplicate cabinet names', async () => {
      const existingCabinets = [
        {
          id: 'cabinet_1',
          name: 'Existing Cabinet',
          createdAt: new Date(),
          updatedAt: new Date(),
          tabs: [],
          metadata: { tabCount: 0, windowId: 1 }
        }
      ];

      mockChrome.storage.local.get.mockResolvedValue({
        tab_hierarchy_cabinets: existingCabinets
      });

      const mockTabs = [
        { id: 1, title: 'Tab 1', url: 'https://example.com/1', active: true, windowId: 1, index: 0 }
      ] as chrome.tabs.Tab[];

      const hierarchy = hierarchyEngine.buildHierarchyFromTabs(mockTabs);
      const saveResult = await cabinetSystem.saveCabinet('Existing Cabinet', hierarchy);

      expect(saveResult.success).toBe(false);
      expect(saveResult.error).toContain('already exists');
    });
  });
});