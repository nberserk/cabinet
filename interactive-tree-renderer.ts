/**
 * Interactive Tree Renderer - Combines UI rendering with interactive tab management
 * This is the main interface for rendering interactive tab hierarchies
 */

import { UIRenderer, TreeRenderOptions } from './ui-renderer';
import { TabManager, TabManagerOptions, TabAction } from './tab-manager';
import { TabConverter } from './tab-converter';
import { ErrorHandler, ErrorState } from './error-handler';
import { TabNode } from './types';

export interface InteractiveTreeOptions extends TreeRenderOptions, TabManagerOptions {
  onTabAction?: (action: TabAction) => void;
  onTabHighlight?: (tabId: number, highlight: boolean) => void;
  onError?: (error: Error) => void;
}

export class InteractiveTreeRenderer {
  private uiRenderer: UIRenderer;
  private tabManager: TabManager;
  private errorHandler: ErrorHandler;
  private container: HTMLElement;
  private options: InteractiveTreeOptions;
  private currentHierarchy: TabNode[] = [];

  constructor(container: HTMLElement, options: InteractiveTreeOptions = {}) {
    this.container = container;
    this.options = options;

    // Initialize UI renderer
    this.uiRenderer = new UIRenderer(container, {
      showCloseButtons: options.showCloseButtons,
      enableContextMenu: options.enableContextMenu,
      enableDragDrop: options.enableDragDrop,
      maxTitleLength: options.maxTitleLength
    });

    // Initialize tab manager
    this.tabManager = new TabManager({
      enableContextMenu: options.enableContextMenu,
      enableDragDrop: options.enableDragDrop,
      enableHoverEffects: options.enableHoverEffects,
      autoClosePopup: options.autoClosePopup
    });

    // Initialize error handler
    this.errorHandler = new ErrorHandler();

    this.setupEventListeners();
  }

  /**
   * Renders interactive tab hierarchy
   */
  renderInteractiveTree(hierarchy: TabNode[]): void {
    try {
      this.currentHierarchy = hierarchy;
      
      // Render the tree structure
      this.uiRenderer.renderTree(hierarchy);
      
      // Attach interactive behaviors to all rendered tabs
      this.attachInteractiveHandlers();
      
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Renders tree from Chrome tabs data
   */
  renderFromChromeTabs(
    chromeTabs: any[], 
    treeData: { [tabId: string]: { parentId?: number; children: number[] } }
  ): void {
    try {
      const hierarchy = TabConverter.buildHierarchy(chromeTabs, treeData);
      this.renderInteractiveTree(hierarchy);
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Updates a specific tab's state and re-attaches handlers if needed
   */
  updateTabState(tabId: number, updates: Partial<TabNode>): void {
    try {
      // Update in hierarchy
      const updated = TabConverter.updateTabInHierarchy(this.currentHierarchy, tabId, updates);
      
      if (updated) {
        // Update UI
        this.uiRenderer.updateTabState(tabId, updates);
        
        // Re-attach handlers if the tab element was recreated
        const tabElement = this.container.querySelector(`[data-tab-id="${tabId}"]`) as HTMLElement;
        if (tabElement) {
          const tab = TabConverter.findTabInHierarchy(this.currentHierarchy, tabId);
          if (tab) {
            this.attachTabHandlers(tabElement, tab);
          }
        }
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Removes a tab from the hierarchy and re-renders
   */
  removeTab(tabId: number): void {
    try {
      this.currentHierarchy = TabConverter.removeTabFromHierarchy(this.currentHierarchy, tabId);
      this.renderInteractiveTree(this.currentHierarchy);
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Adds a new tab to the hierarchy
   */
  addTab(tab: TabNode, parentId?: number): void {
    try {
      if (parentId) {
        const parent = TabConverter.findTabInHierarchy(this.currentHierarchy, parentId);
        if (parent) {
          tab.parentId = parentId;
          tab.level = parent.level + 1;
          parent.children.push(tab);
        } else {
          // Parent not found, add as root
          tab.level = 0;
          this.currentHierarchy.push(tab);
        }
      } else {
        // Add as root tab
        tab.level = 0;
        this.currentHierarchy.push(tab);
      }

      this.renderInteractiveTree(this.currentHierarchy);
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Highlights a tab (for hover effects)
   */
  highlightTab(tabId: number, highlight: boolean = true): void {
    this.uiRenderer.highlightTab(tabId, highlight);
    
    if (this.options.onTabHighlight) {
      this.options.onTabHighlight(tabId, highlight);
    }
  }

  /**
   * Shows loading state
   */
  showLoading(): void {
    this.uiRenderer.renderLoadingState();
  }

  /**
   * Shows error state
   */
  showError(message: string): void {
    this.uiRenderer.renderErrorState(message);
  }

  /**
   * Gets current hierarchy
   */
  getCurrentHierarchy(): TabNode[] {
    return [...this.currentHierarchy];
  }

  /**
   * Finds a tab in current hierarchy
   */
  findTab(tabId: number): TabNode | null {
    return TabConverter.findTabInHierarchy(this.currentHierarchy, tabId);
  }

  /**
   * Gets all child tab IDs for a parent
   */
  getChildTabIds(parentId: number): number[] {
    return TabConverter.getChildTabIds(this.currentHierarchy, parentId);
  }

  /**
   * Sets up global event listeners
   */
  private setupEventListeners(): void {
    // Listen for custom events from UI renderer
    this.container.addEventListener('tabClick', (e: any) => {
      this.handleTabAction({
        type: 'switch',
        tabId: e.detail.tabId
      });
    });

    this.container.addEventListener('tabClose', (e: any) => {
      this.handleTabAction({
        type: 'close',
        tabId: e.detail.tabId
      });
    });

    this.container.addEventListener('tabHover', (e: any) => {
      if (this.options.onTabHighlight) {
        this.options.onTabHighlight(e.detail.tabId, e.detail.isHovering);
      }
    });

    this.container.addEventListener('closeChildren', (e: any) => {
      this.handleTabAction({
        type: 'closeChildren',
        tabId: e.detail.tabId
      });
    });

    this.container.addEventListener('tabDuplicate', (e: any) => {
      this.handleTabAction({
        type: 'duplicate',
        tabId: e.detail.tabId
      });
    });

    this.container.addEventListener('tabReorder', (e: any) => {
      this.handleTabAction({
        type: 'reorder',
        tabId: e.detail.draggedTabId,
        targetTabId: e.detail.targetTabId
      });
    });

    // Listen for global highlight events
    document.addEventListener('highlightTab', (e: any) => {
      if (this.options.onTabHighlight) {
        this.options.onTabHighlight(e.detail.tabId, e.detail.highlight);
      }
    });
  }

  /**
   * Attaches interactive handlers to all rendered tab elements
   */
  private attachInteractiveHandlers(): void {
    const tabElements = this.container.querySelectorAll('.tree-node[data-tab-id]');
    
    tabElements.forEach(tabElement => {
      const tabId = parseInt((tabElement as HTMLElement).dataset.tabId || '0');
      const tab = TabConverter.findTabInHierarchy(this.currentHierarchy, tabId);
      
      if (tab) {
        this.attachTabHandlers(tabElement as HTMLElement, tab);
      }
    });
  }

  /**
   * Attaches handlers to a specific tab element
   */
  private attachTabHandlers(tabElement: HTMLElement, tab: TabNode): void {
    // Check if tab is restricted and apply appropriate styling
    const restrictedInfo = ErrorHandler.getRestrictedTabInfo(tab);
    if (restrictedInfo) {
      ErrorHandler.applyRestrictedStyling(tabElement, restrictedInfo);
    }

    // Attach interactive handlers
    this.tabManager.attachTabEventListeners(
      tabElement,
      tab,
      (action: TabAction) => this.handleTabAction(action)
    );
  }

  /**
   * Handles tab actions
   */
  private handleTabAction(action: TabAction): void {
    try {
      // Execute built-in actions
      switch (action.type) {
        case 'switch':
          this.switchToTab(action.tabId);
          break;
          
        case 'close':
          this.closeTab(action.tabId);
          break;
          
        case 'closeChildren':
          this.closeChildTabs(action.tabId);
          break;
          
        case 'duplicate':
          this.duplicateTab(action.tabId);
          break;
          
        case 'reorder':
          if (action.targetTabId) {
            this.reorderTab(action.tabId, action.targetTabId);
          }
          break;
          
        case 'pin':
          this.pinTab(action.tabId);
          break;
          
        case 'unpin':
          this.unpinTab(action.tabId);
          break;
      }

      // Notify external handler
      if (this.options.onTabAction) {
        this.options.onTabAction(action);
      }
      
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Built-in action handlers
   */
  private switchToTab(tabId: number): void {
    // Update active state in hierarchy
    this.currentHierarchy.forEach(tab => {
      const flatTabs = TabConverter.flattenHierarchy([tab]);
      flatTabs.forEach(t => {
        t.isActive = t.id === tabId;
      });
    });

    // Update UI
    this.container.querySelectorAll('.tree-node').forEach(el => {
      el.classList.remove('active');
    });
    
    const activeElement = this.container.querySelector(`[data-tab-id="${tabId}"]`);
    if (activeElement) {
      activeElement.classList.add('active');
    }
  }

  private closeTab(tabId: number): void {
    this.removeTab(tabId);
  }

  private closeChildTabs(tabId: number): void {
    const childIds = this.getChildTabIds(tabId);
    childIds.forEach(childId => {
      this.removeTab(childId);
    });
  }

  private duplicateTab(tabId: number): void {
    // This would typically be handled by the Chrome extension API
    // For now, just dispatch the action
  }

  private reorderTab(draggedTabId: number, targetTabId: number): void {
    // This would typically be handled by the Chrome extension API
    // For now, just dispatch the action
  }

  private pinTab(tabId: number): void {
    this.updateTabState(tabId, { isPinned: true });
  }

  private unpinTab(tabId: number): void {
    this.updateTabState(tabId, { isPinned: false });
  }

  /**
   * Error handling
   */
  private handleError(error: Error): void {
    console.error('InteractiveTreeRenderer error:', error);
    
    // Create user-friendly error message
    const friendlyMessage = this.errorHandler.getUserFriendlyMessage(error, 'rendering tabs');
    
    // Create error state
    const errorState = this.errorHandler.createErrorState(
      'unknown',
      friendlyMessage,
      undefined,
      () => this.renderInteractiveTree(this.currentHierarchy)
    );
    
    if (this.options.onError) {
      this.options.onError(error);
    } else {
      // Render error in UI
      this.errorHandler.renderError(errorState, this.container);
    }
  }

  /**
   * Handles Chrome API errors specifically
   */
  handleChromeAPIError(error: any, operation: string, tabId?: number): void {
    const errorState = this.errorHandler.handleChromeAPIError(error, operation);
    
    if (tabId) {
      this.errorHandler.handleTabAccessError(tabId, error);
    }
    
    this.errorHandler.renderError(errorState, this.container);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.tabManager.destroy();
  }
}