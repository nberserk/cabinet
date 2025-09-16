/**
 * Unit tests for Cabinet System
 */

import { CabinetSystem } from './cabinet-system';
import { Cabinet, TabNode, HierarchyState } from './types';
import { STORAGE_KEYS, CONFIG } from './constants';

// Mock Chrome APIs
const mockChrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      getBytesInUse: jest.fn(),
      QUOTA_BYTES: 10 * 1024 * 1024 // 10MB
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

describe('CabinetSystem', () => {
  let cabinetSystem: CabinetSystem;
  let mockHierarchy: HierarchyState;
  let mockCabinet: Cabinet;

  beforeEach(() => {
    cabinetSystem = CabinetSystem.getInstance();
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock hierarchy state
    mockHierarchy = {
      rootTabs: [
        {
          id: 1,
          title: 'Parent Tab',
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
          isActive: true,
          isPinned: false,
          isLoading: false
        }
      ],
      tabMap: new Map([
        [1, {
          id: 1,
          title: 'Parent Tab',
          url: 'https://example.com',
          favicon: 'https://example.com/favicon.ico',
          parentId: null,
          children: [],
          level: 0,
          isActive: true,
          isPinned: false,
          isLoading: false
        }],
        [2, {
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
        }]
      ]),
      activeTabId: 1,
      windowId: 123
    };

    // Mock Cabinet
    mockCabinet = {
      id: 'cabinet_123',
      name: 'Test Cabinet',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
      tabs: mockHierarchy.rootTabs,
      metadata: {
        tabCount: 2,
        windowId: 123,
        originalWindowTitle: 'Test Window'
      }
    };

    // Default storage mock
    mockChrome.storage.local.get.mockResolvedValue({
      [STORAGE_KEYS.CABINETS]: []
    });
    mockChrome.storage.local.set.mockResolvedValue(undefined);
    mockChrome.storage.local.getBytesInUse.mockResolvedValue(1024);
  });

  describe('saveCabinet', () => {
    it('should save a valid Cabinet successfully', async () => {
      const result = await cabinetSystem.saveCabinet('Test Cabinet', mockHierarchy);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.name).toBe('Test Cabinet');
      expect(result.data.tabs).toHaveLength(1);
      expect(result.data.metadata.tabCount).toBe(2);
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    it('should reject empty Cabinet name', async () => {
      const result = await cabinetSystem.saveCabinet('', mockHierarchy);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cabinet name cannot be empty');
    });

    it('should reject Cabinet name that is too long', async () => {
      const longName = 'a'.repeat(101);
      const result = await cabinetSystem.saveCabinet(longName, mockHierarchy);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cabinet name cannot exceed 100 characters');
    });

    it('should reject empty hierarchy', async () => {
      const emptyHierarchy: HierarchyState = {
        rootTabs: [],
        tabMap: new Map(),
        activeTabId: null,
        windowId: 123
      };
      
      const result = await cabinetSystem.saveCabinet('Test', emptyHierarchy);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot save empty hierarchy');
    });

    it('should reject duplicate Cabinet names', async () => {
      // Mock existing Cabinet with same name
      mockChrome.storage.local.get.mockResolvedValue({
        [STORAGE_KEYS.CABINETS]: [mockCabinet]
      });
      
      const result = await cabinetSystem.saveCabinet('Test Cabinet', mockHierarchy);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('A Cabinet with this name already exists');
    });

    it('should handle storage quota exceeded error', async () => {
      mockChrome.storage.local.set.mockRejectedValue(new Error('QUOTA_BYTES exceeded'));
      
      const result = await cabinetSystem.saveCabinet('Test Cabinet', mockHierarchy);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Storage quota exceeded');
    });

    it('should enforce maximum Cabinet limit', async () => {
      // Mock storage with maximum Cabinets
      const maxCabinets = Array.from({ length: CONFIG.MAX_CABINETS }, (_, i) => ({
        ...mockCabinet,
        id: `cabinet_${i}`,
        name: `Cabinet ${i}`
      }));
      
      mockChrome.storage.local.get.mockResolvedValue({
        [STORAGE_KEYS.CABINETS]: maxCabinets
      });
      
      const result = await cabinetSystem.saveCabinet('New Cabinet', mockHierarchy);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum number of Cabinets');
    });
  });

  describe('loadCabinet', () => {
    beforeEach(() => {
      mockChrome.storage.local.get.mockResolvedValue({
        [STORAGE_KEYS.CABINETS]: [mockCabinet]
      });
    });

    it('should load existing Cabinet successfully', async () => {
      const result = await cabinetSystem.loadCabinet('cabinet_123');
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBe('cabinet_123');
      expect(result.data.name).toBe('Test Cabinet');
    });

    it('should return error for non-existent Cabinet', async () => {
      const result = await cabinetSystem.loadCabinet('non_existent');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cabinet not found');
    });

    it('should validate Cabinet data structure', async () => {
      // Mock invalid Cabinet data
      const invalidCabinet = { ...mockCabinet, name: null };
      mockChrome.storage.local.get.mockResolvedValue({
        [STORAGE_KEYS.CABINETS]: [invalidCabinet]
      });
      
      const result = await cabinetSystem.loadCabinet('cabinet_123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid Cabinet data');
    });
  });

  describe('deleteCabinet', () => {
    beforeEach(() => {
      mockChrome.storage.local.get.mockResolvedValue({
        [STORAGE_KEYS.CABINETS]: [mockCabinet]
      });
    });

    it('should delete existing Cabinet successfully', async () => {
      const result = await cabinetSystem.deleteCabinet('cabinet_123');
      
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('cabinet_123');
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    it('should return error for non-existent Cabinet', async () => {
      const result = await cabinetSystem.deleteCabinet('non_existent');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cabinet not found');
    });
  });

  describe('renameCabinet', () => {
    beforeEach(() => {
      mockChrome.storage.local.get.mockResolvedValue({
        [STORAGE_KEYS.CABINETS]: [mockCabinet]
      });
    });

    it('should rename Cabinet successfully', async () => {
      const result = await cabinetSystem.renameCabinet('cabinet_123', 'New Name');
      
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('New Name');
      expect(result.data.updatedAt).toBeInstanceOf(Date);
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    it('should reject empty new name', async () => {
      const result = await cabinetSystem.renameCabinet('cabinet_123', '');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cabinet name cannot be empty');
    });

    it('should reject duplicate names', async () => {
      const anotherCabinet = { ...mockCabinet, id: 'cabinet_456', name: 'Another Cabinet' };
      mockChrome.storage.local.get.mockResolvedValue({
        [STORAGE_KEYS.CABINETS]: [mockCabinet, anotherCabinet]
      });
      
      const result = await cabinetSystem.renameCabinet('cabinet_123', 'Another Cabinet');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('A Cabinet with this name already exists');
    });

    it('should return error for non-existent Cabinet', async () => {
      const result = await cabinetSystem.renameCabinet('non_existent', 'New Name');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cabinet not found');
    });
  });

  describe('listCabinets', () => {
    it('should return empty list when no Cabinets exist', async () => {
      const result = await cabinetSystem.listCabinets();
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should return sorted list of Cabinets', async () => {
      const cabinet1 = { ...mockCabinet, id: 'cabinet_1', createdAt: new Date('2023-01-01') };
      const cabinet2 = { ...mockCabinet, id: 'cabinet_2', createdAt: new Date('2023-01-02') };
      
      mockChrome.storage.local.get.mockResolvedValue({
        [STORAGE_KEYS.CABINETS]: [cabinet1, cabinet2]
      });
      
      const result = await cabinetSystem.listCabinets();
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('cabinet_2'); // Newer first
      expect(result.data[1].id).toBe('cabinet_1');
    });
  });

  describe('validateCabinet', () => {
    it('should validate correct Cabinet structure', () => {
      const result = cabinetSystem.validateCabinet(mockCabinet);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid Cabinet structure', () => {
      const invalidCabinet = { ...mockCabinet, name: null };
      const result = cabinetSystem.validateCabinet(invalidCabinet as any);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect tab count mismatch', () => {
      const cabinetWithMismatch = {
        ...mockCabinet,
        metadata: { ...mockCabinet.metadata, tabCount: 5 }
      };
      
      const result = cabinetSystem.validateCabinet(cabinetWithMismatch);
      
      expect(result.warnings).toContain('Tab count mismatch in metadata');
    });

    it('should warn about empty Cabinet', () => {
      const emptyCabinet = {
        ...mockCabinet,
        tabs: [],
        metadata: { ...mockCabinet.metadata, tabCount: 0 }
      };
      
      const result = cabinetSystem.validateCabinet(emptyCabinet);
      
      expect(result.warnings).toContain('Cabinet contains no tabs');
    });
  });

  describe('restoreCabinet', () => {
    beforeEach(() => {
      mockChrome.storage.local.get.mockResolvedValue({
        [STORAGE_KEYS.CABINETS]: [mockCabinet]
      });
      
      mockChrome.windows.getCurrent.mockResolvedValue({ id: 456 });
      mockChrome.tabs.query.mockResolvedValue([]);
      mockChrome.tabs.create.mockImplementation((props) => 
        Promise.resolve({ id: Math.floor(Math.random() * 1000), ...props })
      );
    });

    it('should restore Cabinet successfully', async () => {
      const result = await cabinetSystem.restoreCabinet('cabinet_123');
      
      expect(result.success).toBe(true);
      expect(result.summary.totalTabs).toBe(1);
      expect(result.summary.successfulTabs).toBeGreaterThan(0);
      expect(mockChrome.tabs.create).toHaveBeenCalled();
    });

    it('should handle non-existent Cabinet', async () => {
      const result = await cabinetSystem.restoreCabinet('non_existent');
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Cabinet not found');
    });

    it('should skip restricted URLs', async () => {
      const restrictedCabinet = {
        ...mockCabinet,
        tabs: [{
          ...mockCabinet.tabs[0],
          url: 'chrome://settings',
          children: []
        }]
      };
      
      mockChrome.storage.local.get.mockResolvedValue({
        [STORAGE_KEYS.CABINETS]: [restrictedCabinet]
      });
      
      const result = await cabinetSystem.restoreCabinet('cabinet_123');
      
      expect(result.failedUrls).toContain('chrome://settings');
      expect(result.errors.some(error => error.includes('restricted URL'))).toBe(true);
    });

    it('should close existing tabs when requested', async () => {
      mockChrome.tabs.query.mockResolvedValue([
        { id: 100, pinned: false },
        { id: 101, pinned: true }
      ]);
      
      const result = await cabinetSystem.restoreCabinet('cabinet_123', true);
      
      expect(mockChrome.tabs.remove).toHaveBeenCalledWith([100]);
    });

    it('should handle tab creation errors gracefully', async () => {
      mockChrome.tabs.create.mockRejectedValue(new Error('Tab creation failed'));
      
      const result = await cabinetSystem.restoreCabinet('cabinet_123');
      
      expect(result.summary.failedTabs).toBeGreaterThan(0);
      expect(result.errors.some(error => error.includes('Tab creation failed'))).toBe(true);
    });
  });

  describe('validateCabinetRestoration', () => {
    beforeEach(() => {
      mockChrome.storage.local.get.mockResolvedValue({
        [STORAGE_KEYS.CABINETS]: [mockCabinet]
      });
      
      mockChrome.windows.getCurrent.mockResolvedValue({ id: 456 });
      mockChrome.tabs.query.mockResolvedValue([]);
    });

    it('should validate restorable Cabinet', async () => {
      const result = await cabinetSystem.validateCabinetRestoration('cabinet_123');
      
      expect(result.canRestore).toBe(true);
      expect(result.totalTabs).toBe(1);
      expect(result.restorableTabs).toBe(1);
      expect(result.restrictedUrls).toHaveLength(0);
    });

    it('should detect restricted URLs', async () => {
      const restrictedCabinet = {
        ...mockCabinet,
        tabs: [{
          ...mockCabinet.tabs[0],
          url: 'chrome://settings',
          children: []
        }]
      };
      
      mockChrome.storage.local.get.mockResolvedValue({
        [STORAGE_KEYS.CABINETS]: [restrictedCabinet]
      });
      
      const result = await cabinetSystem.validateCabinetRestoration('cabinet_123');
      
      expect(result.restrictedUrls).toContain('chrome://settings');
      expect(result.restorableTabs).toBe(0);
      expect(result.canRestore).toBe(false);
    });

    it('should warn about existing tabs', async () => {
      mockChrome.tabs.query.mockResolvedValue([
        { id: 100, pinned: false },
        { id: 101, pinned: false }
      ]);
      
      const result = await cabinetSystem.validateCabinetRestoration('cabinet_123');
      
      expect(result.warnings.some(warning => warning.includes('existing tabs will be closed'))).toBe(true);
    });
  });

  describe('getCabinetPreview', () => {
    beforeEach(() => {
      mockChrome.storage.local.get.mockResolvedValue({
        [STORAGE_KEYS.CABINETS]: [mockCabinet]
      });
    });

    it('should generate Cabinet preview', async () => {
      const result = await cabinetSystem.getCabinetPreview('cabinet_123');
      
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Test Cabinet');
      expect(result.data.tabSummary).toBeDefined();
      expect(result.data.tabSummary.totalTabs).toBe(1);
      expect(result.data.tabSummary.rootTabs).toBe(1);
      expect(result.data.validation).toBeDefined();
    });

    it('should handle non-existent Cabinet', async () => {
      const result = await cabinetSystem.getCabinetPreview('non_existent');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cabinet not found');
    });
  });

  describe('getStorageInfo', () => {
    it('should return storage information', async () => {
      mockChrome.storage.local.getBytesInUse.mockResolvedValue(2048);
      mockChrome.storage.local.get.mockResolvedValue({
        [STORAGE_KEYS.CABINETS]: [mockCabinet]
      });
      
      const result = await cabinetSystem.getStorageInfo();
      
      expect(result.used).toBe(2048);
      expect(result.available).toBe(mockChrome.storage.local.QUOTA_BYTES - 2048);
      expect(result.cabinetCount).toBe(1);
      expect(result.isNearLimit).toBe(false);
    });

    it('should detect near storage limit', async () => {
      mockChrome.storage.local.getBytesInUse.mockResolvedValue(CONFIG.STORAGE_WARNING_THRESHOLD + 1);
      
      const result = await cabinetSystem.getStorageInfo();
      
      expect(result.isNearLimit).toBe(true);
    });
  });

  describe('clearAllCabinets', () => {
    it('should clear all Cabinets successfully', async () => {
      const result = await cabinetSystem.clearAllCabinets();
      
      expect(result.success).toBe(true);
      expect(mockChrome.storage.local.remove).toHaveBeenCalledWith(STORAGE_KEYS.CABINETS);
    });

    it('should handle storage errors', async () => {
      mockChrome.storage.local.remove.mockRejectedValue(new Error('Storage error'));
      
      const result = await cabinetSystem.clearAllCabinets();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to clear Cabinets');
    });
  });
});