/**
 * Unit tests for Tab Converter
 */

import { TabConverter, ChromeTabData, TabTreeData } from './tab-converter';
import { TabNode } from './types';

describe('TabConverter', () => {
  describe('chromeTabToTabNode', () => {
    it('should convert Chrome tab to TabNode format', () => {
      const chromeTab: ChromeTabData = {
        id: 1,
        title: 'Test Tab',
        url: 'https://example.com',
        favIconUrl: 'https://example.com/favicon.ico',
        active: true,
        pinned: false,
        status: 'complete'
      };

      const treeData: TabTreeData = {
        '1': { children: [] }
      };

      const result = TabConverter.chromeTabToTabNode(chromeTab, treeData, 0);

      expect(result).toEqual({
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
      });
    });

    it('should handle missing optional fields', () => {
      const chromeTab: ChromeTabData = {
        id: 1
      };

      const treeData: TabTreeData = {
        '1': { children: [] }
      };

      const result = TabConverter.chromeTabToTabNode(chromeTab, treeData, 0);

      expect(result.title).toBe('Untitled');
      expect(result.url).toBe('');
      expect(result.favicon).toBe('');
      expect(result.isActive).toBe(false);
      expect(result.isPinned).toBe(false);
      expect(result.isLoading).toBe(false);
    });

    it('should detect loading status', () => {
      const chromeTab: ChromeTabData = {
        id: 1,
        status: 'loading'
      };

      const treeData: TabTreeData = {
        '1': { children: [] }
      };

      const result = TabConverter.chromeTabToTabNode(chromeTab, treeData, 0);

      expect(result.isLoading).toBe(true);
    });

    it('should set parent ID from tree data', () => {
      const chromeTab: ChromeTabData = {
        id: 2,
        title: 'Child Tab'
      };

      const treeData: TabTreeData = {
        '2': { parentId: 1, children: [] }
      };

      const result = TabConverter.chromeTabToTabNode(chromeTab, treeData, 1);

      expect(result.parentId).toBe(1);
      expect(result.level).toBe(1);
    });
  });

  describe('buildHierarchy', () => {
    it('should build simple hierarchy with parent and child', () => {
      const chromeTabs: ChromeTabData[] = [
        { id: 1, title: 'Parent Tab', url: 'https://parent.com' },
        { id: 2, title: 'Child Tab', url: 'https://child.com' }
      ];

      const treeData: TabTreeData = {
        '1': { children: [2] },
        '2': { parentId: 1, children: [] }
      };

      const result = TabConverter.buildHierarchy(chromeTabs, treeData);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].id).toBe(2);
      expect(result[0].children[0].level).toBe(1);
    });

    it('should handle multiple root tabs', () => {
      const chromeTabs: ChromeTabData[] = [
        { id: 1, title: 'Root 1' },
        { id: 2, title: 'Root 2' },
        { id: 3, title: 'Root 3' }
      ];

      const treeData: TabTreeData = {
        '1': { children: [] },
        '2': { children: [] },
        '3': { children: [] }
      };

      const result = TabConverter.buildHierarchy(chromeTabs, treeData);

      expect(result).toHaveLength(3);
      expect(result.map(tab => tab.id)).toEqual([1, 2, 3]);
    });

    it('should handle deep nesting', () => {
      const chromeTabs: ChromeTabData[] = [
        { id: 1, title: 'Root' },
        { id: 2, title: 'Child' },
        { id: 3, title: 'Grandchild' }
      ];

      const treeData: TabTreeData = {
        '1': { children: [2] },
        '2': { parentId: 1, children: [3] },
        '3': { parentId: 2, children: [] }
      };

      const result = TabConverter.buildHierarchy(chromeTabs, treeData);

      expect(result).toHaveLength(1);
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].children).toHaveLength(1);
      expect(result[0].children[0].children[0].level).toBe(2);
    });

    it('should handle orphaned children gracefully', () => {
      const chromeTabs: ChromeTabData[] = [
        { id: 1, title: 'Root' },
        { id: 2, title: 'Orphan' }
      ];

      const treeData: TabTreeData = {
        '1': { children: [] },
        '2': { parentId: 999, children: [] } // Parent doesn't exist
      };

      const result = TabConverter.buildHierarchy(chromeTabs, treeData);

      expect(result).toHaveLength(2); // Both become root tabs
      expect(result.map(tab => tab.id)).toEqual([1, 2]);
    });
  });

  describe('flattenHierarchy', () => {
    it('should flatten nested hierarchy to flat list', () => {
      const hierarchy: TabNode[] = [
        {
          id: 1,
          title: 'Root',
          url: '',
          favicon: '',
          parentId: null,
          children: [
            {
              id: 2,
              title: 'Child',
              url: '',
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
      ];

      const result = TabConverter.flattenHierarchy(hierarchy);

      expect(result).toHaveLength(2);
      expect(result.map(tab => tab.id)).toEqual([1, 2]);
    });
  });

  describe('findTabInHierarchy', () => {
    const hierarchy: TabNode[] = [
      {
        id: 1,
        title: 'Root',
        url: '',
        favicon: '',
        parentId: null,
        children: [
          {
            id: 2,
            title: 'Child',
            url: '',
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
    ];

    it('should find root tab', () => {
      const result = TabConverter.findTabInHierarchy(hierarchy, 1);
      expect(result?.id).toBe(1);
    });

    it('should find nested tab', () => {
      const result = TabConverter.findTabInHierarchy(hierarchy, 2);
      expect(result?.id).toBe(2);
    });

    it('should return null for non-existent tab', () => {
      const result = TabConverter.findTabInHierarchy(hierarchy, 999);
      expect(result).toBeNull();
    });
  });

  describe('getChildTabIds', () => {
    const hierarchy: TabNode[] = [
      {
        id: 1,
        title: 'Root',
        url: '',
        favicon: '',
        parentId: null,
        children: [
          {
            id: 2,
            title: 'Child 1',
            url: '',
            favicon: '',
            parentId: 1,
            children: [
              {
                id: 3,
                title: 'Grandchild',
                url: '',
                favicon: '',
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
          },
          {
            id: 4,
            title: 'Child 2',
            url: '',
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
    ];

    it('should get all child IDs recursively', () => {
      const result = TabConverter.getChildTabIds(hierarchy, 1);
      expect(result.sort()).toEqual([2, 3, 4]);
    });

    it('should get direct child IDs only', () => {
      const result = TabConverter.getChildTabIds(hierarchy, 2);
      expect(result).toEqual([3]);
    });

    it('should return empty array for leaf tab', () => {
      const result = TabConverter.getChildTabIds(hierarchy, 3);
      expect(result).toEqual([]);
    });

    it('should return empty array for non-existent tab', () => {
      const result = TabConverter.getChildTabIds(hierarchy, 999);
      expect(result).toEqual([]);
    });
  });

  describe('isRestrictedTab', () => {
    it('should identify chrome:// URLs as restricted', () => {
      const tab: TabNode = {
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

      expect(TabConverter.isRestrictedTab(tab)).toBe(true);
    });

    it('should identify extension URLs as restricted', () => {
      const tab: TabNode = {
        id: 1,
        title: 'Extension Page',
        url: 'chrome-extension://abc123/popup.html',
        favicon: '',
        parentId: null,
        children: [],
        level: 0,
        isActive: false,
        isPinned: false,
        isLoading: false
      };

      expect(TabConverter.isRestrictedTab(tab)).toBe(true);
    });

    it('should identify regular URLs as not restricted', () => {
      const tab: TabNode = {
        id: 1,
        title: 'Regular Page',
        url: 'https://example.com',
        favicon: '',
        parentId: null,
        children: [],
        level: 0,
        isActive: false,
        isPinned: false,
        isLoading: false
      };

      expect(TabConverter.isRestrictedTab(tab)).toBe(false);
    });
  });

  describe('updateTabInHierarchy', () => {
    it('should update tab properties', () => {
      const hierarchy: TabNode[] = [
        {
          id: 1,
          title: 'Old Title',
          url: 'https://example.com',
          favicon: '',
          parentId: null,
          children: [],
          level: 0,
          isActive: false,
          isPinned: false,
          isLoading: false
        }
      ];

      const success = TabConverter.updateTabInHierarchy(hierarchy, 1, {
        title: 'New Title',
        isActive: true
      });

      expect(success).toBe(true);
      expect(hierarchy[0].title).toBe('New Title');
      expect(hierarchy[0].isActive).toBe(true);
    });

    it('should return false for non-existent tab', () => {
      const hierarchy: TabNode[] = [];

      const success = TabConverter.updateTabInHierarchy(hierarchy, 999, {
        title: 'New Title'
      });

      expect(success).toBe(false);
    });
  });

  describe('removeTabFromHierarchy', () => {
    it('should remove tab from hierarchy', () => {
      const hierarchy: TabNode[] = [
        {
          id: 1,
          title: 'Tab 1',
          url: '',
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
          title: 'Tab 2',
          url: '',
          favicon: '',
          parentId: null,
          children: [],
          level: 0,
          isActive: false,
          isPinned: false,
          isLoading: false
        }
      ];

      const result = TabConverter.removeTabFromHierarchy(hierarchy, 1);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
    });

    it('should remove tab and its children', () => {
      const hierarchy: TabNode[] = [
        {
          id: 1,
          title: 'Parent',
          url: '',
          favicon: '',
          parentId: null,
          children: [
            {
              id: 2,
              title: 'Child',
              url: '',
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
      ];

      const result = TabConverter.removeTabFromHierarchy(hierarchy, 1);

      expect(result).toHaveLength(0);
    });
  });
});