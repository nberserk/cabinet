/**
 * Utility functions for tab hierarchy operations
 */

import { TabNode, HierarchyState, Cabinet } from './types';
import { CONFIG, ERROR_MESSAGES } from './constants';

/**
 * Creates a TabNode from a Chrome tab object
 */
export function createTabNode(tab: chrome.tabs.Tab, parentId: number | null = null, level: number = 0): TabNode {
  return {
    id: tab.id!,
    title: tab.title || 'Untitled',
    url: tab.url || '',
    favicon: tab.favIconUrl || '',
    parentId,
    children: [],
    level,
    isActive: tab.active || false,
    isPinned: tab.pinned || false,
    isLoading: tab.status === 'loading'
  };
}

/**
 * Builds hierarchy from flat array of tabs
 */
export function buildHierarchy(tabs: chrome.tabs.Tab[]): HierarchyState {
  const tabMap = new Map<number, TabNode>();
  const rootTabs: TabNode[] = [];
  let activeTabId: number | null = null;

  // First pass: create all tab nodes
  tabs.forEach(tab => {
    if (!tab.id) return;
    
    const tabNode = createTabNode(tab);
    tabMap.set(tab.id, tabNode);
    
    if (tab.active) {
      activeTabId = tab.id;
    }
  });

  // Second pass: build parent-child relationships
  tabs.forEach(tab => {
    if (!tab.id) return;
    
    const tabNode = tabMap.get(tab.id);
    if (!tabNode) return;

    // Determine parent based on opener tab ID
    if (tab.openerTabId && tabMap.has(tab.openerTabId)) {
      const parent = tabMap.get(tab.openerTabId)!;
      tabNode.parentId = tab.openerTabId;
      tabNode.level = Math.min(parent.level + 1, CONFIG.MAX_HIERARCHY_DEPTH);
      parent.children.push(tabNode);
    } else {
      // Root level tab
      rootTabs.push(tabNode);
    }
  });

  // Sort root tabs by index
  rootTabs.sort((a, b) => {
    const tabA = tabs.find(t => t.id === a.id);
    const tabB = tabs.find(t => t.id === b.id);
    return (tabA?.index || 0) - (tabB?.index || 0);
  });

  return {
    rootTabs,
    tabMap,
    activeTabId,
    windowId: tabs[0]?.windowId || -1
  };
}

/**
 * Finds all descendant tab IDs for a given tab
 */
export function getDescendantIds(tabId: number, tabMap: Map<number, TabNode>): number[] {
  const descendants: number[] = [];
  const tab = tabMap.get(tabId);
  const visited = new Set<number>();
  
  if (!tab) return descendants;

  function collectDescendants(node: TabNode) {
    // Prevent infinite loops by checking if we've already visited this node
    if (visited.has(node.id)) {
      return;
    }
    visited.add(node.id);

    node.children.forEach(child => {
      descendants.push(child.id);
      collectDescendants(child);
    });
  }

  collectDescendants(tab);
  return descendants;
}

/**
 * Adds a new tab to the hierarchy
 */
export function addTabToHierarchy(
  hierarchy: HierarchyState, 
  tab: chrome.tabs.Tab
): HierarchyState {
  if (!tab.id) return hierarchy;

  const tabNode = createTabNode(tab);
  const newTabMap = new Map(hierarchy.tabMap);
  newTabMap.set(tab.id, tabNode);

  let newRootTabs = [...hierarchy.rootTabs];

  // Determine parent relationship
  if (tab.openerTabId && newTabMap.has(tab.openerTabId)) {
    const parent = newTabMap.get(tab.openerTabId)!;
    tabNode.parentId = tab.openerTabId;
    tabNode.level = Math.min(parent.level + 1, CONFIG.MAX_HIERARCHY_DEPTH);
    parent.children.push(tabNode);
  } else {
    // Add as root tab
    newRootTabs.push(tabNode);
  }

  return {
    ...hierarchy,
    rootTabs: newRootTabs,
    tabMap: newTabMap,
    activeTabId: tab.active ? tab.id : hierarchy.activeTabId
  };
}

/**
 * Removes a tab from the hierarchy
 */
export function removeTabFromHierarchy(
  hierarchy: HierarchyState, 
  tabId: number
): HierarchyState {
  const tab = hierarchy.tabMap.get(tabId);
  if (!tab) return hierarchy;

  const newTabMap = new Map(hierarchy.tabMap);
  
  // Remove the tab and all its descendants
  const toRemove = [tabId, ...getDescendantIds(tabId, hierarchy.tabMap)];
  toRemove.forEach(id => newTabMap.delete(id));

  // Update parent's children array
  if (tab.parentId) {
    const parent = newTabMap.get(tab.parentId);
    if (parent) {
      parent.children = parent.children.filter(child => child.id !== tabId);
    }
  }

  // Update root tabs
  const newRootTabs = hierarchy.rootTabs.filter(rootTab => rootTab.id !== tabId);

  return {
    ...hierarchy,
    rootTabs: newRootTabs,
    tabMap: newTabMap,
    activeTabId: hierarchy.activeTabId === tabId ? null : hierarchy.activeTabId
  };
}

/**
 * Updates a tab in the hierarchy
 */
export function updateTabInHierarchy(
  hierarchy: HierarchyState,
  tabId: number,
  changes: Partial<TabNode>
): HierarchyState {
  const tab = hierarchy.tabMap.get(tabId);
  if (!tab) return hierarchy;

  const newTabMap = new Map(hierarchy.tabMap);
  const updatedTab = { ...tab, ...changes };
  newTabMap.set(tabId, updatedTab);

  return {
    ...hierarchy,
    tabMap: newTabMap,
    activeTabId: changes.isActive ? tabId : hierarchy.activeTabId
  };
}

/**
 * Truncates text to specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number = CONFIG.MAX_TITLE_LENGTH): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Checks if a URL is restricted (chrome://, extension pages, etc.)
 */
export function isRestrictedUrl(url: string): boolean {
  const restrictedProtocols = ['chrome:', 'chrome-extension:', 'chrome-devtools:', 'edge:', 'about:'];
  return restrictedProtocols.some(protocol => url.startsWith(protocol));
}

/**
 * Generates a unique ID for Cabinets
 */
export function generateCabinetId(): string {
  return `cabinet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validates Cabinet data structure
 */
export function validateCabinetData(data: any): data is Cabinet {
  return (
    data &&
    typeof data.id === 'string' &&
    typeof data.name === 'string' &&
    data.createdAt instanceof Date &&
    data.updatedAt instanceof Date &&
    Array.isArray(data.tabs) &&
    data.metadata &&
    typeof data.metadata.tabCount === 'number' &&
    typeof data.metadata.windowId === 'number'
  );
}

/**
 * Debounce function for limiting rapid function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Deep clones a TabNode structure
 */
export function cloneTabNode(node: TabNode): TabNode {
  return {
    ...node,
    children: node.children.map(child => cloneTabNode(child))
  };
}

/**
 * Gets all descendant tab IDs in deletion order (deepest first)
 */
export function getDescendantIdsInDeletionOrder(
  tabId: number, 
  tabMap: Map<number, TabNode>
): number[] {
  const descendants: { id: number; level: number }[] = [];
  const tab = tabMap.get(tabId);
  const visited = new Set<number>();
  
  if (!tab) return [];

  function collectDescendants(node: TabNode) {
    // Prevent infinite loops by checking if we've already visited this node
    if (visited.has(node.id)) {
      return;
    }
    visited.add(node.id);

    node.children.forEach(child => {
      descendants.push({ id: child.id, level: child.level });
      collectDescendants(child);
    });
  }

  collectDescendants(tab);
  
  // Sort by level (deepest first) for proper deletion order
  descendants.sort((a, b) => b.level - a.level);
  
  return descendants.map(d => d.id);
}

/**
 * Checks if deleting a tab would create orphaned tabs
 */
export function findOrphanedTabs(
  tabId: number, 
  hierarchy: HierarchyState
): number[] {
  const tab = hierarchy.tabMap.get(tabId);
  if (!tab) return [];

  // If this tab has children, they would become orphaned
  return tab.children.map(child => child.id);
}

/**
 * Validates that a cascading delete operation is safe
 */
export function validateCascadingDeleteSafety(
  tabId: number,
  hierarchy: HierarchyState,
  maxDeletions: number = 50
): { isSafe: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check if tab exists
  const tab = hierarchy.tabMap.get(tabId);
  if (!tab) {
    issues.push('Tab not found in hierarchy');
    return { isSafe: false, issues };
  }

  // Check for excessive deletions
  const descendantIds = getDescendantIds(tabId, hierarchy.tabMap);
  const totalDeletions = descendantIds.length + 1; // +1 for the tab itself
  
  if (totalDeletions > maxDeletions) {
    issues.push(`Would delete ${totalDeletions} tabs, exceeding safety limit of ${maxDeletions}`);
  }

  // Check for circular references that could cause infinite loops
  const visited = new Set<number>();
  const recursionStack = new Set<number>();
  
  function hasCircularReference(nodeId: number): boolean {
    if (recursionStack.has(nodeId)) {
      return true; // Circular reference detected
    }
    
    if (visited.has(nodeId)) {
      return false; // Already processed this branch
    }
    
    visited.add(nodeId);
    recursionStack.add(nodeId);
    
    const node = hierarchy.tabMap.get(nodeId);
    if (node) {
      for (const child of node.children) {
        if (hasCircularReference(child.id)) {
          return true;
        }
      }
    }
    
    recursionStack.delete(nodeId);
    return false;
  }
  
  if (hasCircularReference(tabId)) {
    issues.push('Circular reference detected in hierarchy - deletion would cause infinite loop');
  }

  return {
    isSafe: issues.length === 0,
    issues
  };
}