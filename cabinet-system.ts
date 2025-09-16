/**
 * Cabinet System - Core functionality for saving and managing tab hierarchies
 */

import { Cabinet, TabNode, HierarchyState, CabinetMetadata } from './types';
import { STORAGE_KEYS, CONFIG, ERROR_MESSAGES } from './constants';
import { generateCabinetId, validateCabinetData, cloneTabNode } from './utils';

export interface CabinetOperationResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface CabinetRestorationResult {
  success: boolean;
  restoredTabs: number[];
  failedUrls: string[];
  errors: string[];
  summary: {
    totalTabs: number;
    successfulTabs: number;
    failedTabs: number;
  };
}

export interface CabinetValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class CabinetSystem {
  private static instance: CabinetSystem;

  private constructor() {}

  /**
   * Gets singleton instance of CabinetSystem
   */
  public static getInstance(): CabinetSystem {
    if (!CabinetSystem.instance) {
      CabinetSystem.instance = new CabinetSystem();
    }
    return CabinetSystem.instance;
  }

  /**
   * Saves current hierarchy as a Cabinet
   */
  public async saveCabinet(
    name: string, 
    hierarchy: HierarchyState,
    windowTitle?: string
  ): Promise<CabinetOperationResult> {
    try {
      // Validate input
      if (!name || name.trim().length === 0) {
        return {
          success: false,
          error: 'Cabinet name cannot be empty'
        };
      }

      if (name.length > 100) {
        return {
          success: false,
          error: 'Cabinet name cannot exceed 100 characters'
        };
      }

      if (hierarchy.tabMap.size === 0) {
        return {
          success: false,
          error: 'Cannot save empty hierarchy'
        };
      }

      // Check if name already exists
      const existingCabinets = await this.listCabinets();
      if (existingCabinets.success && existingCabinets.data) {
        const nameExists = existingCabinets.data.some(
          (cabinet: Cabinet) => cabinet.name.toLowerCase() === name.toLowerCase()
        );
        if (nameExists) {
          return {
            success: false,
            error: 'A Cabinet with this name already exists'
          };
        }
      }

      // Create Cabinet object
      const cabinet: Cabinet = {
        id: generateCabinetId(),
        name: name.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
        tabs: this.cloneHierarchyTabs(hierarchy),
        metadata: {
          tabCount: hierarchy.tabMap.size,
          windowId: hierarchy.windowId,
          originalWindowTitle: windowTitle
        }
      };

      // Save to storage
      const saveResult = await this.saveCabinetToStorage(cabinet);
      if (!saveResult.success) {
        return saveResult;
      }

      return {
        success: true,
        data: cabinet
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to save Cabinet: ${error}`
      };
    }
  }

  /**
   * Loads a Cabinet by ID
   */
  public async loadCabinet(cabinetId: string): Promise<CabinetOperationResult> {
    try {
      const cabinets = await this.getCabinetsFromStorage();
      const cabinet = cabinets.find(c => c.id === cabinetId);

      if (!cabinet) {
        return {
          success: false,
          error: ERROR_MESSAGES.CABINET_NOT_FOUND
        };
      }

      // Validate Cabinet data
      const validation = this.validateCabinet(cabinet);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid Cabinet data: ${validation.errors.join(', ')}`
        };
      }

      return {
        success: true,
        data: cabinet
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to load Cabinet: ${error}`
      };
    }
  }

  /**
   * Deletes a Cabinet by ID
   */
  public async deleteCabinet(cabinetId: string): Promise<CabinetOperationResult> {
    try {
      const cabinets = await this.getCabinetsFromStorage();
      const cabinetIndex = cabinets.findIndex(c => c.id === cabinetId);

      if (cabinetIndex === -1) {
        return {
          success: false,
          error: ERROR_MESSAGES.CABINET_NOT_FOUND
        };
      }

      // Remove Cabinet from array
      const deletedCabinet = cabinets.splice(cabinetIndex, 1)[0];

      // Save updated array back to storage
      await this.saveCabinetsToStorage(cabinets);

      return {
        success: true,
        data: deletedCabinet
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to delete Cabinet: ${error}`
      };
    }
  }

  /**
   * Renames a Cabinet
   */
  public async renameCabinet(cabinetId: string, newName: string): Promise<CabinetOperationResult> {
    try {
      // Validate new name
      if (!newName || newName.trim().length === 0) {
        return {
          success: false,
          error: 'Cabinet name cannot be empty'
        };
      }

      if (newName.length > 100) {
        return {
          success: false,
          error: 'Cabinet name cannot exceed 100 characters'
        };
      }

      const cabinets = await this.getCabinetsFromStorage();
      const cabinetIndex = cabinets.findIndex(c => c.id === cabinetId);

      if (cabinetIndex === -1) {
        return {
          success: false,
          error: ERROR_MESSAGES.CABINET_NOT_FOUND
        };
      }

      // Check if new name already exists (excluding current cabinet)
      const nameExists = cabinets.some(
        (cabinet, index) => 
          index !== cabinetIndex && 
          cabinet.name.toLowerCase() === newName.toLowerCase()
      );

      if (nameExists) {
        return {
          success: false,
          error: 'A Cabinet with this name already exists'
        };
      }

      // Update Cabinet
      const cabinet = cabinets[cabinetIndex];
      cabinet.name = newName.trim();
      cabinet.updatedAt = new Date();

      // Save updated array back to storage
      await this.saveCabinetsToStorage(cabinets);

      return {
        success: true,
        data: cabinet
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to rename Cabinet: ${error}`
      };
    }
  }

  /**
   * Lists all saved Cabinets
   */
  public async listCabinets(): Promise<CabinetOperationResult> {
    try {
      const cabinets = await this.getCabinetsFromStorage();
      
      // Sort by creation date (newest first)
      cabinets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return {
        success: true,
        data: cabinets
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to list Cabinets: ${error}`
      };
    }
  }

  /**
   * Gets Cabinet metadata without full tab data
   */
  public async getCabinetMetadata(): Promise<CabinetOperationResult> {
    try {
      const cabinets = await this.getCabinetsFromStorage();
      
      const metadata = cabinets.map(cabinet => ({
        id: cabinet.id,
        name: cabinet.name,
        createdAt: cabinet.createdAt,
        updatedAt: cabinet.updatedAt,
        metadata: cabinet.metadata
      }));

      // Sort by creation date (newest first)
      metadata.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return {
        success: true,
        data: metadata
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to get Cabinet metadata: ${error}`
      };
    }
  }

  /**
   * Validates a Cabinet's data structure and content
   */
  public validateCabinet(cabinet: Cabinet): CabinetValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic structure validation
    if (!validateCabinetData(cabinet)) {
      errors.push('Invalid Cabinet data structure');
      return { isValid: false, errors, warnings };
    }

    // Name validation
    if (!cabinet.name || cabinet.name.trim().length === 0) {
      errors.push('Cabinet name is required');
    }

    if (cabinet.name.length > 100) {
      errors.push('Cabinet name exceeds maximum length');
    }

    // Date validation
    if (!(cabinet.createdAt instanceof Date) || isNaN(cabinet.createdAt.getTime())) {
      errors.push('Invalid creation date');
    }

    if (!(cabinet.updatedAt instanceof Date) || isNaN(cabinet.updatedAt.getTime())) {
      errors.push('Invalid update date');
    }

    // Tabs validation
    if (!Array.isArray(cabinet.tabs)) {
      errors.push('Tabs must be an array');
    } else {
      if (cabinet.tabs.length === 0) {
        warnings.push('Cabinet contains no tabs');
      }

      if (cabinet.tabs.length !== cabinet.metadata.tabCount) {
        warnings.push('Tab count mismatch in metadata');
      }

      // Validate individual tabs
      cabinet.tabs.forEach((tab, index) => {
        if (!this.validateTabNode(tab)) {
          errors.push(`Invalid tab data at index ${index}`);
        }
      });
    }

    // Metadata validation
    if (!cabinet.metadata) {
      errors.push('Cabinet metadata is required');
    } else {
      if (typeof cabinet.metadata.tabCount !== 'number' || cabinet.metadata.tabCount < 0) {
        errors.push('Invalid tab count in metadata');
      }

      if (typeof cabinet.metadata.windowId !== 'number') {
        errors.push('Invalid window ID in metadata');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates a TabNode structure
   */
  private validateTabNode(tab: any): tab is TabNode {
    return (
      tab &&
      typeof tab.id === 'number' &&
      typeof tab.title === 'string' &&
      typeof tab.url === 'string' &&
      typeof tab.favicon === 'string' &&
      (tab.parentId === null || typeof tab.parentId === 'number') &&
      Array.isArray(tab.children) &&
      typeof tab.level === 'number' &&
      typeof tab.isActive === 'boolean' &&
      typeof tab.isPinned === 'boolean' &&
      typeof tab.isLoading === 'boolean'
    );
  }

  /**
   * Creates a deep copy of hierarchy tabs for storage
   */
  private cloneHierarchyTabs(hierarchy: HierarchyState): TabNode[] {
    return hierarchy.rootTabs.map(tab => cloneTabNode(tab));
  }

  /**
   * Saves a Cabinet to Chrome storage
   */
  private async saveCabinetToStorage(cabinet: Cabinet): Promise<CabinetOperationResult> {
    try {
      const cabinets = await this.getCabinetsFromStorage();
      
      // Check storage limits
      if (cabinets.length >= CONFIG.MAX_CABINETS) {
        return {
          success: false,
          error: `Maximum number of Cabinets (${CONFIG.MAX_CABINETS}) reached. Please delete some Cabinets first.`
        };
      }

      // Add new Cabinet
      cabinets.push(cabinet);

      // Save to storage
      await this.saveCabinetsToStorage(cabinets);

      return { success: true };

    } catch (error) {
      if (error instanceof Error && error.message.includes('QUOTA_BYTES')) {
        return {
          success: false,
          error: ERROR_MESSAGES.STORAGE_QUOTA_EXCEEDED
        };
      }
      
      return {
        success: false,
        error: `Storage operation failed: ${error}`
      };
    }
  }

  /**
   * Retrieves all Cabinets from Chrome storage
   */
  private async getCabinetsFromStorage(): Promise<Cabinet[]> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.CABINETS);
      const cabinets = result[STORAGE_KEYS.CABINETS] || [];

      // Convert date strings back to Date objects
      return cabinets.map((cabinet: any) => ({
        ...cabinet,
        createdAt: new Date(cabinet.createdAt),
        updatedAt: new Date(cabinet.updatedAt)
      }));

    } catch (error) {
      console.error('Failed to retrieve Cabinets from storage:', error);
      return [];
    }
  }

  /**
   * Saves Cabinets array to Chrome storage
   */
  private async saveCabinetsToStorage(cabinets: Cabinet[]): Promise<void> {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.CABINETS]: cabinets
      });
    } catch (error) {
      throw new Error(`Failed to save Cabinets to storage: ${error}`);
    }
  }

  /**
   * Gets storage usage information
   */
  public async getStorageInfo(): Promise<{
    used: number;
    available: number;
    cabinetCount: number;
    isNearLimit: boolean;
  }> {
    try {
      const usage = await chrome.storage.local.getBytesInUse();
      const cabinets = await this.getCabinetsFromStorage();
      
      return {
        used: usage,
        available: chrome.storage.local.QUOTA_BYTES - usage,
        cabinetCount: cabinets.length,
        isNearLimit: usage > CONFIG.STORAGE_WARNING_THRESHOLD
      };

    } catch (error) {
      console.error('Failed to get storage info:', error);
      return {
        used: 0,
        available: 0,
        cabinetCount: 0,
        isNearLimit: false
      };
    }
  }

  /**
   * Restores a Cabinet by opening all its tabs in the current window
   */
  public async restoreCabinet(
    cabinetId: string,
    closeExistingTabs: boolean = true
  ): Promise<CabinetRestorationResult> {
    const result: CabinetRestorationResult = {
      success: false,
      restoredTabs: [],
      failedUrls: [],
      errors: [],
      summary: {
        totalTabs: 0,
        successfulTabs: 0,
        failedTabs: 0
      }
    };

    try {
      // Load Cabinet
      const cabinetResult = await this.loadCabinet(cabinetId);
      if (!cabinetResult.success || !cabinetResult.data) {
        result.errors.push(cabinetResult.error || 'Failed to load Cabinet');
        return result;
      }

      const cabinet: Cabinet = cabinetResult.data;
      result.summary.totalTabs = cabinet.tabs.length;

      if (cabinet.tabs.length === 0) {
        result.errors.push('Cabinet contains no tabs to restore');
        return result;
      }

      // Get current window
      const currentWindow = await this.getCurrentWindow();
      if (!currentWindow) {
        result.errors.push('Could not access current window');
        return result;
      }

      // Close existing tabs if requested
      if (closeExistingTabs) {
        const closeResult = await this.closeExistingTabs(currentWindow.id!);
        if (!closeResult.success) {
          result.errors.push(`Warning: ${closeResult.error}`);
        }
      }

      // Restore tabs in hierarchy order
      const restorationResult = await this.restoreTabsFromCabinet(cabinet, currentWindow.id!);
      
      result.restoredTabs = restorationResult.restoredTabs;
      result.failedUrls = restorationResult.failedUrls;
      result.errors.push(...restorationResult.errors);
      result.summary.successfulTabs = restorationResult.restoredTabs.length;
      result.summary.failedTabs = restorationResult.failedUrls.length;
      result.success = result.summary.successfulTabs > 0;

      return result;

    } catch (error) {
      result.errors.push(`Cabinet restoration failed: ${error}`);
      return result;
    }
  }

  /**
   * Restores tabs from Cabinet data, maintaining hierarchy
   */
  private async restoreTabsFromCabinet(
    cabinet: Cabinet, 
    windowId: number
  ): Promise<{
    restoredTabs: number[];
    failedUrls: string[];
    errors: string[];
  }> {
    const restoredTabs: number[] = [];
    const failedUrls: string[] = [];
    const errors: string[] = [];
    const tabIdMap = new Map<number, number>(); // old ID -> new ID

    // Helper function to restore tabs recursively
    const restoreTabsRecursively = async (tabs: TabNode[], parentId?: number) => {
      for (const tab of tabs) {
        try {
          // Skip restricted URLs
          if (this.isRestrictedUrl(tab.url)) {
            failedUrls.push(tab.url);
            errors.push(`Skipped restricted URL: ${tab.url}`);
            continue;
          }

          // Create tab
          const createProperties: chrome.tabs.CreateProperties = {
            url: tab.url,
            windowId: windowId,
            active: false, // Don't activate tabs during restoration
            pinned: tab.isPinned
          };

          // Set opener if parent exists
          if (parentId && tabIdMap.has(parentId)) {
            createProperties.openerTabId = tabIdMap.get(parentId);
          }

          const newTab = await chrome.tabs.create(createProperties);
          
          if (newTab.id) {
            restoredTabs.push(newTab.id);
            tabIdMap.set(tab.id, newTab.id);

            // Restore children
            if (tab.children.length > 0) {
              await restoreTabsRecursively(tab.children, tab.id);
            }
          }

        } catch (error) {
          failedUrls.push(tab.url);
          errors.push(`Failed to restore tab "${tab.title}": ${error}`);
        }
      }
    };

    // Start restoration from root tabs
    await restoreTabsRecursively(cabinet.tabs);

    return {
      restoredTabs,
      failedUrls,
      errors
    };
  }

  /**
   * Closes existing tabs in the current window (except pinned tabs)
   */
  private async closeExistingTabs(windowId: number): Promise<CabinetOperationResult> {
    try {
      const tabs = await chrome.tabs.query({ windowId });
      const tabsToClose = tabs.filter(tab => !tab.pinned && tab.id);

      if (tabsToClose.length === 0) {
        return { success: true };
      }

      // Keep at least one tab open to prevent window closure
      if (tabsToClose.length === tabs.length) {
        // Create a new tab first
        await chrome.tabs.create({ 
          url: 'chrome://newtab/', 
          windowId,
          active: true 
        });
      }

      // Close tabs
      const tabIds = tabsToClose.map(tab => tab.id!);
      await chrome.tabs.remove(tabIds);

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: `Failed to close existing tabs: ${error}`
      };
    }
  }

  /**
   * Gets the current active window
   */
  private async getCurrentWindow(): Promise<chrome.windows.Window | null> {
    try {
      const window = await chrome.windows.getCurrent();
      return window;
    } catch (error) {
      console.error('Failed to get current window:', error);
      return null;
    }
  }

  /**
   * Checks if a URL is restricted and cannot be restored
   */
  private isRestrictedUrl(url: string): boolean {
    const restrictedProtocols = [
      'chrome://',
      'chrome-extension://',
      'chrome-devtools://',
      'edge://',
      'about:',
      'moz-extension://',
      'safari-extension://'
    ];
    
    return restrictedProtocols.some(protocol => url.startsWith(protocol));
  }

  /**
   * Validates that a Cabinet can be safely restored
   */
  public async validateCabinetRestoration(cabinetId: string): Promise<{
    canRestore: boolean;
    warnings: string[];
    restrictedUrls: string[];
    totalTabs: number;
    restorableTabs: number;
  }> {
    const result = {
      canRestore: false,
      warnings: [] as string[],
      restrictedUrls: [] as string[],
      totalTabs: 0,
      restorableTabs: 0
    };

    try {
      const cabinetResult = await this.loadCabinet(cabinetId);
      if (!cabinetResult.success || !cabinetResult.data) {
        result.warnings.push('Cabinet not found or invalid');
        return result;
      }

      const cabinet: Cabinet = cabinetResult.data;
      result.totalTabs = cabinet.tabs.length;

      if (cabinet.tabs.length === 0) {
        result.warnings.push('Cabinet contains no tabs');
        return result;
      }

      // Check each tab
      const checkTabsRecursively = (tabs: TabNode[]) => {
        tabs.forEach(tab => {
          if (this.isRestrictedUrl(tab.url)) {
            result.restrictedUrls.push(tab.url);
          } else {
            result.restorableTabs++;
          }
          
          if (tab.children.length > 0) {
            checkTabsRecursively(tab.children);
          }
        });
      };

      checkTabsRecursively(cabinet.tabs);

      // Add warnings
      if (result.restrictedUrls.length > 0) {
        result.warnings.push(`${result.restrictedUrls.length} tabs cannot be restored due to browser restrictions`);
      }

      if (result.restorableTabs === 0) {
        result.warnings.push('No tabs can be restored from this Cabinet');
      } else {
        result.canRestore = true;
      }

      // Check current window tabs
      try {
        const currentWindow = await this.getCurrentWindow();
        if (currentWindow?.id) {
          const currentTabs = await chrome.tabs.query({ windowId: currentWindow.id });
          const nonPinnedTabs = currentTabs.filter(tab => !tab.pinned);
          
          if (nonPinnedTabs.length > 0) {
            result.warnings.push(`${nonPinnedTabs.length} existing tabs will be closed`);
          }
        }
      } catch (error) {
        result.warnings.push('Could not check current window tabs');
      }

    } catch (error) {
      result.warnings.push(`Validation failed: ${error}`);
    }

    return result;
  }

  /**
   * Gets a preview of Cabinet contents without full restoration
   */
  public async getCabinetPreview(cabinetId: string): Promise<CabinetOperationResult> {
    try {
      const cabinetResult = await this.loadCabinet(cabinetId);
      if (!cabinetResult.success || !cabinetResult.data) {
        return cabinetResult;
      }

      const cabinet: Cabinet = cabinetResult.data;
      
      // Create a simplified preview structure
      const preview = {
        id: cabinet.id,
        name: cabinet.name,
        createdAt: cabinet.createdAt,
        updatedAt: cabinet.updatedAt,
        metadata: cabinet.metadata,
        tabSummary: this.createTabSummary(cabinet.tabs),
        validation: this.validateCabinet(cabinet)
      };

      return {
        success: true,
        data: preview
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to create Cabinet preview: ${error}`
      };
    }
  }

  /**
   * Creates a summary of tabs for preview purposes
   */
  private createTabSummary(tabs: TabNode[]): {
    totalTabs: number;
    rootTabs: number;
    maxDepth: number;
    restrictedTabs: number;
    pinnedTabs: number;
    domains: string[];
  } {
    let totalTabs = 0;
    let maxDepth = 0;
    let restrictedTabs = 0;
    let pinnedTabs = 0;
    const domains = new Set<string>();

    const analyzeTabs = (tabList: TabNode[], depth: number = 0) => {
      tabList.forEach(tab => {
        totalTabs++;
        maxDepth = Math.max(maxDepth, depth);
        
        if (this.isRestrictedUrl(tab.url)) {
          restrictedTabs++;
        }
        
        if (tab.isPinned) {
          pinnedTabs++;
        }

        // Extract domain
        try {
          const url = new URL(tab.url);
          domains.add(url.hostname);
        } catch (error) {
          // Invalid URL, skip domain extraction
        }

        if (tab.children.length > 0) {
          analyzeTabs(tab.children, depth + 1);
        }
      });
    };

    analyzeTabs(tabs);

    return {
      totalTabs,
      rootTabs: tabs.length,
      maxDepth,
      restrictedTabs,
      pinnedTabs,
      domains: Array.from(domains).slice(0, 10) // Limit to first 10 domains
    };
  }

  /**
   * Clears all Cabinets from storage (with confirmation)
   */
  public async clearAllCabinets(): Promise<CabinetOperationResult> {
    try {
      await chrome.storage.local.remove(STORAGE_KEYS.CABINETS);
      
      return {
        success: true,
        data: { message: 'All Cabinets cleared successfully' }
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to clear Cabinets: ${error}`
      };
    }
  }
}