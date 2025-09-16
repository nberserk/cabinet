/**
 * Unit tests for Tab Hierarchy Engine
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TabHierarchyEngine } from './tab-hierarchy-engine';

// Mock Chrome APIs for testing
const mockChrome = {
  tabs: {
    query: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    move: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    onCreated: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    },
    onRemoved: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    },
    onUpdated: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    },
    onActivated: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    },
    onMoved: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn()
    }
  },
  runtime: {
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    },
    lastError: null
  }
};

global.chrome = mockChrome as any;

// Mock Chrome tabs for testing
const createMockTab = (
  id: number, 
  title: string = `Tab ${id}`, 
  url: string = `https://example.com/${id}`,
  openerTabId?: number,
  active: boolean = false,
  pinned: boolean = false,
  index: number = id - 1
): chrome.tabs.Tab => ({
  id,
  title,
  url,
  openerTabId,
  active,
  pinned,
  index,
  windowId: 1,
  status: 'complete',
  favIconUrl: `https://example.com/favicon${id}.ico`,
  highlighted: false,
  incognito: false,
  selected: false,
  discarded: false,
  autoDiscardable: true,
  groupId: -1
});

describe('TabHierarchyEngine', () => {
  let engine: TabHierarchyEngine;

  beforeEach(() => {
    engine = new TabHierarchyEngine();
  });

  describe('buildHierarchyFromTabs', () => {
    it('should build hierarchy from flat array of tabs', () => {
      const tabs = [
        createMockTab(1, 'Root Tab 1'),
        createMockTab(2, 'Child Tab 1', 'https://example.com/2', 1),
        createMockTab(3, 'Root Tab 2'),
        createMockTab(4, 'Child Tab 2', 'https://example.com/4', 2),
        createMockTab(5, 'Grandchild Tab', 'https://example.com/5', 4)
      ];

      const hierarchy = engine.buildHierarchyFromTabs(tabs);

      expect(hierarchy.rootTabs).toHaveLength(2);
      expect(hierarchy.rootTabs[0].id).toBe(1);
      expect(hierarchy.rootTabs[1].id).toBe(3);
      expect(hierarchy.tabMap.size).toBe(5);
    });

    it('should handle tabs without opener relationships', () => {
      const tabs = [
        createMockTab(1, 'Tab 1'),
        createMockTab(2, 'Tab 2'),
        createMockTab(3, 'Tab 3')
      ];

      const hierarchy = engine.buildHierarchyFromTabs(tabs);

      expect(hierarchy.rootTabs).toHaveLength(3);
      hierarchy.rootTabs.forEach(tab => {
        expect(tab.parentId).toBeNull();
        expect(tab.level).toBe(0);
        expect(tab.children).toHaveLength(0);
      });
    });

    it('should set correct hierarchy levels', () => {
      const tabs = [
        createMockTab(1, 'Root'),
        createMockTab(2, 'Child', 'https://example.com/2', 1),
        createMockTab(3, 'Grandchild', 'https://example.com/3', 2),
        createMockTab(4, 'Great-grandchild', 'https://example.com/4', 3)
      ];

      engine.buildHierarchyFromTabs(tabs);

      expect(engine.getTab(1)?.level).toBe(0);
      expect(engine.getTab(2)?.level).toBe(1);
      expect(engine.getTab(3)?.level).toBe(2);
      expect(engine.getTab(4)?.level).toBe(3);
    });

    it('should identify active tab correctly', () => {
      const tabs = [
        createMockTab(1, 'Tab 1'),
        createMockTab(2, 'Active Tab', 'https://example.com/2', undefined, true),
        createMockTab(3, 'Tab 3')
      ];

      const hierarchy = engine.buildHierarchyFromTabs(tabs);

      expect(hierarchy.activeTabId).toBe(2);
      expect(engine.getTab(2)?.isActive).toBe(true);
      expect(engine.getTab(1)?.isActive).toBe(false);
      expect(engine.getTab(3)?.isActive).toBe(false);
    });
  });

  describe('addTab', () => {
    beforeEach(() => {
      const tabs = [
        createMockTab(1, 'Root Tab'),
        createMockTab(2, 'Child Tab', 'https://example.com/2', 1)
      ];
      engine.buildHierarchyFromTabs(tabs);
    });

    it('should add new root tab', () => {
      const newTab = createMockTab(3, 'New Root Tab');
      engine.addTab(newTab);

      const hierarchy = engine.getHierarchyState();
      expect(hierarchy.rootTabs).toHaveLength(2);
      expect(hierarchy.tabMap.has(3)).toBe(true);
      expect(engine.getTab(3)?.parentId).toBeNull();
    });

    it('should add new child tab', () => {
      const newTab = createMockTab(3, 'New Child Tab', 'https://example.com/3', 1);
      engine.addTab(newTab);

      const parent = engine.getTab(1);
      expect(parent?.children).toHaveLength(2);
      expect(engine.getTab(3)?.parentId).toBe(1);
      expect(engine.getTab(3)?.level).toBe(1);
    });

    it('should override opener with explicit parentId', () => {
      const newTab = createMockTab(3, 'New Tab', 'https://example.com/3', 2);
      engine.addTab(newTab, 1); // Override parent to be tab 1 instead of tab 2

      expect(engine.getTab(3)?.parentId).toBe(1);
      expect(engine.getTab(1)?.children).toHaveLength(2);
    });
  });

  describe('removeTab', () => {
    beforeEach(() => {
      const tabs = [
        createMockTab(1, 'Root Tab'),
        createMockTab(2, 'Child Tab', 'https://example.com/2', 1),
        createMockTab(3, 'Grandchild Tab', 'https://example.com/3', 2)
      ];
      engine.buildHierarchyFromTabs(tabs);
    });

    it('should remove tab and update parent children', () => {
      engine.removeTab(2);

      const hierarchy = engine.getHierarchyState();
      expect(hierarchy.tabMap.has(2)).toBe(false);
      expect(hierarchy.tabMap.has(3)).toBe(false); // Should also remove descendants
      expect(engine.getTab(1)?.children).toHaveLength(0);
    });

    it('should remove root tab', () => {
      engine.removeTab(1);

      const hierarchy = engine.getHierarchyState();
      expect(hierarchy.rootTabs).toHaveLength(0);
      expect(hierarchy.tabMap.size).toBe(0); // All descendants should be removed
    });

    it('should handle removing non-existent tab', () => {
      const initialSize = engine.getTabCount();
      engine.removeTab(999);

      expect(engine.getTabCount()).toBe(initialSize);
    });
  });

  describe('updateTab', () => {
    beforeEach(() => {
      const tabs = [
        createMockTab(1, 'Tab 1'),
        createMockTab(2, 'Tab 2', 'https://example.com/2', undefined, true)
      ];
      engine.buildHierarchyFromTabs(tabs);
    });

    it('should update tab properties', () => {
      engine.updateTab(1, { title: 'Updated Title', isLoading: true });

      const tab = engine.getTab(1);
      expect(tab?.title).toBe('Updated Title');
      expect(tab?.isLoading).toBe(true);
    });

    it('should update active tab', () => {
      engine.updateTab(1, { isActive: true });

      expect(engine.getHierarchyState().activeTabId).toBe(1);
      expect(engine.getTab(1)?.isActive).toBe(true);
    });
  });

  describe('getChildren', () => {
    beforeEach(() => {
      const tabs = [
        createMockTab(1, 'Parent'),
        createMockTab(2, 'Child 1', 'https://example.com/2', 1),
        createMockTab(3, 'Child 2', 'https://example.com/3', 1),
        createMockTab(4, 'Other Tab')
      ];
      engine.buildHierarchyFromTabs(tabs);
    });

    it('should return children of a tab', () => {
      const children = engine.getChildren(1);
      expect(children).toHaveLength(2);
      expect(children.map(c => c.id)).toEqual([2, 3]);
    });

    it('should return empty array for tab without children', () => {
      const children = engine.getChildren(4);
      expect(children).toHaveLength(0);
    });

    it('should return empty array for non-existent tab', () => {
      const children = engine.getChildren(999);
      expect(children).toHaveLength(0);
    });
  });

  describe('getDescendants', () => {
    beforeEach(() => {
      const tabs = [
        createMockTab(1, 'Root'),
        createMockTab(2, 'Child', 'https://example.com/2', 1),
        createMockTab(3, 'Grandchild', 'https://example.com/3', 2),
        createMockTab(4, 'Great-grandchild', 'https://example.com/4', 3)
      ];
      engine.buildHierarchyFromTabs(tabs);
    });

    it('should return all descendants', () => {
      const descendants = engine.getDescendants(1);
      expect(descendants).toEqual([2, 3, 4]);
    });

    it('should return immediate descendants only for leaf nodes', () => {
      const descendants = engine.getDescendants(2);
      expect(descendants).toEqual([3, 4]);
    });

    it('should return empty array for leaf tab', () => {
      const descendants = engine.getDescendants(4);
      expect(descendants).toHaveLength(0);
    });
  });

  describe('moveTab', () => {
    beforeEach(() => {
      const tabs = [
        createMockTab(1, 'Root 1'),
        createMockTab(2, 'Root 2'),
        createMockTab(3, 'Child of Root 1', 'https://example.com/3', 1)
      ];
      engine.buildHierarchyFromTabs(tabs);
    });

    it('should move tab to new parent', () => {
      engine.moveTab(3, 2);

      expect(engine.getTab(3)?.parentId).toBe(2);
      expect(engine.getTab(1)?.children).toHaveLength(0);
      expect(engine.getTab(2)?.children).toHaveLength(1);
      expect(engine.getTab(3)?.level).toBe(1);
    });

    it('should move tab to root level', () => {
      engine.moveTab(3, null);

      expect(engine.getTab(3)?.parentId).toBeNull();
      expect(engine.getTab(3)?.level).toBe(0);
      expect(engine.getRootTabs()).toHaveLength(3);
    });

    it('should update descendant levels when moving', () => {
      // Add a grandchild
      const grandchild = createMockTab(4, 'Grandchild', 'https://example.com/4', 3);
      engine.addTab(grandchild);

      // Move the child to root level
      engine.moveTab(3, null);

      expect(engine.getTab(3)?.level).toBe(0);
      expect(engine.getTab(4)?.level).toBe(1);
    });
  });

  describe('setActiveTab', () => {
    beforeEach(() => {
      const tabs = [
        createMockTab(1, 'Tab 1', 'https://example.com/1', undefined, true),
        createMockTab(2, 'Tab 2')
      ];
      engine.buildHierarchyFromTabs(tabs);
    });

    it('should set new active tab and unset previous', () => {
      engine.setActiveTab(2);

      expect(engine.getTab(1)?.isActive).toBe(false);
      expect(engine.getTab(2)?.isActive).toBe(true);
      expect(engine.getHierarchyState().activeTabId).toBe(2);
    });
  });

  describe('validateHierarchy', () => {
    it('should validate correct hierarchy', () => {
      const tabs = [
        createMockTab(1, 'Root'),
        createMockTab(2, 'Child', 'https://example.com/2', 1)
      ];
      engine.buildHierarchyFromTabs(tabs);

      const validation = engine.validateHierarchy();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect unreachable tabs', () => {
      const tabs = [createMockTab(1, 'Root')];
      engine.buildHierarchyFromTabs(tabs);

      // Manually add unreachable tab to tabMap
      const hierarchy = engine.getHierarchyState();
      hierarchy.tabMap.set(2, {
        id: 2,
        title: 'Unreachable',
        url: 'https://example.com/2',
        favicon: '',
        parentId: null,
        children: [],
        level: 0,
        isActive: false,
        isPinned: false,
        isLoading: false
      });

      const validation = engine.validateHierarchy();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Unreachable tabs found: 2');
    });

    it('should detect circular references', () => {
      const tabs = [
        createMockTab(1, 'Tab 1'),
        createMockTab(2, 'Tab 2', 'https://example.com/2', 1)
      ];
      engine.buildHierarchyFromTabs(tabs);

      // Manually create a circular reference
      const hierarchy = engine.getHierarchyState();
      const tab1 = hierarchy.tabMap.get(1)!;
      const tab2 = hierarchy.tabMap.get(2)!;
      
      // Make tab1 a child of tab2 (creating a cycle: 1 -> 2 -> 1)
      tab1.parentId = 2;
      tab1.level = 2;
      tab2.children.push(tab1);
      
      // Remove tab1 from root tabs since it now has a parent
      hierarchy.rootTabs = hierarchy.rootTabs.filter(tab => tab.id !== 1);

      const validation = engine.validateHierarchy();
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(error => error.includes('Circular reference detected'))).toBe(true);
    });

    it('should detect self-referencing tabs', () => {
      const tabs = [createMockTab(1, 'Self-referencing tab')];
      engine.buildHierarchyFromTabs(tabs);

      // Manually create self-reference
      const hierarchy = engine.getHierarchyState();
      const tab1 = hierarchy.tabMap.get(1)!;
      tab1.parentId = 1; // Self-reference
      tab1.children.push(tab1);

      const validation = engine.validateHierarchy();
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(error => error.includes('Circular reference detected') || error.includes('its own ancestor'))).toBe(true);
    });
  });

  describe('utility methods', () => {
    beforeEach(() => {
      const tabs = [
        createMockTab(1, 'Root'),
        createMockTab(2, 'Child', 'https://example.com/2', 1),
        createMockTab(3, 'Another Root')
      ];
      engine.buildHierarchyFromTabs(tabs);
    });

    it('should check if tab has children', () => {
      expect(engine.hasChildren(1)).toBe(true);
      expect(engine.hasChildren(2)).toBe(false);
      expect(engine.hasChildren(999)).toBe(false);
    });

    it('should get max depth', () => {
      expect(engine.getMaxDepth()).toBe(1);
    });

    it('should get tab count', () => {
      expect(engine.getTabCount()).toBe(3);
    });

    it('should get all tabs', () => {
      const allTabs = engine.getAllTabs();
      expect(allTabs).toHaveLength(3);
      expect(allTabs.map(t => t.id).sort()).toEqual([1, 2, 3]);
    });

    it('should clear hierarchy', () => {
      engine.clear();

      expect(engine.getTabCount()).toBe(0);
      expect(engine.getRootTabs()).toHaveLength(0);
      expect(engine.getHierarchyState().activeTabId).toBeNull();
    });
  });

  describe('cascading delete functionality', () => {
    beforeEach(() => {
      const tabs = [
        createMockTab(1, 'Root'),
        createMockTab(2, 'Child 1', 'https://example.com/2', 1),
        createMockTab(3, 'Child 2', 'https://example.com/3', 1),
        createMockTab(4, 'Grandchild 1', 'https://example.com/4', 2),
        createMockTab(5, 'Grandchild 2', 'https://example.com/5', 2),
        createMockTab(6, 'Great-grandchild', 'https://example.com/6', 4)
      ];
      engine.buildHierarchyFromTabs(tabs);
    });

    describe('getCascadingDeleteIds', () => {
      it('should return all descendant IDs for cascading delete', () => {
        const deleteIds = engine.getCascadingDeleteIds(1);
        expect(deleteIds.sort()).toEqual([1, 2, 3, 4, 5, 6]);
      });

      it('should return only tab ID for leaf node', () => {
        const deleteIds = engine.getCascadingDeleteIds(6);
        expect(deleteIds).toEqual([6]);
      });

      it('should return empty array for non-existent tab', () => {
        const deleteIds = engine.getCascadingDeleteIds(999);
        expect(deleteIds).toEqual([]);
      });

      it('should return correct IDs for middle-level tab', () => {
        const deleteIds = engine.getCascadingDeleteIds(2);
        expect(deleteIds.sort()).toEqual([2, 4, 5, 6]);
      });
    });

    describe('validateCascadingDelete', () => {
      it('should validate safe deletion', () => {
        const validation = engine.validateCascadingDelete(6);
        expect(validation.canDelete).toBe(true);
        expect(validation.tabsToDelete).toEqual([6]);
        expect(validation.warnings).toHaveLength(0);
      });

      it('should warn about active tab deletion', () => {
        engine.setActiveTab(2);
        const validation = engine.validateCascadingDelete(2);
        expect(validation.warnings).toContain('This will close the currently active tab');
      });

      it('should warn about pinned tabs', () => {
        engine.updateTab(2, { isPinned: true });
        const validation = engine.validateCascadingDelete(1);
        expect(validation.warnings).toContain('This will close 1 pinned tab(s)');
      });

    //   it('should warn about large number of deletions', () => {
    //     const validation = engine.validateCascadingDelete(1);
    //     expect(validation.warnings).toContain('This will close 6 tabs');
    //   });

      it('should handle non-existent tab', () => {
        const validation = engine.validateCascadingDelete(999);
        expect(validation.canDelete).toBe(false);
        expect(validation.warnings).toContain('Tab not found in hierarchy');
      });
    });

    describe('cascadingDelete', () => {
      beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();
        
        // Mock Chrome tabs API
        mockChrome.tabs.get.mockImplementation((tabId: number) => 
          Promise.resolve(createMockTab(tabId))
        );
        mockChrome.tabs.remove.mockResolvedValue(undefined);
      });

      it('should delete tabs in correct order (children first)', async () => {
        const result = await engine.cascadingDelete(2);
        
        expect(result.success).toBe(true);
        expect(result.deletedTabs).toEqual([6, 4, 5, 2]); // Deepest first
        expect(result.errors).toHaveLength(0);
        
        // Verify Chrome API calls were made in correct order
        const removeCalls = mockChrome.tabs.remove.mock.calls;
        expect(removeCalls).toHaveLength(4);
        expect(removeCalls[0][0]).toBe(6); // Great-grandchild first
        expect(removeCalls[1][0]).toBe(4); // Grandchild 1
        expect(removeCalls[2][0]).toBe(5); // Grandchild 2
        expect(removeCalls[3][0]).toBe(2); // Child last
      });

      it('should handle Chrome API errors gracefully', async () => {
        mockChrome.tabs.remove
          .mockResolvedValueOnce(undefined) // First call succeeds
          .mockRejectedValueOnce(new Error('Tab not found')) // Second call fails
          .mockResolvedValueOnce(undefined); // Third call succeeds

        const result = await engine.cascadingDelete(4);
        
        expect(result.success).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('Failed to close tab');
      });

      it('should handle non-existent tabs', async () => {
        mockChrome.tabs.get.mockRejectedValue(new Error('Tab not found'));
        
        const result = await engine.cascadingDelete(999);
        
        expect(result.success).toBe(true);
        expect(result.deletedTabs).toHaveLength(0);
        expect(result.errors).toHaveLength(0);
      });

      it('should prevent deletion with circular references', async () => {
        // Manually create a circular reference for testing
        const hierarchy = engine.getHierarchyState();
        const tab1 = hierarchy.tabMap.get(1)!;
        const tab2 = hierarchy.tabMap.get(2)!;
        
        // Create circular reference (this would be prevented in normal operation)
        tab1.parentId = 2;
        tab2.children.push(tab1);
        // Remove tab1 from root tabs since it now has a parent
        hierarchy.rootTabs = hierarchy.rootTabs.filter(tab => tab.id !== 1);
        
        const result = await engine.cascadingDelete(1);
        
        expect(result.success).toBe(false);
        expect(result.errors).toContain('Cannot perform cascading delete: hierarchy has circular references');
      });

      it('should handle getDescendants with circular references safely', () => {
        // Create a scenario that could cause infinite loops
        const hierarchy = engine.getHierarchyState();
        const tab1 = hierarchy.tabMap.get(1)!;
        const tab2 = hierarchy.tabMap.get(2)!;
        
        // Create circular reference
        tab1.parentId = 2;
        tab2.children.push(tab1);
        hierarchy.rootTabs = hierarchy.rootTabs.filter(tab => tab.id !== 1);
        
        // This should not cause infinite loop due to visited node tracking
        const descendants = engine.getDescendants(1);
        expect(descendants).toBeDefined();
        expect(descendants.length).toBeGreaterThan(0);
      });
    });
  });

  describe('callbacks', () => {
    it('should notify callbacks on hierarchy changes', async () => {
      const callback = vi.fn();
      engine.onHierarchyChange(callback);

      const tabs = [createMockTab(1, 'Test Tab')];
      engine.buildHierarchyFromTabs(tabs);

      // Wait for debounced update
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(callback).toHaveBeenCalled();
    });

    it('should remove callbacks', async () => {
      const callback = vi.fn();
      engine.onHierarchyChange(callback);
      engine.offHierarchyChange(callback);

      const tabs = [createMockTab(1, 'Test Tab')];
      engine.buildHierarchyFromTabs(tabs);

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(callback).not.toHaveBeenCalled();
    });
  });
});