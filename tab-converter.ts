/**
 * Tab Converter - Converts Chrome tabs to TabNode format for UI rendering
 */

import { TabNode } from './types';

export interface ChromeTabData {
  id: number;
  title?: string;
  url?: string;
  favIconUrl?: string;
  active?: boolean;
  pinned?: boolean;
  status?: string;
  windowId?: number;
}

export interface TabTreeData {
  [tabId: string]: {
    parentId?: number;
    children: number[];
  };
}

export class TabConverter {
  /**
   * Converts Chrome tab data to TabNode format
   */
  static chromeTabToTabNode(
    chromeTab: ChromeTabData,
    treeData: TabTreeData,
    level: number = 0
  ): TabNode {
    const tabId = chromeTab.id.toString();
    const tabTreeInfo = treeData[tabId] || { children: [] };

    return {
      id: chromeTab.id,
      title: chromeTab.title || 'Untitled',
      url: chromeTab.url || '',
      favicon: chromeTab.favIconUrl || '',
      parentId: tabTreeInfo.parentId || null,
      children: [], // Will be populated by buildHierarchy
      level: level,
      isActive: chromeTab.active || false,
      isPinned: chromeTab.pinned || false,
      isLoading: chromeTab.status === 'loading'
    };
  }

  /**
   * Builds hierarchical structure from flat tab list and tree data
   */
  static buildHierarchy(
    chromeTabs: ChromeTabData[],
    treeData: TabTreeData
  ): TabNode[] {
    // Convert all tabs to TabNode format
    const tabMap = new Map<number, TabNode>();
    
    chromeTabs.forEach(chromeTab => {
      const tabNode = this.chromeTabToTabNode(chromeTab, treeData);
      tabMap.set(tabNode.id, tabNode);
    });

    // Build parent-child relationships
    const rootTabs: TabNode[] = [];

    tabMap.forEach(tab => {
      if (tab.parentId && tabMap.has(tab.parentId)) {
        // Add to parent's children
        const parent = tabMap.get(tab.parentId)!;
        parent.children.push(tab);
        // Update level based on parent
        tab.level = parent.level + 1;
      } else {
        // Root level tab
        tab.level = 0;
        rootTabs.push(tab);
      }
    });

    // Sort children by their original order (tab index)
    this.sortTabsByOrder(rootTabs, chromeTabs);

    return rootTabs;
  }

  /**
   * Sorts tabs to maintain their original browser order
   */
  private static sortTabsByOrder(tabs: TabNode[], chromeTabs: ChromeTabData[]): void {
    // Create index map for original order
    const orderMap = new Map<number, number>();
    chromeTabs.forEach((tab, index) => {
      orderMap.set(tab.id, index);
    });

    // Sort recursively
    const sortTabs = (tabList: TabNode[]) => {
      tabList.sort((a, b) => {
        const orderA = orderMap.get(a.id) || 0;
        const orderB = orderMap.get(b.id) || 0;
        return orderA - orderB;
      });

      // Sort children recursively
      tabList.forEach(tab => {
        if (tab.children.length > 0) {
          sortTabs(tab.children);
        }
      });
    };

    sortTabs(tabs);
  }

  /**
   * Flattens hierarchy back to a flat list (for storage or processing)
   */
  static flattenHierarchy(hierarchy: TabNode[]): TabNode[] {
    const flattened: TabNode[] = [];

    const flatten = (tabs: TabNode[]) => {
      tabs.forEach(tab => {
        flattened.push(tab);
        if (tab.children.length > 0) {
          flatten(tab.children);
        }
      });
    };

    flatten(hierarchy);
    return flattened;
  }

  /**
   * Finds a tab by ID in the hierarchy
   */
  static findTabInHierarchy(hierarchy: TabNode[], tabId: number): TabNode | null {
    for (const tab of hierarchy) {
      if (tab.id === tabId) {
        return tab;
      }
      if (tab.children.length > 0) {
        const found = this.findTabInHierarchy(tab.children, tabId);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * Gets all child tab IDs for a given tab
   */
  static getChildTabIds(hierarchy: TabNode[], parentId: number): number[] {
    const parent = this.findTabInHierarchy(hierarchy, parentId);
    if (!parent) return [];

    const childIds: number[] = [];
    
    const collectChildren = (tabs: TabNode[]) => {
      tabs.forEach(tab => {
        childIds.push(tab.id);
        if (tab.children.length > 0) {
          collectChildren(tab.children);
        }
      });
    };

    collectChildren(parent.children);
    return childIds;
  }

  /**
   * Updates a tab's information in the hierarchy
   */
  static updateTabInHierarchy(
    hierarchy: TabNode[], 
    tabId: number, 
    updates: Partial<TabNode>
  ): boolean {
    const tab = this.findTabInHierarchy(hierarchy, tabId);
    if (!tab) return false;

    // Apply updates
    Object.assign(tab, updates);
    return true;
  }

  /**
   * Removes a tab from the hierarchy
   */
  static removeTabFromHierarchy(hierarchy: TabNode[], tabId: number): TabNode[] {
    return hierarchy.filter(tab => {
      if (tab.id === tabId) {
        return false;
      }
      // Recursively filter children
      tab.children = this.removeTabFromHierarchy(tab.children, tabId);
      return true;
    });
  }

  /**
   * Checks if a tab is restricted (cannot be accessed)
   */
  static isRestrictedTab(tab: TabNode | ChromeTabData): boolean {
    const url = tab.url || '';
    return url.startsWith('chrome://') || 
           url.startsWith('chrome-extension://') ||
           url.startsWith('edge://') ||
           url.startsWith('about:') ||
           url.startsWith('moz-extension://');
  }

  /**
   * Gets display data for UI rendering
   */
  static getTabDisplayData(tab: TabNode): {
    id: number;
    title: string;
    url: string;
    favicon: string;
    isActive: boolean;
    isPinned: boolean;
    isLoading: boolean;
    isRestricted: boolean;
    level: number;
  } {
    return {
      id: tab.id,
      title: tab.title,
      url: tab.url,
      favicon: tab.favicon,
      isActive: tab.isActive,
      isPinned: tab.isPinned,
      isLoading: tab.isLoading,
      isRestricted: this.isRestrictedTab(tab),
      level: tab.level
    };
  }
}