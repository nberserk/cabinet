/**
 * Tab Hierarchy Engine - Core logic for building and managing tab hierarchies
 */

import { TabNode, HierarchyState } from './types';
import { CONFIG } from './constants';
import {
    buildHierarchy,
    addTabToHierarchy,
    removeTabFromHierarchy,
    updateTabInHierarchy,
    getDescendantIds,
    debounce
} from './utils';

export class TabHierarchyEngine {
    private hierarchyState: HierarchyState;
    private updateCallbacks: Set<(state: HierarchyState) => void> = new Set();
    private debouncedUpdate: (state: HierarchyState) => void;

    constructor() {
        this.hierarchyState = {
            rootTabs: [],
            tabMap: new Map(),
            activeTabId: null,
            windowId: -1
        };

        // Debounce updates to prevent excessive re-renders
        this.debouncedUpdate = debounce((state: HierarchyState) => {
            this.notifyCallbacks(state);
        }, CONFIG.UPDATE_DEBOUNCE_DELAY);
    }

    /**
     * Builds hierarchy from Chrome tabs array
     */
    public buildHierarchyFromTabs(tabs: chrome.tabs.Tab[]): HierarchyState {
        this.hierarchyState = buildHierarchy(tabs);
        this.debouncedUpdate(this.hierarchyState);
        return this.hierarchyState;
    }

    /**
     * Gets current hierarchy state
     */
    public getHierarchyState(): HierarchyState {
        return this.hierarchyState;
    }

    /**
     * Adds a new tab to the hierarchy
     */
    public addTab(tab: chrome.tabs.Tab, parentId?: number): void {
        if (!tab.id) return;

        // If parentId is explicitly provided, override the tab's openerTabId
        if (parentId !== undefined) {
            tab.openerTabId = parentId;
        }

        this.hierarchyState = addTabToHierarchy(this.hierarchyState, tab);
        this.debouncedUpdate(this.hierarchyState);
    }

    /**
     * Removes a tab from the hierarchy
     */
    public removeTab(tabId: number): void {
        this.hierarchyState = removeTabFromHierarchy(this.hierarchyState, tabId);
        this.debouncedUpdate(this.hierarchyState);
    }

    /**
     * Performs cascading delete of a tab and all its descendants
     * Returns the IDs of all tabs that should be closed
     */
    public getCascadingDeleteIds(tabId: number): number[] {
        const tab = this.hierarchyState.tabMap.get(tabId);
        if (!tab) return [];

        const toDelete: number[] = [tabId];
        const descendants = this.getDescendants(tabId);
        toDelete.push(...descendants);

        return toDelete;
    }

    /**
     * Performs cascading delete through Chrome API
     * Closes children before parent to maintain proper order
     */
    public async cascadingDelete(tabId: number): Promise<{
        success: boolean;
        deletedTabs: number[];
        errors: string[]
    }> {
        const result = {
            success: true,
            deletedTabs: [] as number[],
            errors: [] as string[]
        };

        try {
            const tabsToDelete = this.getCascadingDeleteIds(tabId);

            if (tabsToDelete.length === 0) {
                return result;
            }

            // Prevent infinite loops by checking for circular references
            const validation = this.validateHierarchy();
            if (!validation.isValid) {
                result.success = false;
                result.errors.push('Cannot perform cascading delete: hierarchy has circular references');
                return result;
            }

            // Sort tabs by level (deepest first) to close children before parents
            const tabsWithLevels = tabsToDelete
                .map(id => ({ id, level: this.getTab(id)?.level || 0 }))
                .sort((a, b) => b.level - a.level);

            // Close tabs in reverse hierarchy order (children first)
            for (const { id } of tabsWithLevels) {
                try {
                    // Check if tab still exists before trying to close it
                    const tab = await this.getTabFromChrome(id);
                    if (tab) {
                        await chrome.tabs.remove(id);
                        result.deletedTabs.push(id);

                        // Remove from our hierarchy state
                        this.removeTab(id);
                    }
                } catch (error) {
                    result.success = false;
                    result.errors.push(`Failed to close tab ${id}: ${error}`);
                }
            }

        } catch (error) {
            result.success = false;
            result.errors.push(`Cascading delete failed: ${error}`);
        }

        return result;
    }

    /**
     * Helper method to get tab from Chrome API
     */
    private async getTabFromChrome(tabId: number): Promise<chrome.tabs.Tab | null> {
        try {
            // Use chrome.tabs.get if available, otherwise return null
            if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.get) {
                const tab = await chrome.tabs.get(tabId);
                return tab;
            }
            return null;
        } catch (error) {
            // Tab doesn't exist or can't be accessed
            return null;
        }
    }

    /**
     * Checks if cascading delete would create any issues
     */
    public validateCascadingDelete(tabId: number): {
        canDelete: boolean;
        warnings: string[];
        tabsToDelete: number[]
    } {
        const warnings: string[] = [];
        const tabsToDelete = this.getCascadingDeleteIds(tabId);

        if (tabsToDelete.length === 0) {
            return {
                canDelete: false,
                warnings: ['Tab not found in hierarchy'],
                tabsToDelete: []
            };
        }

        // Check for active tab deletion
        if (tabsToDelete.includes(this.hierarchyState.activeTabId || -1)) {
            warnings.push('This will close the currently active tab');
        }

        // Check for pinned tabs
        const pinnedTabs = tabsToDelete.filter(id => {
            const tab = this.getTab(id);
            return tab?.isPinned;
        });

        if (pinnedTabs.length > 0) {
            warnings.push(`This will close ${pinnedTabs.length} pinned tab(s)`);
        }

        // Check for large number of tabs
        if (tabsToDelete.length > 10) {
            warnings.push(`This will close ${tabsToDelete.length} tabs`);
        }

        // Check hierarchy integrity
        const validation = this.validateHierarchy();
        const canDelete = validation.isValid;

        if (!canDelete) {
            warnings.push('Cannot delete: hierarchy has integrity issues');
        }

        return {
            canDelete,
            warnings,
            tabsToDelete
        };
    }

    /**
     * Updates tab information in the hierarchy
     */
    public updateTab(tabId: number, changes: Partial<TabNode>): void {
        this.hierarchyState = updateTabInHierarchy(this.hierarchyState, tabId, changes);
        this.debouncedUpdate(this.hierarchyState);
    }

    /**
     * Gets all child tabs for a given parent tab ID
     */
    public getChildren(tabId: number): TabNode[] {
        const tab = this.hierarchyState.tabMap.get(tabId);
        return tab ? tab.children : [];
    }

    /**
     * Gets all descendant tab IDs (children, grandchildren, etc.)
     */
    public getDescendants(tabId: number): number[] {
        return getDescendantIds(tabId, this.hierarchyState.tabMap);
    }

    /**
     * Gets the parent tab for a given tab ID
     */
    public getParent(tabId: number): TabNode | null {
        const tab = this.hierarchyState.tabMap.get(tabId);
        if (!tab || !tab.parentId) return null;
        return this.hierarchyState.tabMap.get(tab.parentId) || null;
    }

    /**
     * Gets all root tabs (tabs without parents)
     */
    public getRootTabs(): TabNode[] {
        return this.hierarchyState.rootTabs;
    }

    /**
     * Gets a specific tab by ID
     */
    public getTab(tabId: number): TabNode | null {
        return this.hierarchyState.tabMap.get(tabId) || null;
    }

    /**
     * Gets all tabs in the hierarchy as a flat array
     */
    public getAllTabs(): TabNode[] {
        return Array.from(this.hierarchyState.tabMap.values());
    }

    /**
     * Sets the active tab
     */
    public setActiveTab(tabId: number): void {
        // Update previous active tab
        if (this.hierarchyState.activeTabId) {
            this.updateTab(this.hierarchyState.activeTabId, { isActive: false });
        }

        // Update new active tab
        this.updateTab(tabId, { isActive: true });
        this.hierarchyState.activeTabId = tabId;
    }

    /**
     * Gets the currently active tab
     */
    public getActiveTab(): TabNode | null {
        if (!this.hierarchyState.activeTabId) return null;
        return this.hierarchyState.tabMap.get(this.hierarchyState.activeTabId) || null;
    }

    /**
     * Moves a tab to a new parent
     */
    public moveTab(tabId: number, newParentId: number | null): void {
        const tab = this.hierarchyState.tabMap.get(tabId);
        if (!tab) return;

        // Remove from current parent
        if (tab.parentId) {
            const currentParent = this.hierarchyState.tabMap.get(tab.parentId);
            if (currentParent) {
                currentParent.children = currentParent.children.filter(child => child.id !== tabId);
            }
        } else {
            // Remove from root tabs
            this.hierarchyState.rootTabs = this.hierarchyState.rootTabs.filter(rootTab => rootTab.id !== tabId);
        }

        // Add to new parent
        if (newParentId) {
            const newParent = this.hierarchyState.tabMap.get(newParentId);
            if (newParent) {
                tab.parentId = newParentId;
                tab.level = Math.min(newParent.level + 1, CONFIG.MAX_HIERARCHY_DEPTH);
                newParent.children.push(tab);
            }
        } else {
            // Move to root level
            tab.parentId = null;
            tab.level = 0;
            this.hierarchyState.rootTabs.push(tab);
        }

        // Update levels for all descendants
        this.updateDescendantLevels(tab);
        this.debouncedUpdate(this.hierarchyState);
    }

    /**
     * Updates levels for all descendants of a tab
     */
    private updateDescendantLevels(tab: TabNode): void {
        const visited = new Set<number>();

        function updateLevels(node: TabNode) {
            // Prevent infinite loops
            if (visited.has(node.id)) {
                return;
            }
            visited.add(node.id);

            node.children.forEach(child => {
                child.level = Math.min(node.level + 1, CONFIG.MAX_HIERARCHY_DEPTH);
                updateLevels(child);
            });
        }

        updateLevels(tab);
    }

    /**
     * Checks if a tab has children
     */
    public hasChildren(tabId: number): boolean {
        const tab = this.hierarchyState.tabMap.get(tabId);
        return tab ? tab.children.length > 0 : false;
    }

    /**
     * Gets the depth of the hierarchy tree
     */
    public getMaxDepth(): number {
        let maxDepth = 0;

        function findMaxDepth(tabs: TabNode[]): void {
            tabs.forEach(tab => {
                maxDepth = Math.max(maxDepth, tab.level);
                findMaxDepth(tab.children);
            });
        }

        findMaxDepth(this.hierarchyState.rootTabs);
        return maxDepth;
    }

    /**
     * Gets the total number of tabs in the hierarchy
     */
    public getTabCount(): number {
        return this.hierarchyState.tabMap.size;
    }

    /**
     * Clears the entire hierarchy
     */
    public clear(): void {
        this.hierarchyState = {
            rootTabs: [],
            tabMap: new Map(),
            activeTabId: null,
            windowId: -1
        };
        this.debouncedUpdate(this.hierarchyState);
    }

    /**
     * Registers a callback to be notified of hierarchy changes
     */
    public onHierarchyChange(callback: (state: HierarchyState) => void): void {
        this.updateCallbacks.add(callback);
    }

    /**
     * Unregisters a hierarchy change callback
     */
    public offHierarchyChange(callback: (state: HierarchyState) => void): void {
        this.updateCallbacks.delete(callback);
    }

    /**
     * Notifies all registered callbacks of hierarchy changes
     */
    private notifyCallbacks(state: HierarchyState): void {
        this.updateCallbacks.forEach(callback => {
            try {
                callback(state);
            } catch (error) {
                console.error('Error in hierarchy change callback:', error);
            }
        });
    }

    /**
     * Validates the integrity of the hierarchy
     */
    public validateHierarchy(): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
        const visitedTabs = new Set<number>();
        const globalVisited = new Set<number>();

        // Check for circular references using DFS with proper cycle detection
        function checkCircularReference(tab: TabNode, ancestors: Set<number>): boolean {
            if (ancestors.has(tab.id)) {
                errors.push(`Circular reference detected for tab ${tab.id}`);
                return true; // Found a cycle
            }

            if (globalVisited.has(tab.id)) {
                return false; // Already processed this subtree, no cycles found
            }

            globalVisited.add(tab.id);
            visitedTabs.add(tab.id);

            const newAncestors = new Set(ancestors);
            newAncestors.add(tab.id);

            let foundCycle = false;
            for (const child of tab.children) {
                if (checkCircularReference(child, newAncestors)) {
                    foundCycle = true;
                }
            }

            return foundCycle;
        }

        // Check root tabs for circular references
        this.hierarchyState.rootTabs.forEach(tab => {
            checkCircularReference(tab, new Set());
        });

        // Check that all tabs in tabMap are reachable from root tabs
        const allTabIds = Array.from(this.hierarchyState.tabMap.keys());
        const unreachableTabs = allTabIds.filter(id => !visitedTabs.has(id));

        if (unreachableTabs.length > 0) {
            errors.push(`Unreachable tabs found: ${unreachableTabs.join(', ')}`);
        }

        // Check parent-child consistency
        this.hierarchyState.tabMap.forEach((tab, tabId) => {
            if (tab.parentId) {
                const parent = this.hierarchyState.tabMap.get(tab.parentId);
                if (!parent) {
                    errors.push(`Tab ${tabId} has invalid parent ${tab.parentId}`);
                } else if (!parent.children.some(child => child.id === tabId)) {
                    errors.push(`Parent ${tab.parentId} doesn't include child ${tabId} in children array`);
                }
            }
        });

        // Additional check: ensure no tab is its own ancestor
        this.hierarchyState.tabMap.forEach((tab, tabId) => {
            const ancestors = new Set<number>();
            let current = tab;

            while (current.parentId && !ancestors.has(current.id)) {
                ancestors.add(current.id);
                const parent = this.hierarchyState.tabMap.get(current.parentId);
                if (!parent) break;

                if (parent.id === tabId) {
                    errors.push(`Tab ${tabId} is its own ancestor`);
                    break;
                }
                current = parent;
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}